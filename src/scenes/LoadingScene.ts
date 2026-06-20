import "phaser";

const UI_FONT = "Impact, Haettenschweiler, 'Arial Black', sans-serif";
const BODY_FONT = "'Trebuchet MS', Arial, sans-serif";
const SYMBOL_KEYS = ["a", "k", "q", "j", "ten", "drummer", "bass", "guitar", "vocal"];
const LAYERED_SYMBOL_KEYS = ["a", "k", "q", "j", "ten", "guitar", "drummer", "bass", "vocal"];
const ROCKING_FRAME_PATH = "src/assets/baboon_bonus/baboon_rocking";
const CHILL_FRAME_PATH = "src/assets/baboon_bonus/baboon_rock_chill";
const SAMURAI_IDLE_FRAME_PATH = "src/assets/game/samurai/Idle_samurai";
const SAMURAI_SLASH_FRAME_PATH = "src/assets/game/samurai/slash_Samurai";
const SHOGUN_HIGH_SYMBOLS = ["sym_high_01", "sym_high_02", "sym_high_03", "sym_high_04", "sym_high_05"];
const SHOGUN_LOW_SYMBOLS = ["sym_low_01", "sym_low_02", "sym_low_03", "sym_low_04", "sym_low_05"];
const SAMURAI_FRAME_FILES = [
  "ezgif-frame-001.png",
  "ezgif-frame-002.png",
  "ezgif-frame-003.png",
  "ezgif-frame-004.png",
  "ezgif-frame-005.png",
  "ezgif-frame-006.png",
  "ezgif-frame-007.png",
  "ezgif-frame-008.png",
  "ezgif-frame-011.png",
  "ezgif-frame-012.png",
  "ezgif-frame-013.png",
  "ezgif-frame-014.png",
  "ezgif-frame-015.png",
  "ezgif-frame-016.png",
  "ezgif-frame-017.png",
  "ezgif-frame-018.png",
  "ezgif-frame-019.png",
  "ezgif-frame-020.png",
  "ezgif-frame-021.png",
  "ezgif-frame-022.png",
  "ezgif-frame-023.png",
  "ezgif-frame-024.png",
  "ezgif-frame-025.png",
  "ezgif-frame-026.png",
  "ezgif-frame-027.png",
  "ezgif-frame-028.png",
  "ezgif-frame-029.png",
  "ezgif-frame-030.png"
];
const ROCKING_FRAME_FILES = [
  "ezgif-frame-013.png",
  "ezgif-frame-014.png",
  "ezgif-frame-015.png",
  "ezgif-frame-016.png",
  "ezgif-frame-017.png",
  "ezgif-frame-018.png",
  "ezgif-frame-019.png",
  "ezgif-frame-020.png",
  "ezgif-frame-021.png",
  "ezgif-frame-022.png",
  "ezgif-frame-023.png",
  "ezgif-frame-024.png",
  "ezgif-frame-025.png",
  "ezgif-frame-026.png",
  "ezgif-frame-027.png",
  "ezgif-frame-028.png",
  "ezgif-frame-029.png",
  "ezgif-frame-030.png"
];
const CHILL_FRAME_FILES = [
  "ezgif-frame-001.png",
  "ezgif-frame-002.png",
  "ezgif-frame-003.png",
  "ezgif-frame-004.png",
  "ezgif-frame-005.png",
  "ezgif-frame-006.png",
  "ezgif-frame-007.png",
  "ezgif-frame-008.png",
  "ezgif-frame-009.png",
  "ezgif-frame-010.png",
  "ezgif-frame-011.png",
  "ezgif-frame-012.png",
  "ezgif-frame-013.png",
  "ezgif-frame-014.png",
  "ezgif-frame-015.png",
  "ezgif-frame-016.png",
  "ezgif-frame-017.png",
  "ezgif-frame-018.png",
  "ezgif-frame-019.png",
  "ezgif-frame-020.png",
  "ezgif-frame-021.png",
  "ezgif-frame-022.png",
  "ezgif-frame-023.png",
  "ezgif-frame-024.png",
  "ezgif-frame-025.png",
  "ezgif-frame-026.png",
  "ezgif-frame-027.png",
  "ezgif-frame-028.png",
  "ezgif-frame-029.png",
  "ezgif-frame-030.png"
];

export default class LoadingScene extends Phaser.Scene {
  private logo?: Phaser.GameObjects.Image;
  private barFill?: Phaser.GameObjects.Rectangle;
  private percentText?: Phaser.GameObjects.Text;

  constructor() {
    super("Loading");
  }

  preload() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#000000");

