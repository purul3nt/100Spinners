#!/usr/bin/env python3
"""Produce the reel-frame OVERLAY version: only gold + dark trim opaque.

For in-game use, the frame is dropped on top of the reels. The panel interiors
should be TRANSPARENT so the reels show through, while the gold border, the
gold medallions, and the heavy black trim/dividers remain opaque.

Strategy:
  1. Open frame as RGB.
  2. Detect the outer gold bbox and the 4 vertical dividers + top/bottom trim.
  3. For each pixel:
     - Inside the gold border's bbox (with small pad for medallions) -> opaque.
     - But: subtract "panel interior" regions (between dividers, away from
       horizontal trim).
     - Pixels OUTSIDE the gold border -> transparent.
  4. Crop to gold bbox + small margin.
  5. Save as RGBA PNG.

Result: a thin gold-and-black outline overlay suitable for in-game layering.
"""
from __future__ import annotations
import math
import os
import sys
from PIL import Image


def is_gold(rgb):
    r, g, b = rgb
    return r > 180 and g > 140 and b < 110 and (r - b) > 80


def is_dark(rgb):
    r, g, b = rgb
    return (r + g + b) / 3 < 80


def process(in_path: str, out_path: str, crop_margin: int = 4, pad: int = 6) -> None:
    img = Image.open(in_path).convert("RGB")
    w, h = img.size
    px = img.load()

    # Golden border bbox.
    gx0, gy0, gx1, gy1 = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if is_gold(px[x, y]):
                if x < gx0: gx0 = x
                if x > gx1: gx1 = x
                if y < gy0: gy0 = y
                if y > gy1: gy1 = y
    print(f"golden border bbox: x={gx0}..{gx1}  y={gy0}..{gy1}")

    # Detect vertical divider centers (heavy black columns) and horizontal trim.
    # Use the central vertical band (between top/bottom trim) to find dividers.
    # We know from analysis: 4 internal dividers at x=314, 575, 822, 1069.
    # Also top trim rows ~y=25..47, bottom trim rows ~y=687..704.

    # Find divider centers via per-column dark count in central band.
    cy_mid_lo = gy0 + (gy1 - gy0) // 4
    cy_mid_hi = gy1 - (gy1 - gy0) // 4
    col_dark = [0] * w
    for x in range(w):
        for y in range(cy_mid_lo, cy_mid_hi):
            if is_dark(px[x, y]):
                col_dark[x] += 1
    smoothed = [0] * w
    for x in range(w):
        s = 0
        nn = 0
        for k in range(-5, 6):
            xx = x + k
            if 0 <= xx < w:
                s += col_dark[xx]
                nn += 1
        smoothed[x] = s / nn

    peaks = []
    for x in range(30, w - 30):
        here = smoothed[x]
        if here < 50:
            continue
        is_max = True
        for k in range(-30, 31):
            xx = x + k
            if 0 <= xx < w and smoothed[xx] > here:
                is_max = False
                break
        if is_max:
            peaks.append((x, here))
    merged_peaks = []
    for x, v in peaks:
        if merged_peaks and x - merged_peaks[-1][0] < 80:
            if v > merged_peaks[-1][1]:
                merged_peaks[-1] = (x, v)
        else:
            merged_peaks.append((x, v))
    print(f"divider peaks: {[(x, int(v)) for x, v in merged_peaks]}")

    # We want 4 internal dividers. The first/last peaks (x near 70 and x near 1304)
    # are the gold border edges. Filter to peaks with strong dark signal (>150)
    # and between gx0+50 and gx1-50.
    internal_dividers = [x for x, v in merged_peaks if v > 150 and gx0 + 50 < x < gx1 - 50]
    print(f"internal divider x-centers: {internal_dividers}")

    # Find horizontal trim rows: heavy dark in central horizontal band.
    cx_mid_lo = gx0 + (gx1 - gx0) // 4
    cx_mid_hi = gx1 - (gx1 - gx0) // 4
    row_dark = [0] * h
    for y in range(h):
        for x in range(cx_mid_lo, cx_mid_hi):
            if is_dark(px[x, y]):
                row_dark[y] += 1
    smoothed_r = [0] * h
    for y in range(h):
        s = 0
        nn = 0
        for k in range(-5, 6):
            yy = y + k
            if 0 <= yy < h:
                s += row_dark[yy]
                nn += 1
        smoothed_r[y] = s / nn

    top_trim_y = None
    bot_trim_y = None
    for y in range(h):
        if smoothed_r[y] > 200:
            if top_trim_y is None:
                top_trim_y = y
            bot_trim_y = y
    print(f"horizontal trim band: y={top_trim_y}..{bot_trim_y}")

    # Define "panel interior" as: between vertical dividers (or between the gold
    # border and the first divider, or between last divider and the gold border),
    # AND between the top trim and the bottom trim. Pixels in this region are
    # the "interior landscape" that we want TRANSPARENT.
    #
    # Panel x-ranges:
    bounds_x = [gx0 + pad] + internal_dividers + [gx1 - pad]
    print(f"panel x-bounds: {bounds_x}")
    # Y bounds:
    bounds_y_top = top_trim_y if top_trim_y is not None else gy0 + pad
    bounds_y_bot = bot_trim_y if bot_trim_y is not None else gy1 - pad
    print(f"panel y-bounds: y={bounds_y_top}..{bounds_y_bot}")

    # Crop to gold bbox + margin.
    cx0 = max(0, gx0 - crop_margin)
    cy0 = max(0, gy0 - crop_margin)
    cx1 = min(w, gx1 + crop_margin + 1)
    cy1 = min(h, gy1 + crop_margin + 1)
    cw = cx1 - cx0
    ch = cy1 - cy0
    print(f"crop: x={cx0}..{cx1}  y={cy0}..{cy1}  size={cw}x{ch}")

    # Build output.
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    out_px = out.load()
    for sy in range(ch):
        for sx in range(cw):
            ox = cx0 + sx
            oy = cy0 + sy
            r, g, b = px[ox, oy]
            # Default: keep pixel only if it's gold or dark ink.
            keep = False
            if is_gold((r, g, b)):
                keep = True
            elif is_dark((r, g, b)):
                # But ONLY if it's part of the border/divider/trim, NOT panel interior.
                # Panel interior: between two x-bounds AND between y-bounds.
                in_panel = False
                for i in range(len(bounds_x) - 1):
                    if bounds_x[i] <= ox <= bounds_x[i + 1]:
                        # Check if inside the vertical band of this panel.
                        # Add a few px buffer so we don't erase dark pixels right at the divider.
                        if (bounds_x[i] + 8) <= ox <= (bounds_x[i + 1] - 8):
                            if bounds_y_top <= oy <= bounds_y_bot:
                                in_panel = True
                                break
                if not in_panel:
                    keep = True
            if keep:
                out_px[sx, sy] = (r, g, b, 255)
            else:
                out_px[sx, sy] = (r, g, b, 0)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out.save(out_path)
    print(f"wrote {out_path}")


if __name__ == "__main__":
    process(sys.argv[1], sys.argv[2])
