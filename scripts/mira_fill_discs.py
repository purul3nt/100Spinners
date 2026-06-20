#!/usr/bin/env python3
"""Post-process symbol cuts to fill their disc interiors as fully opaque.

For each input symbol PNG, detect the dominant dark circular contour, estimate
its center+radius, and force alpha=255 inside that circle. This makes the
beige/colored disc background of each symbol fully opaque regardless of its
chroma match to the parchment texture.
"""
from __future__ import annotations
import math
import os
import sys
from PIL import Image


def process_one(in_path: str, out_path: str) -> None:
    im = Image.open(in_path).convert("RGBA")
    w, h = im.size
    px = im.load()

    # Build dark-pixel mask (the ink frame + dark splatters inside).
    dark = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and (r + g + b) / 3 < 110:
                dark.append((x, y))
    if len(dark) < 100:
        im.save(out_path)
        return

    # Find the bounding box of dark pixels — the ink ring + splatter.
    min_x = min(p[0] for p in dark)
    max_x = max(p[0] for p in dark)
    min_y = min(p[1] for p in dark)
    max_y = max(p[1] for p in dark)
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    # Radius: half the average bbox dimension, minus 5% margin (the bbox includes
    # splatters outside the ring).
    bbox_w = max_x - min_x
    bbox_h = max_y - min_y
    r0 = min(bbox_w, bbox_h) / 2 * 0.93

    # Fill the disc interior as fully opaque (alpha=255).
    r2 = r0 * r0
    for y in range(h):
        for x in range(w):
            dx = x - cx
            dy = y - cy
            if dx * dx + dy * dy <= r2:
                r, g, b, a = px[x, y]
                # Force alpha=255 but preserve RGB.
                px[x, y] = (r, g, b, 255)

    im.save(out_path)
    print(f"wrote {out_path}  filled disc center=({cx:.0f},{cy:.0f}) r={r0:.0f}")


if __name__ == "__main__":
    in_dir = sys.argv[1]
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for f in sorted(os.listdir(in_dir)):
        if f.endswith(".png"):
            process_one(os.path.join(in_dir, f), os.path.join(out_dir, f))