    const title = this.add.text(width / 2, height * 0.28, "LOADING", {
      fontFamily: UI_FONT,
      fontSize: Math.max(42, Math.min(86, width * 0.058)) + "px",
      color: "#facc15",
      stroke: "#4c1d95",
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0.9);

    const barW = Math.min(width * 0.58, 620);
    const barH = Math.max(12, Math.min(22, height * 0.018));
    this.add.rectangle(width / 2, height * 0.72, barW, barH, 0x000000, 0.92)
      .setStrokeStyle(2, 0x38bdf8, 0.72);
    this.barFill = this.add.rectangle(width / 2 - barW / 2, height * 0.72, 1, barH - 4, 0xfacc15, 1)
      .setOrigin(0, 0.5);
    this.percentText = this.add.text(width / 2, height * 0.76, "0%", {
      fontFamily: BODY_FONT,
      fontSize: Math.max(14, Math.min(22, width * 0.018)) + "px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.load.image("llamaplay_logo", "src/assets/baboon_bonus/llamaplay_logo.png?v=llamaplay-1");
    this.load.image("splash_transition", "src/assets/baboon_bonus/transition.jpg?v=splash-transition-1");
    this.load.image("splash_logo", "src/assets/baboon_bonus/logo_updated.png?v=splash-logo-1");
    this.load.image("splash_bonus_symbol", "src/assets/baboon_bonus/symbols_updated_cut/bonus.png?v=splash-symbols-1");
    this.load.image("splash_top_symbol", "src/assets/baboon_bonus/symbols_updated_cut/guitar.png?v=splash-symbols-1");
    this.preloadSlotAssets();

    this.load.on("filecomplete-image-llamaplay_logo", () => this.showLogo(width, height));
    this.load.on("progress", (value: number) => {
      if (this.barFill) this.barFill.width = Math.max(1, barW * value);
      if (this.percentText) this.percentText.setText(Math.round(value * 100) + "%");
    });
    this.load.on("complete", () => {
      if (this.barFill) this.barFill.width = barW;
      if (this.percentText) this.percentText.setText("100%");
      this.tweens.add({ targets: title, alpha: 0.55, duration: 260, yoyo: true, repeat: 1 });
    });
  }

  private preloadSlotAssets() {
    const symbolBase = "src/assets/baboon_bonus/symbols_updated_cut";
    SYMBOL_KEYS.forEach((key) => this.load.image(`symbol_${key}`, `${symbolBase}/${key}.png?v=white-highpay-1`));
    LAYERED_SYMBOL_KEYS.forEach((key) => {
      this.load.image(`symbol_${key}_bg`, `${symbolBase}/${key}_bg.png?v=layered-symbols-2`);
      this.load.image(`symbol_${key}_fg`, `${symbolBase}/${key}_fg.png?v=layered-symbols-2`);
    });
    this.load.image("symbol_bonus", `${symbolBase}/bonus.png?v=white-highpay-1`);
    this.load.image("bg_base", "src/assets/baboon_bonus/base_background.jpg");
    this.load.image("bg_bonus", "src/assets/baboon_bonus/bonus_background.png");
    this.load.image("shogun_background", "src/assets/game/shogun_background.jpg?v=shogun-art-1");
    this.load.image("shogun_background_clouds", "src/assets/game/background_clouds.png?v=shogun-clouds-1");
    this.load.image("shogun_reel_frame", "src/assets/game/shogun_reel_frame.png?v=shogun-art-1");
    this.load.image("shogun_logo", "src/assets/game/1000_spinners_logo.png?v=shogun-logo-1");
    this.load.image("logo_main", "src/assets/baboon_bonus/logo_updated.png");
    this.load.image("bonus_transition", "src/assets/baboon_bonus/transition.jpg?v=bonus-transition-1");
    SHOGUN_HIGH_SYMBOLS.forEach((key) => this.load.image(`shogun_${key}`, `src/assets/game/symbols_high/${key}.png?v=shogun-symbols-4`));
    SHOGUN_LOW_SYMBOLS.forEach((key) => this.load.image(`shogun_${key}`, `src/assets/game/symbols_low/${key}.png?v=shogun-low-round-restore-1`));
    this.load.image("shogun_wheel", "src/assets/game/symbols_special/shuriken_wheel.png?v=shogun-wheel-1");
    SAMURAI_FRAME_FILES.forEach((file) => {
      const frame = file.match(/(\d+)\.png$/)?.[1] || file;
      this.load.image(`samurai_idle_${frame}`, `${SAMURAI_IDLE_FRAME_PATH}/${file}?v=samurai-idle-1`);
      this.load.image(`samurai_slash_${frame}`, `${SAMURAI_SLASH_FRAME_PATH}/${file}?v=samurai-slash-1`);
    });
    ROCKING_FRAME_FILES.forEach((file, index) => this.load.image(`baboon_rocking_${index}`, `${ROCKING_FRAME_PATH}/${file}?v=rocking-frames-3`));
    CHILL_FRAME_FILES.forEach((file, index) => this.load.image(`baboon_chill_${index}`, `${CHILL_FRAME_PATH}/${file}?v=chill-frames-2`));
    const uiBase = "src/assets/game";
    this.load.image("ui_btn_spin", `${uiBase}/buttonspin.png`);
    this.load.image("ui_btn_plus", `${uiBase}/buttonplus.png`);
    this.load.image("ui_btn_minus", `${uiBase}/buttonminus.png`);
    this.load.image("ui_btn_auto", `${uiBase}/AutoplayButton.png`);
    this.load.image("ui_btn_max", `${uiBase}/MaxBetButton.png`);
  }

  create() {
    this.time.delayedCall(850, () => {
      this.cameras.main.fadeOut(360, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Splash"));
    });
  }

  private showLogo(width: number, height: number) {
    this.logo = this.add.image(width / 2, height * 0.49, "llamaplay_logo").setOrigin(0.5).setAlpha(0);
    const maxW = Math.min(width * 0.52, 520);
    const maxH = Math.min(height * 0.24, 260);
    const scale = Math.min(maxW / this.logo.width, maxH / this.logo.height);
    this.logo.setScale(scale);
    this.tweens.add({
      targets: this.logo,
      alpha: 1,
      scaleX: scale * 1.04,
      scaleY: scale * 1.04,
      duration: 520,
      ease: "Sine.Out",
    });
  }
}
