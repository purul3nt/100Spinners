#!/usr/bin/env python3
"""Row-by-row horizontal ink profile to find true circle peaks.

Strategy: For each row in the symbol band, count ink horizontally.
"""
import sys
from PIL import Image

img = Image.open(sys.argv[1]).convert("RGB")
w, h = img.size
px = img.load()

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
    return (bg_lum - lum) > 30

# Only consider rows inside the symbol band: roughly y=200..570 (highpay) or 250..500 (lowpay).
y0, y1 = 200, 600
print(f"rows {y0}..{y1}")

# Per-column ink.
col_ink = [0] * w
for x in range(w):
    for y in range(y0, min(y1, h)):
        if is_ink(px[x, y]):
            col_ink[x] += 1

# Smooth.
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

# Find local maxima >= 5px apart (peaks).
peaks = []
for x in range(10, w - 10):
    here = smoothed[x]
    if here < 30:
        continue
    is_max = True
    for k in range(-30, 31):
        if k == 0:
            continue
        if smoothed[x + k] > here:
            is_max = False
            break
    if is_max:
        peaks.append((x, here))

# Merge near-duplicate peaks.
merged_peaks = []
for x, v in peaks:
    if merged_peaks and x - merged_peaks[-1][0] < 80:
        # keep the higher
        if v > merged_peaks[-1][1]:
            merged_peaks[-1] = (x, v)
    else:
        merged_peaks.append((x, v))

print(f"\n{len(merged_peaks)} peaks found:")
for x, v in merged_peaks:
    print(f"  peak x={x:4d}  ink={v:6.1f}")

# Find valleys.
valleys = []
in_v = False
start = 0
for x in range(w):
    if smoothed[x] < 8:
        if not in_v:
            start = x
            in_v = True
    else:
        if in_v:
            valleys.append((start, x - 1))
            in_v = False
if in_v:
    valleys.append((start, w - 1))

print(f"\nvalleys (smoothed < 8):")
for s, e in valleys:
    print(f"  valley x={s}..{e}  (center={ (s+e)//2 })")
