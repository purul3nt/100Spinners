#!/usr/bin/env python3
"""Composite the reel frame over the bg + 5 column-aligned symbols.

This simulates what the player will see in-game:
  - shogun_background_source.png as base (1376x768)
  - 5 high-pay symbols placed at the 5 panel columns
  - reel_frame.png overlay on top
"""
import os
from PIL import Image

bg = Image.open("/home/llama-claw/Repos/100Spinners/src/assets/game/shogun_background_source.png").convert("RGBA")
bg_w, bg_h = bg.size
print(f"bg {bg_w}x{bg_h}")

frame = Image.open("/home/llama-claw/Repos/100Spinners/src/assets/game/reel_frame.png").convert("RGBA")
fw, fh = frame.size
print(f"frame {fw}x{fh}")

# Place frame centered on bg.
fx = (bg_w - fw) // 2
fy = (bg_h - fh) // 2
print(f"frame pos: ({fx}, {fy})")

# Place 5 symbols at the panel centers (x=314, 575, 822, 1069 between dividers;
# panel centers: ~192, 444, 698, 945, 1186 — between dividers).
# Frame bbox x=42..1330; panel centers:
#   panel 1: ~ (42+314)/2 = 178
#   panel 2: ~ (314+575)/2 = 444
#   panel 3: ~ (575+822)/2 = 698
#   panel 4: ~ (822+1069)/2 = 945
#   panel 5: ~ (1069+1330)/2 = 1199
# Vertical center: ~(9+711)/2 = 360
panel_centers_x = [178, 444, 698, 945, 1199]
panel_cy = 360

# Layer: bg -> symbols (centered in panels) -> frame.
out = bg.copy()

high = sorted([f for f in os.listdir("/home/llama-claw/Repos/100Spinners/src/assets/game/symbols_high") if f.endswith(".png")])
print(f"placing {len(high)} symbols:")
for i, fname in enumerate(high):
    sym = Image.open(f"/home/llama-claw/Repos/100Spinners/src/assets/game/symbols_high/{fname}").convert("RGBA")
    sw, sh = sym.size
    # Fit symbol within panel: panel width ~244, panel height ~660.
    max_w = 220
    max_h = 220
    scale = min(max_w / sw, max_h / sh, 1.0)
    nw = int(sw * scale)
    nh = int(sh * scale)
    sym = sym.resize((nw, nh), Image.LANCZOS)
    x = panel_centers_x[i] - nw // 2
    y = panel_cy - nh // 2
    out.paste(sym, (x, y), sym)
    print(f"  {fname}: {sw}x{sh} -> {nw}x{nh} at ({x}, {y})")

# Place frame on top.
out.paste(frame, (fx, fy), frame)

out.save("/home/llama-claw/.openclaw/media/outgoing/shogun-spinners-mira-verify/_composite_with_frame.png")
print("wrote /home/llama-claw/.openclaw/media/outgoing/shogun-spinners-mira-verify/_composite_with_frame.png")
