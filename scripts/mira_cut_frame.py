#!/usr/bin/env python3
"""Process the reel-frame JPEG into a transparent RGBA PNG.

Inputs:
  - frame JPEG (1376x768)
  - outer golden border bbox (manually detected: x=42..1330, y=9..711)
  - output path

Algorithm:
  1. Open frame as RGB.
  2. Detect the gold border + dark internal dividers + dark horizontal trim.
  3. Build a transparency mask:
     - Pixels OUTSIDE the outer golden border -> transparent.
     - Pixels INSIDE the outer golden border that are "panel interior" -> opaque
       (preserves the landscape scene inside).
     - The gold border, medallions, and black internal dividers are kept opaque
       naturally because they're ink/gold pixels.
  4. Crop to the outer golden bbox + small margin.
  5. Save as RGBA PNG.

The outer gold border detection uses a sample of the leftmost/rightmost/topmost/bottommost
gold pixels; everything beyond that becomes transparent.
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


def process(in_path: str, out_path: str, crop_margin: int = 4) -> None:
    img = Image.open(in_path).convert("RGB")
    w, h = img.size
    px = img.load()

    # 1. Detect outer golden border bbox (outermost gold pixels).
    gx0, gy0, gx1, gy1 = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if is_gold(px[x, y]):
                if x < gx0: gx0 = x
                if x > gx1: gx1 = x
                if y < gy0: gy0 = y
                if y > gy1: gy1 = y
    print(f"golden border bbox: x={gx0}..{gx1}  y={gy0}..{gy1}")

    # Crop the image to a small margin outside the golden border.
    cx0 = max(0, gx0 - crop_margin)
    cy0 = max(0, gy0 - crop_margin)
    cx1 = min(w, gx1 + crop_margin + 1)
    cy1 = min(h, gy1 + crop_margin + 1)
    cw = cx1 - cx0
    ch = cy1 - cy0
    print(f"crop: x={cx0}..{cx1}  y={cy0}..{cy1}  size={cw}x{ch}")

    # 2. Build RGBA output.
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    out_px = out.load()
    # Inside the cropped region, every pixel is potentially:
    #   - inside the gold border + dark trim/dividers (opaque)
    #   - inside the panel interior (opaque - the landscape is real art)
    #   - outside the gold border (transparent)
    # Use a "is inside the gold border rectangle" test:
    # For a pixel at (x, y) in the ORIGINAL image, check if there's gold
    # on at least one side within a small range.
    # Simpler: any pixel that is INSIDE the golden-border bbox (gx0..gx1, gy0..gy1)
    # is opaque; anything outside is transparent.
    # But the gold border ITSELF may have very thin pixels, and we want them opaque.
    # To handle the medallions that stick OUTSIDE the bbox slightly (e.g., gold
    # corner medallions have ornamental flourishes), we allow up to 6 px outside.
    pad = 6
    for sy in range(ch):
        for sx in range(cw):
            ox = cx0 + sx
            oy = cy0 + sy
            r, g, b = px[ox, oy]
            # Inside the gold-rect (with small pad for medallions)?
            if (gx0 - pad) <= ox <= (gx1 + pad) and (gy0 - pad) <= oy <= (gy1 + pad):
                out_px[sx, sy] = (r, g, b, 255)
            else:
                out_px[sx, sy] = (r, g, b, 0)

    # 3. Now do a "wash" pass on pixels OUTSIDE the padded gold-rect to make sure
    # they are fully transparent (in case any leaked through).
    for sy in range(ch):
        for sx in range(cw):
            ox = cx0 + sx
            oy = cy0 + sy
            if not ((gx0 - pad) <= ox <= (gx1 + pad) and (gy0 - pad) <= oy <= (gy1 + pad)):
                out_px[sx, sy] = (0, 0, 0, 0)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out.save(out_path)
    print(f"wrote {out_path}")


if __name__ == "__main__":
    process(sys.argv[1], sys.argv[2])
