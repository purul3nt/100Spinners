# Symbol Layer Split Workflow

This workflow creates two images for each animated symbol:

- `<symbol>_bg.png`: the framed tile/background with the foreground shape filled in.
- `<symbol>_fg.png`: a transparent foreground cutout that can animate separately.

The game uses these layers for `a`, `k`, `q`, `j`, `ten`, and the test high-pay `guitar` so the tile drops normally, then the foreground gets a small delayed landing bounce.

## Run

From the project root:

```powershell
npm run symbols:layers
```

Or run the script directly:

```powershell
& "C:\Users\hanna\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\split_symbol_layers.py --contact-sheet src\assets\baboon_bonus\symbols_updated_cut\layered_symbol_fg_contact.png
```

## Configure Masks

Edit `scripts/symbol_layer_masks.json`.

Each symbol has:

- `source`: original full symbol PNG.
- `background`: generated background output.
- `foreground`: generated transparent foreground output.
- `bgDilate`: expands the fill area behind the foreground.
- `diffusionIterations`: more iterations make the fill smoother.
- `shapes`: simple mask operations.

Supported shape types:

- `rect`
- `rounded_rect`
- `ellipse`
- `polygon`

Supported operations:

- `add`
- `subtract`

## Game Integration

Layered symbols are listed in `LAYERED_SYMBOL_KEYS` in `src/scenes/SlotScene.ts`.

For each key, Phaser loads:

- `symbol_<key>_bg`
- `symbol_<key>_fg`

The cell renderer treats both layers as one symbol for movement, dimming, popping, reel masking, and cleanup.
