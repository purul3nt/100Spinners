#!/usr/bin/env python3
"""Better sheet analyzer: find the 5 circular symbols in a row.

Strategy:
1. Open as RGB.
2. Compute the parchment background by sampling a generous border (avoiding subject).
3. Mask: keep only pixels that are very dark OR very saturated (ink + colored disc interiors).
4. For each column, count "ink" pixels; cluster into bands.
5. Filter bands by expected symbol radius (heights ~250-450 px in 1376x768).
6. Output band x-bounds + vertical extent.
"""
from __future__ import annotations
import sys
from PIL import Image


def analyze(path: str) -> None:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    print(f"file: {path}\nsize: {w}x{h}")
    px = img.load()

    # Estimate background from corners + edges (assume subject is in middle band only).
    bg_samples = []
    for y in range(0, 30):
        for x in range(0, w):
            bg_samples.append(px[x, y])
    for y in range(h - 30, h):
        for x in range(0, w):
            bg_samples.append(px[x, y])
    for y in range(0, h):
        for x in range(0, 30):
            bg_samples.append(px[x, y])
        for x in range(w - 30, w):
            bg_samples.append(px[x, y])
    bg_r = sum(s[0] for s in bg_samples) / len(bg_samples)
    bg_g = sum(s[1] for s in bg_samples) / len(bg_samples)
    bg_b = sum(s[2] for s in bg_samples) / len(bg_samples)
    print(f"bg sample avg: rgb({bg_r:.0f},{bg_g:.0f},{bg_b:.0f})")

    # Build mask: "ink" pixel = (very dark) OR (very saturated).
    def is_ink(rgb):
        r, g, b = rgb
        lum = (r + g + b) / 3
        bg_lum = (bg_r + bg_g + bg_b) / 3
        # dark ink
        if lum < 90:
            return True
        # saturated disc interior / strong color deviation from parchment
        mx = max(r, g, b)
        mn = min(r, g, b)
        chroma = mx - mn
        # strong saturation OR a big distance from background
        if chroma > 70:
            return True
        if (bg_lum - lum) > 50 and chroma > 25:
            return True
        return False

    # For each column, count ink rows.
    col_ink = [0] * w
    for x in range(w):
        for y in range(h):
            if is_ink(px[x, y]):
                col_ink[x] += 1

    # Smooth col_ink (5-column moving average) to remove antialiasing spikes.
    smoothed = [0] * w
    for x in range(w):
        s = 0
        n = 0
        for k in range(-3, 4):
            xx = x + k
            if 0 <= xx < w:
                s += col_ink[xx]
                n += 1
        smoothed[x] = s / n if n else 0

    BAND_MIN_INK = 4
    bands = []
    in_band = False
    start = 0
    for x in range(w):
        c = smoothed[x]
        if c >= BAND_MIN_INK:
            if not in_band:
                start = x
                in_band = True
        else:
            if in_band:
                bands.append((start, x - 1))
                in_band = False
    if in_band:
        bands.append((start, w - 1))

    # Merge small gaps (<25 px)
    merged: list[list[int]] = []
    for s, e in bands:
        if merged and s - merged[-1][1] < 25:
            merged[-1][1] = e
        else:
            merged.append([s, e])

    # For each band, vertical extent.
    band_info = []
    for s, e in merged:
        row_ink = [0] * h
        for x in range(s, e + 1):
            for y in range(h):
                if is_ink(px[x, y]):
                    row_ink[y] += 1
        top = None
        bot = None
        for y in range(h):
            if row_ink[y] >= 3:
                if top is None:
                    top = y
                bot = y
        if top is None:
            continue
        band_info.append({
            "x0": s, "x1": e, "w": e - s + 1,
            "y0": top, "y1": bot, "h": bot - top + 1,
        })

    # Filter to plausible symbol bands (height > 200 px).
    symbols = [b for b in band_info if b["h"] > 200]
    print(f"candidate symbol bands (height>200): {len(symbols)}")
    for i, b in enumerate(symbols):
        cx = (b["x0"] + b["x1"]) // 2
        cy = (b["y0"] + b["y1"]) // 2
        print(f"  sym {i}: x=({b['x0']},{b['x1']}) w={b['w']}  y=({b['y0']},{b['y1']}) h={b['h']}  center=({cx},{cy})")

    # Also print all bands including decorative ones for transparency.
    print(f"all merged bands (incl. decorative): {len(merged)}")
    for i, (s, e) in enumerate(merged):
        print(f"  band {i}: x={s}..{e}  width={e - s + 1}")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        analyze(p)
        print()
