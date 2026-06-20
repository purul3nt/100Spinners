#!/usr/bin/env python3
"""Analyze the reel-frame JPEG to find:
  - Outer golden border bounding box.
  - Top, bottom, left, right border widths.
  - Vertical divider positions between the 5 panels.
"""
from __future__ import annotations
import math
import sys
from PIL import Image


def is_gold(rgb):
    """Detect 'gold' pixels (the thin gold frame lines + medallions)."""
    r, g, b = rgb
    # Gold is high R, high G, low B.
    return r > 180 and g > 140 and b < 110 and (r - b) > 80


def is_dark(rgb):
    """Detect dark pixels (the heavy black vertical dividers)."""
    r, g, b = rgb
    return (r + g + b) / 3 < 80


def analyze(path: str):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    print(f"file: {path}\nsize: {w}x{h}")
    px = img.load()

    # 1. Find golden border bounding box (outermost gold pixels).
    gold_min_x = w
    gold_max_x = 0
    gold_min_y = h
    gold_max_y = 0
    for y in range(h):
        for x in range(w):
            if is_gold(px[x, y]):
                if x < gold_min_x: gold_min_x = x
                if x > gold_max_x: gold_max_x = x
                if y < gold_min_y: gold_min_y = y
                if y > gold_max_y: gold_max_y = y
    print(f"\nGOLDEN border bbox: x={gold_min_x}..{gold_max_x}  y={gold_min_y}..{gold_max_y}")
    print(f"  frame width:  {gold_max_x - gold_min_x + 1}")
    print(f"  frame height: {gold_max_y - gold_min_y + 1}")

    # 2. Find vertical dividers (dark columns).
    # Use only the central vertical band (y between 1/4 and 3/4 of frame) to avoid
    # the gold top/bottom borders.
    y0 = gold_min_y + (gold_max_y - gold_min_y) // 4
    y1 = gold_max_y - (gold_max_y - gold_min_y) // 4
    col_dark = [0] * w
    for x in range(w):
        for y in range(y0, y1):
            if is_dark(px[x, y]):
                col_dark[x] += 1
    print(f"\ncol_dark (y={y0}..{y1}) top 40 columns with dark>0:")
    top_dark = sorted(enumerate(col_dark), key=lambda t: -t[1])[:20]
    for x, n in sorted(top_dark):
        print(f"  x={x}: dark={n}")

    # 3. Find horizontal borders (dark rows).
    # Use only the central horizontal band (x between 1/4 and 3/4 of frame).
    x0 = gold_min_x + (gold_max_x - gold_min_x) // 4
    x1 = gold_max_x - (gold_max_x - gold_min_x) // 4
    row_dark = [0] * h
    for y in range(h):
        for x in range(x0, x1):
            if is_dark(px[x, y]):
                row_dark[y] += 1
    print(f"\nrow_dark (x={x0}..{x1}) top 20 rows with dark>0:")
    top_dark = sorted(enumerate(row_dark), key=lambda t: -t[1])[:20]
    for y, n in sorted(top_dark):
        print(f"  y={y}: dark={n}")

    # 4. Estimate panel boundaries: between the vertical dividers.
    # Panels are 5 in total. Dividers are dark vertical columns. Find local maxima.
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
    # Find peaks.
    peaks = []
    for x in range(30, w - 30):
        here = smoothed[x]
        if here < 5:
            continue
        is_max = True
        for k in range(-30, 31):
            xx = x + k
            if 0 <= xx < w and smoothed[xx] > here:
                is_max = False
                break
        if is_max:
            peaks.append((x, here))
    # Merge close peaks.
    merged = []
    for x, v in peaks:
        if merged and x - merged[-1][0] < 80:
            if v > merged[-1][1]:
                merged[-1] = (x, v)
        else:
            merged.append((x, v))
    print(f"\nVertical divider peaks ({len(merged)} found):")
    for x, v in merged:
        print(f"  x={x}  dark={v:.1f}")


if __name__ == "__main__":
    analyze(sys.argv[1])
