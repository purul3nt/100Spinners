#!/usr/bin/env python3
"""Per-column y-extent of 'circle ink' — the vertical range of each symbol's circle.

We restrict to luminance-based 'dark' pixels (the brushstroke ink) within each
column, then find the contiguous vertical range with high density.
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

# Use the column valleys to define 5 symbols.
valleys = [int(v) for v in sys.argv[2:7]]
cuts = [0] + sorted(valleys) + [w]
print(f"cuts {cuts}")

for i in range(len(cuts) - 1):
    c0 = cuts[i]
    c1 = cuts[i + 1]
    cw = c1 - c0
    row_ink = [0] * h
    for x in range(c0, c1):
        for y in range(h):
            if is_ink(px[x, y]):
                row_ink[y] += 1
    # smoothed
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
    # find dominant contiguous band
    in_band = False
    start = 0
    best = (0, 0, 0)
    for y in range(h):
        if smooth[y] > 5:
            if not in_band:
                start = y
                in_band = True
            cur_h = y - start + 1
            if cur_h > best[2]:
                best = (start, y, cur_h)
        else:
            in_band = False
    s, e, ht = best
    print(f"  col {i}: x={c0}..{c1}  band y={s}..{e}  h={ht}")
