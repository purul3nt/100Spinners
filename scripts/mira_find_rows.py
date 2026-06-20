#!/usr/bin/env python3
"""Per-column-row ink density to find the actual symbol circle y-extents."""
import sys
from PIL import Image

img = Image.open(sys.argv[1]).convert("RGB")
w, h = img.size
px = img.load()

# Sample bg from top edge
bg = [0, 0, 0]
n = 0
for x in range(0, w):
    for y in range(0, 4):
        bg[0] += px[x, y][0]
        bg[1] += px[x, y][1]
        bg[2] += px[x, y][2]
        n += 1
bg = [c / n for c in bg]
print(f"bg {bg}")

def is_ink(rgb):
    r, g, b = rgb
    lum = (r + g + b) / 3
    bg_lum = sum(bg) / 3
    return (bg_lum - lum) > 25

# Per-row ink count.
row_ink = [0] * h
for y in range(h):
    for x in range(w):
        if is_ink(px[x, y]):
            row_ink[y] += 1

# Smooth 11-px window.
smoothed = [0] * h
for y in range(h):
    s = 0
    nn = 0
    for k in range(-5, 6):
        yy = y + k
        if 0 <= yy < h:
            s += row_ink[yy]
            nn += 1
    smoothed[y] = s / nn

# Find peaks (symbol rows).
peaks = []
for y in range(30, h - 30):
    here = smoothed[y]
    if here < 30:
        continue
    is_max = True
    for k in range(-30, 31):
        if k == 0:
            continue
        yy = y + k
        if 0 <= yy < h and smoothed[yy] > here:
            is_max = False
            break
    if is_max:
        peaks.append((y, here))

merged = []
for y, v in peaks:
    if merged and y - merged[-1][0] < 80:
        if v > merged[-1][1]:
            merged[-1] = (y, v)
    else:
        merged.append((y, v))

print(f"{len(merged)} row peaks:")
for y, v in merged:
    print(f"  peak y={y:4d}  ink={v:6.1f}")

# Per-symbol band: extent of contiguous rows with smoothed > 10.
print("\nrow bands (smoothed > 10):")
in_band = False
start = 0
for y in range(h):
    if smoothed[y] > 10:
        if not in_band:
            start = y
            in_band = True
    else:
        if in_band:
            print(f"  band y={start}..{y-1}  (height={y-start})")
            in_band = False
if in_band:
    print(f"  band y={start}..{h-1}  (height={h-start})")
