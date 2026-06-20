#!/usr/bin/env python3
"""Cut 5 transparent symbol PNGs from a horizontal 5-symbol sheet (v2).

v2 fixes vs v1:
  - Tighter parchment mask: pixels within chroma=18 of background -> alpha=0.
  - Pixels with chroma>=35 -> alpha=1 (fully opaque).
  - Pixels with luminance < 80 (dark ink) -> alpha=1 regardless of chroma.
  - Pixels with chroma 18-35 -> linear interpolation.
  - No square-cropping by default; use tight bbox + 8% padding (preserves
    the original aspect ratio so we never include the next symbol's disc).
  - Column boundaries are exact valleys (no ±30 padding that caused bleed).

The output is a non-square transparent RGBA PNG. Phaser / Babylon engines
will noticably prefer non-square assets because they handle true trim well.
"""
from __future__ import annotations
import math
import os
import sys
from PIL import Image


def sample_bg(img: Image.Image, x0: int, x1: int, y_strips: list[tuple[int, int]]) -> tuple[int, int, int]:
    px = img.load()
    w, h = img.size
    r, g, b, n = 0, 0, 0, 0
    for s, e in y_strips:
        s = max(0, s)
        e = min(h, e)
        for x in range(max(0, x0), min(w, x1)):
            for y in range(s, e):
                pr, pg, pb = px[x, y]
                r += pr
                g += pg
                b += pb
                n += 1
    if n == 0:
        return 0, 0, 0
    return r // n, g // n, b // n


def sample_bg_in_band(img: Image.Image, x0: int, x1: int, y0: int, y1: int) -> tuple[int, int, int]:
    """Sample background only from edges of the column (top + bottom strips within band).

    This gives a column-local background estimate, avoiding sheet-wide variation.
    """
    px = img.load()
    w, h = img.size
    strip = 20
    r, g, b, n = 0, 0, 0, 0
    # Top strip
    for y in range(max(0, y0), min(h, y0 + strip)):
        for x in range(max(0, x0), min(w, x1)):
            pr, pg, pb = px[x, y]
            r += pr
            g += pg
            b += pb
            n += 1
    # Bottom strip
    for y in range(max(0, y1 - strip), min(h, y1)):
        for x in range(max(0, x0), min(w, x1)):
            pr, pg, pb = px[x, y]
            r += pr
            g += pg
            b += pb
            n += 1
    if n == 0:
        return 0, 0, 0
    return r // n, g // n, b // n


