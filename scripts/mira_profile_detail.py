#!/usr/bin/env python3
"""Find the 5 symbol centers via per-column ink density with proper tight ink detection.

Use a strict 'dark' mask (avoid picking up parchment texture).
Detect local minima between circles and use them as cut points.
"""
import sys
from PIL import Image

img = Image.open(sys.argv[1]).convert("RGB")
w, h = img.size
px = img.load()

# Sample background from top edge (cleanest).
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

# Strict dark ink: significantly darker than background.
def is_ink(rgb):
    r, g, b = rgb
    lum = (r + g + b) / 3
    bg_lum = sum(bg) / 3
    return (bg_lum - lum) > 35

# Per-column ink count, smoothed 11-px.
col_ink = [0] * w
for x in range(w):
    for y in range(h):
        if is_ink(px[x, y]):
            col_ink[x] += 1

smoothed = [0] * w
for x in range(w):
    s = 0
    nn = 0
    for k in range(-5, 6):
        xx = x + k
        if 0 <= xx < w:
            s += col_ink[xx]
            nn += 1
    smoothed[x] = s / nn

# Print per-25px bucket profile.
print("per-25px ink density:")
for i in range(0, w, 25):
    seg = smoothed[i:i + 25]
    avg = sum(seg) / len(seg)
    bar = "#" * int(avg / 5)
    print(f"  x={i:4d}: {avg:6.1f}  {bar}")

# Find valleys: every column with smoothed < 5, then merge to ranges.
print("\nvalleys (smoothed ink < 5):")
valleys = []
in_v = False
start = 0
for x in range(w):
    if smoothed[x] < 5:
        if not in_v:
            start = x
            in_v = True
    else:
        if in_v:
            valleys.append((start, x - 1))
            in_v = False
if in_v:
    valleys.append((start, w - 1))
for s, e in valleys:
    print(f"  valley x={s}..{e}  (center={ (s+e)//2 })")
