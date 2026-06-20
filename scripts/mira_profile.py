#!/usr/bin/env python3
"""Dump a per-column profile and a horizontal mask to understand layout."""
import sys
from PIL import Image

img = Image.open(sys.argv[1]).convert("RGB")
w, h = img.size
px = img.load()

# Background: sample top edge
bg = [0, 0, 0]
n = 0
for x in range(0, w):
    for y in range(0, 5):
        bg[0] += px[x, y][0]
        bg[1] += px[x, y][1]
        bg[2] += px[x, y][2]
        n += 1
bg = [c / n for c in bg]
print(f"bg {bg}")

# Mask = strong ink (dark) only. Threshold on luminance AND distance from bg.
def is_ink(rgb):
    r, g, b = rgb
    lum = (r + g + b) / 3
    bg_lum = sum(bg) / 3
    return lum < 110 and (bg_lum - lum) > 50

# Per-column ink count.
col_ink = [0] * w
for x in range(w):
    for y in range(h):
        if is_ink(px[x, y]):
            col_ink[x] += 1

# Print col_ink in 50-px buckets to see the structure.
print("column ink density (50px buckets):")
bucket = 50
for i in range(0, w, bucket):
    seg = col_ink[i:i + bucket]
    avg = sum(seg) / len(seg)
    bar = "#" * int(avg)
    print(f"  x={i:4d}-{i+bucket-1:4d}: avg={avg:6.1f}  {bar}")

# Also dump min-to-find valleys.
print("\nlocal minima in 100-px windows (looking for valleys between circles):")
window = 100
for i in range(window, w - window, 20):
    seg = col_ink[i - window:i + window]
    here = col_ink[i]
    if here < 5:
        print(f"  x={i:4d}: ink={here}")