def cut_sheet(
    sheet_path: str,
    valleys: list[int],
    out_dir: str,
    prefix: str,
    y0: int,
    y1: int,
    pad_pct: float = 0.06,
    min_pad: int = 8,
    alpha_low: float = 22.0,
    alpha_high: float = 50.0,
    ink_lum_threshold: int = 75,
    bbox_alpha_threshold: int = 64,
    auto_y_bounds: bool = True,
) -> list[str]:
    img = Image.open(sheet_path).convert("RGB")
    w, h = img.size
    px = img.load()

    # Cut boundaries: 0, valleys, w.
    cuts = [0] + sorted(valleys) + [w]
    symbols = []
    for i in range(len(cuts) - 1):
        c_left = cuts[i]
        c_right = cuts[i + 1]
        col_x0 = c_left
        col_x1 = c_right
        # Auto-detect per-column y bounds if requested: find the largest
        # contiguous row band of dark pixels within this column.
        # Search is restricted to a safe band (y0..y1) to avoid picking up
        # sheet-wide decorations like the pagoda at the bottom of the bg.
        if auto_y_bounds:
            search_y0 = max(0, y0) if y0 > 0 else 0
            search_y1 = min(h, y1) if y1 > 0 else h
            bg_lum = sum(px[5, 5]) / 3
            def _is_ink(rgb):
                lum = sum(rgb) / 3
                return (bg_lum - lum) > 25
            row_ink = [0] * h
            for y in range(search_y0, search_y1):
                for x in range(col_x0, col_x1):
                    if _is_ink(px[x, y]):
                        row_ink[y] += 1
            smooth = [0] * h
            for y in range(h):
                s = 0
                nn = 0
                for k in range(-3, 4):
                    yy = y + k
                    if 0 <= yy < h:
                        s += row_ink[yy]
                        nn += 1
                smooth[y] = s / nn
            best = (search_y0, search_y0)
            in_band = False
            start = 0
            for y in range(search_y0, search_y1):
                if smooth[y] > 5:
                    if not in_band:
                        start = y
                        in_band = True
                    if y - start + 1 > best[1] - best[0] + 1:
                        best = (start, y)
                else:
                    in_band = False
            col_y0, col_y1 = best
        else:
            col_y0, col_y1 = y0, y1
        symbols.append((col_x0, col_x1, col_y0, col_y1))

    os.makedirs(out_dir, exist_ok=True)
    written = []
    for i, (x0, x1, col_y0, col_y1) in enumerate(symbols):
        col_w = x1 - x0
        col_h = col_y1 - col_y0 + 1

        # Sample local background per column from a top + bottom strip within band.
        bg_r, bg_g, bg_b = sample_bg_in_band(img, x0, x1, col_y0, col_y1 + 1)

        # Compute alpha mask.
        alpha_full = bytearray(col_w * col_h)
        for sy in range(col_h):
            y = col_y0 + sy
            for sx in range(col_w):
                x = x0 + sx
                pr, pg, pb = px[x, y]
                dr = pr - bg_r
                dg = pg - bg_g
                db = pb - bg_b
                chroma = math.sqrt(dr * dr + dg * dg + db * db)
                lum = (pr + pg + pb) / 3
                if lum < ink_lum_threshold:
                    a = 1.0
                elif chroma >= alpha_high:
                    a = 1.0
                elif chroma <= alpha_low:
                    a = 0.0
                else:
                    a = (chroma - alpha_low) / (alpha_high - alpha_low)
                alpha_full[sy * col_w + sx] = int(a * 255)

        # Find bbox of alpha > bbox_alpha_threshold (avoids parchment noise halo).
        bbox_min_x = col_w
        bbox_max_x = -1
        bbox_min_y = col_h
        bbox_max_y = -1
        for sy in range(col_h):
            row_off = sy * col_w
            for sx in range(col_w):
                if alpha_full[row_off + sx] > bbox_alpha_threshold:
                    if sx < bbox_min_x:
                        bbox_min_x = sx
                    if sx > bbox_max_x:
                        bbox_max_x = sx
                    if sy < bbox_min_y:
                        bbox_min_y = sy
                    if sy > bbox_max_y:
                        bbox_max_y = sy
        if bbox_max_x < 0:
            print(f"WARN: no content for symbol {i} in column x={x0}..{x1}")
            continue

        # Padding around bbox (preserve aspect, no square forcing).
        bw = bbox_max_x - bbox_min_x + 1
        bh = bbox_max_y - bbox_min_y + 1
        pad = max(int(max(bw, bh) * pad_pct), min_pad)
        crop_x0 = max(0, bbox_min_x - pad)
        crop_y0 = max(0, bbox_min_y - pad)
        crop_x1 = min(col_w, bbox_max_x + 1 + pad)
        crop_y1 = min(col_h, bbox_max_y + 1 + pad)
        crop_w = crop_x1 - crop_x0
        crop_h = crop_y1 - crop_y0

        # Build RGBA output.
        out = Image.new("RGBA", (crop_w, crop_h), (0, 0, 0, 0))
        out_px = out.load()
        for sy in range(crop_h):
            ay = crop_y0 + sy
            for sx in range(crop_w):
                ax = crop_x0 + sx
                if ax < 0 or ax >= col_w or ay < 0 or ay >= col_h:
                    continue
                a = alpha_full[ay * col_w + ax]
                if a == 0:
                    continue
                src_x = x0 + ax
                src_y = col_y0 + ay
                pr, pg, pb = px[src_x, src_y]
                out_px[sx, sy] = (pr, pg, pb, a)

        out_name = f"{prefix}_{i + 1:02d}.png"
        out_path = os.path.join(out_dir, out_name)
        out.save(out_path)
        written.append(out_path)
        print(f"wrote {out_path}  ({crop_w}x{crop_h})")

    return written


if __name__ == "__main__":
    args = sys.argv[1:]
    sheet = args[0]
    out_dir = args[1]
    prefix = args[2]
    y0 = int(args[3])
    y1 = int(args[4])
    valleys = [int(v) for v in args[5:9]]
    cut_sheet(sheet, valleys, out_dir, prefix, y0, y1)
