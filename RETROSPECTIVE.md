# Retrospective

## 2026-06-14 Slot UX Feedback

### Runtime and Project Setup
- Keep the app running on the renamed project path: `C:\Users\hanna\Documents\Codex\baboonbonanza\using-a-similar-method-we-have`.
- After any frontend change, rebuild and verify `http://127.0.0.1:8097/` is serving the current bundle.

### Reference Quality Bar
- Treat top-tier scatter/tumble slots and Hacksaw-style slots as the UX benchmark, especially for spin feel, tumble/drop motion, symbol landing, win emphasis, and number-count animation.
- The slot must feel like an industry-standard slot UI, not a generic Phaser demo.
- Mobile must be first-class and full-screen, with layout/scale close to Dusk Princess: logo/hero at top, machine filling the available center, compact bottom controls.

### Controls and HUD
- The spin button must have a large, forgiving click/tap area. Never let the visible button be larger than the interactive zone.
- Use a standard slot control layout: buy bonus, burger/menu, demo balance, demo bet, bet up/down or plus/minus, autoplay, and a prominent spin control.
- Desktop HUD should match the reference black rectangular control strip. Mobile controls should stay compact like Dusk Princess.
- Remove extra explanatory labels that are not in the target reference UI.
- Put the clock at top left.
- Avoid external runtime dependencies that are not needed by the game, such as the old jQuery CDN include.

### Typography and Styling
- Avoid basic/default fonts. Use bold, arcade/slot-appropriate treatment and match the symbol palette where possible.
- UI text should be readable but compact inside operational panels.

### Symbols and Reel Area
- Symbols must fill their cells properly and be consistently sized.
- For symbols with card/square art, the actual square/card edge should align to the cell edge.
- Extra FX and character parts outside the square can overlap neighboring symbols where appropriate.
- High-pay symbols should not have their borders amended or manually compensated if they come from `spritesheet_updated`; take them as-is.
- The `spritesheet_updated` sheet must be sliced with its real frame geometry. A wrong frame size causes chopped symbols.
- If symbol sizing is changed, verify with screenshots at desktop and mobile sizes before handoff.

### Tumble and Drop Animation
- Non-winning symbols should dim while winning symbols animate.
- Tumble should behave like a slot tumble, not simple disappearance.
- Dropping symbols should be masked so they are only visible inside the machine/reel area.
- Reels/symbol columns should fall in a coherent order; avoid symbols from later reels appearing before earlier reels unless intentionally designed.
- The drop can be aggressive and snappy like Hacksaw references, but do not add camera/screen shake on spin.
- CherryPop-style landing bounce was preferred over the overly plain disappearance behavior.

### Background and Presentation
- Use the provided `background.jpg` as the full-screen background and `logo1.jpg` centered at the top.
- Add background particle effects behind the machine, not over the reels or controls.
- The machine should be sized so the symbol area fills it rather than floating as a tiny board inside a large frame.
- Do not use "good luck" or similar gambling-sendoff copy in slot splash/loading/game UX. Prefer neutral CTAs like "click to continue" and concise feature facts.
- Splash screens should use short feature cards, not dense rules text. Lead with visual mechanics such as max multiplier and max win.

### Current Fix Notes
- Mobile portrait layout should follow Dusk Princess proportions: top hero/logo, machine almost full width starting near the middle third, and compact bottom controls around a large centered spin button.
- Hard rule: non-winning symbols should dim and remain visible during win animation; never fade them so low that they appear to disappear.
- Keep every symbol texture centered on the exact cell center so columns line up vertically.
- Current logo placement should stay on the left side, not centered over the reel area.
- Prefer the two clean source strips `spritesheet_updated 1.jpg` and `spritesheet_updated2.jpg` for symbol cutting: crop one centered square per 5-way strip segment, then save the individual PNGs in `symbols_updated_cut`.
- Spin/camera shake should remain off unless explicitly requested again.
- `spritesheet_updated.jpg` contains square symbols but has extra sheet padding; do not assume every divisor of the full sheet width is a valid frame.
- When cutting `spritesheet_updated.jpg`, export real `256x256` symbol PNGs into `symbols_updated_cut`; do not load it as a Phaser uniform spritesheet because the sheet width contains padding and runtime slicing caused chopped symbols.

