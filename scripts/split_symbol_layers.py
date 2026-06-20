#!/usr/bin/env python3
"""Split slot symbols into background and foreground layers.

The workflow is intentionally deterministic and config-driven:
  1. Draw a foreground mask from simple shapes.
  2. Save the original pixels under that mask as <symbol>_fg.png.
  3. Inpaint/fill the masked area on the base image as <symbol>_bg.png.

This is designed for slot symbols where the foreground art should get a
secondary landing bounce while the framed/background tile remains steady.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw


def resolve_path(root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else root / path


def draw_shape(draw: ImageDraw.ImageDraw, shape: dict[str, Any], fill: int) -> None:
    shape_type = shape["type"]
    if shape_type == "rect":
        draw.rectangle(shape["box"], fill=fill)
    elif shape_type == "rounded_rect":
        draw.rounded_rectangle(shape["box"], radius=shape.get("radius", 8), fill=fill)
    elif shape_type == "ellipse":
        draw.ellipse(shape["box"], fill=fill)
    elif shape_type == "polygon":
        draw.polygon([tuple(point) for point in shape["points"]], fill=fill)
    else:
        raise ValueError(f"Unsupported shape type: {shape_type}")


def scale_shape(shape: dict[str, Any], scale: int) -> dict[str, Any]:
    scaled = dict(shape)
    if "box" in shape:
      scaled["box"] = [int(round(value * scale)) for value in shape["box"]]
    if "points" in shape:
      scaled["points"] = [[int(round(x * scale)), int(round(y * scale))] for x, y in shape["points"]]
    if "radius" in shape:
      scaled["radius"] = int(round(shape["radius"] * scale))
    return scaled


def build_mask_alpha(size: tuple[int, int], shapes: list[dict[str, Any]], scale: int = 4) -> np.ndarray:
    large_size = (size[0] * scale, size[1] * scale)
    mask = Image.new("L", large_size, 0)
    draw = ImageDraw.Draw(mask)
    for shape in shapes:
        op = shape.get("op", "add")
        scaled_shape = scale_shape(shape, scale)
        if op == "add":
            draw_shape(draw, scaled_shape, 255)
        elif op == "subtract":
            draw_shape(draw, scaled_shape, 0)
        else:
            raise ValueError(f"Unsupported mask op: {op}")
    mask = mask.resize(size, Image.Resampling.LANCZOS)
    return np.array(mask)


def build_mask(size: tuple[int, int], shapes: list[dict[str, Any]]) -> np.ndarray:
    return build_mask_alpha(size, shapes) > 127


def build_optional_mask_alpha(size: tuple[int, int], shapes: list[dict[str, Any]] | None) -> np.ndarray:
    if not shapes:
        return np.zeros((size[1], size[0]), dtype=np.uint8)
    return build_mask_alpha(size, shapes)


def rgb_to_hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    values = rgb.astype(np.float32) / 255.0
    r = values[..., 0]
    g = values[..., 1]
    b = values[..., 2]
    maxc = values.max(axis=2)
    minc = values.min(axis=2)
    delta = maxc - minc

    hue = np.zeros_like(maxc)
    active = delta > 0.00001
    red = active & (maxc == r)
    green = active & (maxc == g)
    blue = active & (maxc == b)
    hue[red] = ((g[red] - b[red]) / delta[red]) % 6
    hue[green] = ((b[green] - r[green]) / delta[green]) + 2
    hue[blue] = ((r[blue] - g[blue]) / delta[blue]) + 4
    hue *= 60

    saturation = np.zeros_like(maxc)
    nonzero = maxc > 0
    saturation[nonzero] = delta[nonzero] / maxc[nonzero]
    return hue, saturation, maxc


def hue_in_range(hue: np.ndarray, hue_range: list[float]) -> np.ndarray:
    start, end = hue_range
    if start <= end:
        return (hue >= start) & (hue <= end)
    return (hue >= start) | (hue <= end)


def build_color_reject_mask(size: tuple[int, int], rgb: np.ndarray, rules: list[dict[str, Any]] | None) -> np.ndarray:
    if not rules:
        return np.zeros((size[1], size[0]), dtype=bool)

    hue, saturation, value = rgb_to_hsv(rgb)
    reject = np.zeros((size[1], size[0]), dtype=bool)
    for rule in rules:
        region = build_mask(size, rule["shapes"])
        color_match = np.zeros_like(region)
        for color in rule.get("colors", []):
            current = hue_in_range(hue, color["hue"])
            if "saturation" in color:
                low, high = color["saturation"]
                current &= (saturation >= low) & (saturation <= high)
            if "value" in color:
                low, high = color["value"]
                current &= (value >= low) & (value <= high)
            color_match |= current
        reject |= region & color_match
    return reject


def dilate(mask: np.ndarray, passes: int) -> np.ndarray:
    result = mask.copy()
    height, width = result.shape
    for _ in range(max(0, passes)):
        padded = np.pad(result, 1, mode="constant")
        expanded = np.zeros_like(result)
        for dy in range(3):
            for dx in range(3):
                expanded |= padded[dy : dy + height, dx : dx + width]
        result = expanded
    return result


def diffuse_fill(rgb: np.ndarray, fill_mask: np.ndarray, iterations: int) -> np.ndarray:
    filled = rgb.astype(np.float32).copy()
    height, width = fill_mask.shape

    edge = dilate(fill_mask, 1) & ~fill_mask
    seed = rgb[edge].mean(axis=0) if edge.any() else np.array([48, 92, 48], dtype=np.float32)
    filled[fill_mask] = seed

    for _ in range(iterations):
        up = np.roll(filled, 1, axis=0)
        down = np.roll(filled, -1, axis=0)
        left = np.roll(filled, 1, axis=1)
        right = np.roll(filled, -1, axis=1)
        avg = (up + down + left + right) * 0.25
        filled[fill_mask] = avg[fill_mask]

    # Add a very light radial/ray variation so large filled areas do not read
    # as a flat painted blob when the foreground bounces away from the tile.
    yy, xx = np.mgrid[0:height, 0:width]
    cx = width / 2
    cy = height / 2
    angle = np.arctan2(yy - cy, xx - cx)
    rays = ((np.cos(angle * 18) + 1) * 0.5)[..., None]
    filled[fill_mask] = np.clip(filled[fill_mask] * (0.9 + 0.18 * rays[fill_mask]), 0, 255)
    return filled.astype(np.uint8)


def radial_extend_fill(rgb: np.ndarray, fill_mask: np.ndarray, iterations: int) -> np.ndarray:
    """Fill a radial comic burst by sampling unmasked pixels on the same ray."""
    height, width = fill_mask.shape
    yy, xx = np.mgrid[0:height, 0:width]
    cx = width / 2
    cy = height / 2
    dx = xx - cx
    dy = yy - cy
    dist = np.sqrt(dx * dx + dy * dy)
    unit_x = np.divide(dx, dist, out=np.zeros_like(dx, dtype=np.float64), where=dist > 0)
    unit_y = np.divide(dy, dist, out=np.zeros_like(dy, dtype=np.float64), where=dist > 0)

    filled = rgb.copy()
    masked_points = np.argwhere(fill_mask)
    for y, x in masked_points:
        ux = unit_x[y, x]
        uy = unit_y[y, x]
        found = False
        for direction in (1, -1):
            for step in range(4, 180, 2):
                sx = int(round(x + ux * step * direction))
                sy = int(round(y + uy * step * direction))
                if 0 <= sx < width and 0 <= sy < height and not fill_mask[sy, sx]:
                    filled[y, x] = rgb[sy, sx]
                    found = True
                    break
            if found:
                break

    # A little diffusion hides sampling seams without muddying the burst colours.
    if iterations > 0:
        smooth = filled.astype(np.float32)
        for _ in range(iterations):
            up = np.roll(smooth, 1, axis=0)
            down = np.roll(smooth, -1, axis=0)
            left = np.roll(smooth, 1, axis=1)
            right = np.roll(smooth, -1, axis=1)
            avg = (up + down + left + right) * 0.25
            smooth[fill_mask] = smooth[fill_mask] * 0.62 + avg[fill_mask] * 0.38
        filled[fill_mask] = np.clip(smooth[fill_mask], 0, 255).astype(np.uint8)

    return filled


def split_symbol(root: Path, key: str, spec: dict[str, Any]) -> tuple[Path, Path]:
    source = resolve_path(root, spec["source"])
    bg_out = resolve_path(root, spec["background"])
    fg_out = resolve_path(root, spec["foreground"])

    image = Image.open(source).convert("RGBA")
    rgba = np.array(image)
    height, width = rgba.shape[:2]
    fg_alpha = build_mask_alpha((width, height), spec["shapes"]).astype(np.float32)
    fg_alpha = np.maximum(fg_alpha, build_optional_mask_alpha((width, height), spec.get("forceForeground")).astype(np.float32))
    reject_alpha = build_optional_mask_alpha((width, height), spec.get("rejectForeground")).astype(np.float32)
    fg_alpha *= 1.0 - (reject_alpha / 255.0)
    color_reject = build_color_reject_mask((width, height), rgba[..., :3], spec.get("rejectColorRegions"))
    fg_alpha[color_reject] = 0
    fg_alpha = np.maximum(fg_alpha, build_optional_mask_alpha((width, height), spec.get("protectForeground")).astype(np.float32))
    fg_alpha = np.clip(fg_alpha, 0, 255).astype(np.uint8)
    fg_mask = fg_alpha > 8
    bg_mask = dilate(fg_mask, int(spec.get("bgDilate", 3)))

    foreground = rgba.copy()
    foreground[..., 3] = ((foreground[..., 3].astype(np.uint16) * fg_alpha.astype(np.uint16)) // 255).astype(np.uint8)

    background = rgba.copy()
    fill_mode = spec.get("fillMode", "diffuse")
    fill_iterations = int(spec.get("diffusionIterations", 800))
    if fill_mode == "radial":
        filled_rgb = radial_extend_fill(rgba[..., :3], bg_mask, max(0, fill_iterations // 12))
    elif fill_mode == "diffuse":
        filled_rgb = diffuse_fill(rgba[..., :3], bg_mask, fill_iterations)
    else:
        raise ValueError(f"Unsupported fillMode for {key}: {fill_mode}")
    background[..., :3] = filled_rgb
    background[..., 3] = 255

    bg_out.parent.mkdir(parents=True, exist_ok=True)
    fg_out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(background, "RGBA").save(bg_out)
    Image.fromarray(foreground, "RGBA").save(fg_out)
    print(f"{key}: wrote {bg_out.name}, {fg_out.name} ({int(fg_mask.sum())} fg px)")
    return bg_out, fg_out


def make_contact_sheet(paths: list[Path], out_path: Path) -> None:
    cells: list[Image.Image] = []
    for path in paths:
        image = Image.open(path).convert("RGBA")
        checker = Image.new("RGBA", image.size, (28, 28, 36, 255))
        draw = ImageDraw.Draw(checker)
        step = 16
        for y in range(0, image.height, step):
            for x in range(0, image.width, step):
                if ((x // step) + (y // step)) % 2 == 0:
                    draw.rectangle((x, y, x + step - 1, y + step - 1), fill=(54, 54, 66, 255))
        checker.alpha_composite(image)
        cells.append(checker)

    if not cells:
        return

    width, height = cells[0].size
    sheet = Image.new("RGBA", (width * 2, height * ((len(cells) + 1) // 2)), (12, 12, 18, 255))
    for index, cell in enumerate(cells):
        sheet.alpha_composite(cell, ((index % 2) * width, (index // 2) * height))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
    print(f"contact sheet: wrote {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Split configured slot symbols into bg/fg layers.")
    parser.add_argument("--config", default="scripts/symbol_layer_masks.json")
    parser.add_argument("--symbol", action="append", help="Only process this symbol key. May be repeated.")
    parser.add_argument("--contact-sheet", help="Optional path for a foreground contact sheet.")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    config_path = resolve_path(root, args.config)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    symbols: dict[str, Any] = config["symbols"]
    selected = set(args.symbol or symbols.keys())

    foregrounds: list[Path] = []
    for key, spec in symbols.items():
        if key not in selected:
            continue
        _, fg_out = split_symbol(root, key, spec)
        foregrounds.append(fg_out)

    if args.contact_sheet:
        make_contact_sheet(foregrounds, resolve_path(root, args.contact_sheet))


if __name__ == "__main__":
    main()