### Math Tuning Notes - 2026-06-14
- Avoid over-concentrating wins in the lowest pays. A/K/Q can anchor hit frequency, but tumble refills should use a more balanced symbol profile so drummer/bass/guitar/vocal appear in the paying-symbol mix.
- To add more tumbles without moving hit frequency too much, keep initial-spin weights stable and tune only refill behavior after a win. A controlled sticky refill from surviving board symbols improved cascades while preserving the base hit rate.
- Use a meaningful scatter-count ladder for 8+/10+/12+ wins. The current tuned ladder is `1x / 3x / 8x`; the old `1x / 2x / 3x` flattened larger count wins and left RTP low.
- Validate every math change with simulation before handoff. Latest 1,000,000-spin validation after this pass: RTP `95.69%`, hit rate `22.53%`, cascade hit rate `6.83%`, average tumbles `0.344`, average tumbles on winning spins `1.527`, bonus trigger rate `0.749%`.
- Future games should track paying-symbol mix as a first-class sim metric, not only RTP/hit rate. For this pass the paying mix improved to roughly A/K/Q `~21.7%` each, J/10 `~11.5%` each, drummer/bass `~4%` each, guitar `2.4%`, vocal `1.48%`.

### Math Distribution Target - 2026-06-15
- Use round-level paid-spin outcomes for win distribution bands. A paid spin with base win plus one or more tumbles counts once, using the total round win divided by bet. Do not count individual tumble events as separate distribution rows.
- For future tumble/scatter games, tune the 1x-20x bands toward the reference feel below before polishing rare-event tails. Exact matching is not required, but the low/mid win hit frequency should be close enough that the game has frequent satisfying rounds without overloading only sub-1x outcomes.
- Reference target frequencies by total round win:

| Range | Target frequency |
| --- | ---: |
| 0x-1x | 1 in 6.78 |
| 1x-2x | 1 in 16.09 |
| 2x-3x | 1 in 34.83 |
| 3x-5x | 1 in 36.71 |
| 5x-10x | 1 in 48.39 |
| 10x-20x | 1 in 101.02 |
| 20x-50x | 1 in 207.13 |
| 50x-100x | 1 in 921.66 |
| 100x-200x | 1 in 2,487.56 |
| 200x-500x | 1 in 6,289.31 |
| 500x-1000x | 1 in 35,714.32 |
| 1000x-2000x | 1 in 111,111.22 |
| 2000x-5000x | 1 in 1,000,001.00 |
| 5000x-10000x | not targeted |

- When tuning, prioritize the 1x-2x, 2x-3x, 3x-5x, 5x-10x, and 10x-20x ranges. These are the bands most visible to player feel and should be compared against the Baboon sim and internal reference targets in the PAR workbook.
- Preserve RTP range and bonus behavior while moving the distribution. If improving 1x-20x frequency pushes RTP high, compensate through upper-tail frequency/pay weights rather than making the base game feel dry again.

### Math Tuning Pass - 2026-06-15
- Tuned Baboon Bonanza toward the target 1x-20x distribution, then rebalanced the RTP split so the base game contributes about `65%` RTP and the bonus feature carries the remaining value.
- Updated 8+/10+/12+ pay boosts from `1x / 3x / 8x` to `1x / 2.2x / 4.5x` so 8+ wins pay meaningfully while avoiding too much 12+ tail inflation.
- Current symbol pays: A `0.642x`, K `0.7704x`, Q `0.8988x`, J `1.284x`, 10 `1.7976x`, drummer `2.14x`, bass `2.996x`, guitar `3.852x`, vocal `5.35x`.
- Set base bonus symbol chance to `1.75%` per cell and bonus-mode bonus chance to `3.8%` per cell, while keeping the feature promise: minimum `5x` feature win and `20%` of bonus rounds targeted to `3x` the 100x buy price.
- Latest 1,000,000-spin validation after this pass: RTP `96.48%`, base RTP `65.10%`, feature RTP `31.37%`, hit rate `23.04%`, cascade hit rate `8.86%`, average tumbles `0.425`, average tumbles on winning spins `1.843`, bonus trigger rate `0.318%` or `1 in 314.17`.
- Resulting round-level distribution: `1x-2x` is `1 in 18.26`, `2x-3x` is `1 in 38.99`, `3x-5x` is `1 in 43.40`, `5x-10x` is `1 in 53.80`, and `10x-20x` is tracked in the PAR workbook with RTP contribution per bin.

### Bonus Buy Calibration - 2026-06-15
- A 100 standard bonus-buy reference scan produced 100 feature results and 1,997 board snapshots. Treat this as directional because 100 buys is still a small sample for bonus variance.
- Observed reference bonus board mix was low-symbol heavy: low 1 `14.64%`, low 2 `14.11%`, low 3 `13.84%`, low 4 `12.54%`, low 5 `10.57%`, high 1 `7.95%`, high 2 `7.59%`, high 3 `7.53%`, high 4 `4.21%`, multiplier `4.27%`, scatter `2.73%`.
- Bonus-mode reels should be configured separately from base-game reels. Reusing base weights for the first bonus board makes the feature feel wrong even if total RTP is acceptable.
- For standard buys, avoid forcing a 20% boosted target at 3x buy price unless reference data supports it. The observed 100-buy distribution was mostly below the buy price: `68%` under `1x buy`, `20%` at `1x-2x buy`, `9%` at `2x-3x buy`, and `3%` at `3x-5x buy`.
- Updated Baboon Bonanza bonus-mode multiplier-symbol chance to `4.27%` per cell and added explicit bonus initial/tumble symbol weights from the reference board mix.
- Latest 1,000,000-spin validation after the bonus-buy calibration: RTP `95.56%`, base RTP `64.59%`, feature RTP `30.97%`, hit rate `22.96%`, cascade hit rate `8.79%`, average tumbles `0.425`, average tumbles on winning spins `1.852`, bonus trigger rate `0.311%` or about `1 in 321.96`, average feature win `99.70x`.
- Correction: Baboon Bonanza bonus multipliers must include the high-end bomb values up to `100x`; do not cap the ladder at `15x`. Current ladder is `2x, 3x, 4x, 5x, 8x, 10x, 12x, 15x, 20x, 25x, 50x, 100x`, with the `50x` and `100x` values very rare.
- Latest 1,000,000-spin validation after restoring the full multiplier ladder: RTP `95.52%`, base RTP `65.23%`, feature RTP `30.29%`, bonus trigger rate about `1 in 316.96`, average feature win `96.01x`.
- Added a controlled max-win event inside bonus mode instead of inflating normal multiplier weights. Target is a `10,000x` paid-round cap at roughly `1 in 1.1M` paid spins; with bonus HF around `1 in 316`, this maps to about `1 in 3,500` bonus features.
- Final 100,000,000-spin validation after adding and balancing the max-win event: RTP `95.61%`, base RTP `64.79%`, feature RTP `30.82%`, hit rate `22.97%`, bonus HF `1 in 316.16`, max-win events `88`, max-win HF `1 in 1,136,363.64`, max-win feature HF `1 in 3,594.24`, max win `10,000x`, variance `140.00`, standard deviation `11.83x`.

### Math Integrity Hard Rules - 2026-06-17
- Paid outcomes must be symbol-derived. Do not add post-round bonus targets, end-of-feature top-ups, fake max-win grants, or any direct balance/totalWin adjustment that cannot be explained by resolved symbols, multipliers, and documented game caps.
- Bonus-game tuning must be done through actual weight tables: bonus symbol frequency, symbol weights, tumble/refill weights, multiplier ladder weights, pays, and feature trigger rates.
- Controlled max-win injection is acceptable only when it draws an actual board that resolves through the existing game mechanics. The board pattern, frequency, multiplier values, and cap must be visible in the PAR.
- Losing-spin bonus anticipation is acceptable, but it must not create a paid result unless a normal paying tumble exists. Bonus multipliers only apply when real multiplier symbols are present in a paying tumble.
- The forbidden pattern is a fake bonus top-up: adding money at feature end that cannot be reconstructed from the board, paytable, multipliers, and cap.
- Current code cleanup removed `applyBonusWinTarget()` and `prepareBonusMathTarget()`. The rare max-win path now uses a scripted Baboon board with real premium symbols and real multiplier symbols, and the PAR exposes that board.

### Frontend Hardening Notes - 2026-06-18
- During win focus, non-winning symbols must dim through the symbol art layers only. Do not leave shader/wash rectangles visible, because masked square overlays read as broken symbol art.
- Bonus transition information needs short copy, clamped text sizes, and generous title/body spacing at every viewport. If copy overlaps once, shorten it rather than relying only on smaller fonts.
- Bonus mode should expose an accumulated feature win HUD while the feature is active. Keep it separate from base balance/bet/free-spins labels and hide it in base game.
- Splash-screen overlays and vignettes must be anchored to live viewport bounds after resize/fullscreen changes. Do not reuse centered rectangles that can drift or appear as black bands.
- Splash-to-base transitions should not start a cold heavy scene after the user clicks. Preload all slot assets during the loading scene and, where practical, launch/create the slot scene behind the splash so click-to-play only removes the splash layer.
- Desktop side characters should be positioned behind and partially overlapped by the machine when requested, with placement derived from current board bounds instead of fixed screen offsets.
- Bonus entry transitions are base-game only. In feature mode, 4+ bonus symbols must never retrigger the entry overlay or reset free spins, including on the final free spin where the counter has already reached zero.
- Any state rule that controls feature entry/exit should live in a small pure helper with regression tests before being wired into Phaser scene animation code.
- Losing-spin bonus anticipation should be decided before the board is rendered and dropped. Never destroy and replace a visible landed symbol to create anticipation; the player should only see the final board.
- Bonus multiplier presentation must be gated on visible impact. If the rounded displayed after-value is not greater than the displayed before-value, skip multiplier fly-ins, skip the second count-up, and do not pop multiplier symbols.
- Add a bonus-buy presentation regression for multiplier games: record the exact frontend before/after display values for every multiplier event and fail the pipeline if a presented multiplier has `after <= before` or a suppressed multiplier has `after > before`.
