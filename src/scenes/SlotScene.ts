import "phaser";
import {
  BUY_BONUS_PRICE_MULTIPLIER,
  CellResult,
  COLS,
  DEFAULT_BET,
  FREE_SPINS,
  LineWin,
  PAYLINES,
  ROWS,
  SYMBOL_BY_CODE,
  SYMBOLS,
  SymbolCode,
  SpinResult,
  buyBonus,
  playPaidSpin,
} from "../sixsixsixMath";

const UI_FONT = "Impact, Haettenschweiler, 'Arial Black', sans-serif";
const BODY_FONT = "'Trebuchet MS', Arial, sans-serif";
const UI_PALETTE = {
  parchment: 0xC1B39E,
  beige: 0xBAAC97,
  taupe: 0x9F9280,
  armour: 0x645D57,
  charcoal: 0x302A26,
  ink: 0x211E1C,
  darkBrown: 0x3D3430,
  leather: 0x715744,
  bronze: 0x8C6B53,
  redBrown: 0x633733,
  copper: 0xAA8068,
  peach: 0xD8AF8E,
  green: 0x394531,
  sage: 0x7A8263,
  sakura: 0xC86A5E,
};
const UI_HEX = {
  parchment: "#C1B39E",
  beige: "#BAAC97",
  taupe: "#9F9280",
  armour: "#645D57",
  charcoal: "#302A26",
  ink: "#211E1C",
  darkBrown: "#3D3430",
  leather: "#715744",
  bronze: "#8C6B53",
  redBrown: "#633733",
  copper: "#AA8068",
  peach: "#D8AF8E",
  green: "#394531",
  sage: "#7A8263",
  sakura: "#C86A5E",
};
const CELL = 118;
const REEL_FRAME_W = 1376;
const REEL_FRAME_H = 768;
const REEL_FRAME_ASPECT = REEL_FRAME_W / REEL_FRAME_H;
const REEL_FRAME_BASE_H = ROWS * CELL + 96;
const REEL_FRAME_BASE_W = REEL_FRAME_BASE_H * REEL_FRAME_ASPECT;
const REEL_CENTER_X = [184, 449, 704, 949, 1198].map((x) => x / REEL_FRAME_W);
const ROW_CENTER_Y = [0.188, 0.396, 0.604, 0.812];
const CLOUD_DRIFT_PIXELS_PER_SECOND = 9;
const CHERRY_BLOSSOM_PETAL_KEY = "generated_cherry_blossom_petal";
const SAMURAI_IDLE_FRAME_IDS = [
  "001",
  "003",
  "004",
  "005",
  "007",
  "008",
  "010",
  "011",
  "012",
  "014",
  "015",
  "016",
  "018",
  "019",
  "020",
  "022",
  "023",
  "025",
  "027",
  "028",
  "029",
  "030",
];
const SAMURAI_SLASH_FRAME_IDS = [
  "001",
  "002",
  "003",
  "004",
  "005",
  "006",
  "007",
  "008",
  "011",
  "012",
  "013",
  "014",
  "015",
  "016",
  "017",
  "018",
  "019",
  "020",
  "021",
  "022",
  "023",
  "024",
  "025",
  "026",
  "027",
  "028",
  "029",
  "030",
];
const SAMURAI_MOOD_BASE_HEIGHT: Record<SamuraiMood, number> = {
  idle: 768,
  slash: 1440,
};
const SAMURAI_MOOD_SCALE: Record<SamuraiMood, number> = {
  idle: 1,
  slash: 1,
};
const SAMURAI_MOOD_X_OFFSET: Record<SamuraiMood, number> = {
  idle: 0,
  slash: 0,
};
const SAMURAI_MOOD_Y_OFFSET: Record<SamuraiMood, number> = {
  idle: 0,
  slash: 0,
};
const SYMBOL_IMAGE_SCALE = 1.1;
const LOW_PAY_IMAGE_SCALE = 1.2;
const TEN_SYMBOL_EXTRA_SCALE = 1.15;
const TEN_SYMBOL_GREY_TINT = 0xd9d9d9;
const TEN_SYMBOL_GREY_TEXTURE = "shogun_sym_low_05_grey_15";
const REEL_START_STAGGER_MS = 42;
const SLAM_STOP_REEL_STAGGER_MS = 55;
const SLAM_STOP_MIN_SPIN_MS = 180;
const STOPPED_SYMBOL_Y_OFFSET = -5;
const WHEEL_VALUES = [2, 3, 5, 8, 10, 15, 20, 50];
const SPIN_SYMBOL_CODES: SymbolCode[] = ["H1", "H2", "H3", "H4", "H5", "L1", "L2", "L3", "L4", "L5", "W1"];
const SYMBOL_IMAGE_KEYS: Partial<Record<SymbolCode, string>> = {
  H1: "shogun_sym_high_01",
  H2: "shogun_sym_high_02",
  H3: "shogun_sym_high_03",
  H4: "shogun_sym_high_04",
  H5: "shogun_sym_high_05",
  L1: "shogun_sym_low_01",
  L2: "shogun_sym_low_02",
  L3: "shogun_sym_low_03",
  L4: "shogun_sym_low_04",
  L5: "shogun_sym_low_05",
};

type SymbolView = {
  container: Phaser.GameObjects.Container;
  bg?: Phaser.GameObjects.Graphics | Phaser.GameObjects.Rectangle;
  label?: Phaser.GameObjects.Text;
  image?: Phaser.GameObjects.Image;
  multiplier?: Phaser.GameObjects.Text | Phaser.GameObjects.Container;
};

type SamuraiMood = "idle" | "slash";

export default class SlotScene extends Phaser.Scene {
  private balance = 5000;
  private bet = DEFAULT_BET;
  private lastWin = 0;
  private spinning = false;
  private slamStopAvailable = false;
  private slamStopRequested = false;
  private activeReelStops: Array<(() => void) | undefined> = [];
  private grid: CellResult[][] = [];
  private symbolViews: SymbolView[][] = [];
  private reelMaskShapes: Phaser.GameObjects.Graphics[] = [];
  private reelMasks: Phaser.Display.Masks.GeometryMask[] = [];
  private lineGraphics!: Phaser.GameObjects.Graphics;
  private boardFrame!: Phaser.GameObjects.Rectangle;
  private reelBackingTint!: Phaser.GameObjects.Graphics;
  private reelFrame!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private balanceText!: Phaser.GameObjects.Text;
  private betText!: Phaser.GameObjects.Text;
  private winText!: Phaser.GameObjects.Text;
  private logoImage!: Phaser.GameObjects.Image;
  private uiBar!: Phaser.GameObjects.Rectangle;
  private betPanel!: Phaser.GameObjects.Rectangle;
  private spinButton!: Phaser.GameObjects.Container;
  private spinButtonBg!: Phaser.GameObjects.Arc;
  private spinButtonText!: Phaser.GameObjects.Text;
  private spinHitZone!: Phaser.GameObjects.Zone;
  private buyButton!: Phaser.GameObjects.Container;
  private buyButtonBg!: Phaser.GameObjects.Arc;
  private buyButtonText!: Phaser.GameObjects.Text;
  private menuButton!: Phaser.GameObjects.Container;
  private menuButtonBg!: Phaser.GameObjects.Rectangle;
  private betUpText!: Phaser.GameObjects.Text;
  private betDownText!: Phaser.GameObjects.Text;
  private betMinusButton!: Phaser.GameObjects.Image;
  private betPlusButton!: Phaser.GameObjects.Image;
  private autoButton!: Phaser.GameObjects.Image;
  private autoButtonBg!: Phaser.GameObjects.Arc;
  private autoButtonText!: Phaser.GameObjects.Text;
  private autoButtonShell!: Phaser.GameObjects.Container;
  private maxBetButton!: Phaser.GameObjects.Image;
  private bonusPanel?: Phaser.GameObjects.Container;
  private bonusCollectDisplay?: Phaser.GameObjects.Container;
  private bonusCollectPanel?: Phaser.GameObjects.Rectangle;
  private bonusCollectText?: Phaser.GameObjects.Text;
  private bonusSpinText?: Phaser.GameObjects.Text;
  private bonusCurrentSpin = 0;
  private bonusTotalSpins = 0;
  private wheelOverlay?: Phaser.GameObjects.Container;
  private rulesOverlay?: Phaser.GameObjects.Container;
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundClouds?: Phaser.GameObjects.TileSprite;
  private backgroundPetals?: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private backgroundPetalEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private samuraiFx?: Phaser.GameObjects.Sprite;
  private samuraiMood: SamuraiMood = "idle";
  private samuraiTransitionBits: Phaser.GameObjects.Arc[] = [];
  private frameLeft = 0;
  private frameTop = 0;
  private frameW = 0;
  private frameH = 0;
  private scaleFactor = 1;

  constructor() {
    super("Slot_Scene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#151018");
    this.createBackground();
    this.createHud();
    this.createBoard();
    this.createSamuraiFx();
    this.layoutScene();
    this.scale.on("resize", this.layoutScene, this);
    this.newIdleGrid();
  }

  private createBackground() {
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    this.backgroundImage = this.add.image(width / 2, height / 2, "shogun_background").setDepth(-6).setAlpha(0.96);
    this.backgroundClouds = this.add.tileSprite(width / 2, height / 2, width, height, "shogun_background_clouds")
      .setDepth(-5.5)
      .setAlpha(0.72);
    this.add.rectangle(width / 2, height / 2, width, height, 0x180f0a, 0.18).setDepth(-5);
    this.createCherryBlossomParticles(width, height);
  }

  update(_time: number, delta: number) {
    if (!this.backgroundClouds) return;
    this.backgroundClouds.tilePositionX += CLOUD_DRIFT_PIXELS_PER_SECOND * (delta / 1000);
  }

  private createHud() {
    this.titleText = this.add.text(0, 0, "1000 SHOGUN SPINNERS", {
      fontFamily: UI_FONT,
      fontSize: "1px",
      color: "#ffffff",
    }).setOrigin(0.5).setVisible(false);
    this.logoImage = this.add.image(0, 0, "shogun_logo").setOrigin(0, 0).setDepth(30);

    this.uiBar = this.add.rectangle(0, 0, 1, 1, 0x050505, 0.74)
      .setOrigin(0, 0)
      .setDepth(40);
    this.betPanel = this.add.rectangle(0, 0, 1, 1, 0x181818, 0.96)
      .setDepth(58)
      .setStrokeStyle(3, 0x050505, 1);

    this.balanceText = this.createHudText("BALANCE 0.00");
    this.betText = this.createHudText("BET 1.00");
    this.winText = this.createHudText("WIN 0.00");

    this.betMinusButton = this.add.image(0, 0, "ui_btn_minus").setDepth(68).setInteractive({ useHandCursor: true });
    this.betPlusButton = this.add.image(0, 0, "ui_btn_plus").setDepth(68).setInteractive({ useHandCursor: true });
    this.betMinusButton.on("pointerdown", () => this.adjustBet(-1));
    this.betPlusButton.on("pointerdown", () => this.adjustBet(1));
    this.betMinusButton.setVisible(false);
    this.betPlusButton.setVisible(false);

    this.betUpText = this.add.text(0, 0, "\u25B2", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "30px",
      color: "#ffffff",
      stroke: "#111111",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(72).setInteractive({ useHandCursor: true });
    this.betDownText = this.add.text(0, 0, "\u25BC", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "30px",
      color: "#ffffff",
      stroke: "#111111",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(72).setInteractive({ useHandCursor: true });
    this.betUpText.on("pointerdown", () => this.adjustBet(1));
    this.betDownText.on("pointerdown", () => this.adjustBet(-1));

    this.autoButton = this.add.image(0, 0, "ui_btn_auto").setDepth(66).setInteractive({ useHandCursor: true });
    this.maxBetButton = this.add.image(0, 0, "ui_btn_max").setDepth(66).setInteractive({ useHandCursor: true });
    this.autoButton.on("pointerdown", () => this.spin());
    this.maxBetButton.on("pointerdown", () => this.setMaxBet());
    this.autoButton.setVisible(false);
    this.maxBetButton.setVisible(false);

    this.autoButtonBg = this.add.circle(0, 0, 28, 0x242424, 0.98)
      .setInteractive({ useHandCursor: true });
    this.autoButtonText = this.add.text(0, -1, "\u21BB", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "31px",
      color: "#ffffff",
    }).setOrigin(0.5);
    this.autoButtonShell = this.add.container(0, 0, [this.autoButtonBg, this.autoButtonText]).setDepth(74);
    this.autoButtonBg.on("pointerdown", () => this.spin());
    this.autoButtonBg.on("pointerover", () => this.autoButtonShell.setScale(1.05));
    this.autoButtonBg.on("pointerout", () => this.autoButtonShell.setScale(1));

    this.buyButtonBg = this.add.circle(0, 0, 34, 0xf2d7f0, 1).setStrokeStyle(3, 0x111111, 1);
    this.buyButtonText = this.add.text(0, 0, "BUY\nBONUS", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "13px",
      color: "#111111",
      align: "center",
      stroke: "#ffffff",
      strokeThickness: 1,
    }).setOrigin(0.5);
    this.buyButton = this.add.container(0, 0, [this.buyButtonBg, this.buyButtonText]).setDepth(70);
    this.buyButtonBg.setInteractive({ useHandCursor: true });
    this.buyButtonBg.on("pointerdown", () => this.openBuyBonus());
    this.buyButtonBg.on("pointerover", () => this.buyButton.setScale(1.05));
    this.buyButtonBg.on("pointerout", () => this.buyButton.setScale(1));

    this.menuButtonBg = this.add.rectangle(0, 0, 58, 58, 0x151515, 0.92)
      .setStrokeStyle(0, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    const menuBars = [-13, 0, 13].map((y) => this.add.rectangle(0, y, 30, 5, 0xffffff, 1).setOrigin(0.5));
    this.menuButton = this.add.container(0, 0, [this.menuButtonBg, ...menuBars]).setDepth(70);
    this.menuButtonBg.on("pointerdown", () => this.showRulesMenu());
    this.menuButtonBg.on("pointerover", () => this.menuButton.setScale(1.05));
    this.menuButtonBg.on("pointerout", () => this.menuButton.setScale(1));

    this.spinButtonBg = this.add.circle(0, 0, 56, 0x242424, 0.98).setStrokeStyle(9, 0xffffff, 1);
    this.spinButtonText = this.add.text(1, 0, "\u21BB", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "64px",
      color: "#ffffff",
    }).setOrigin(0.5);
    this.spinButton = this.add.container(0, 0, [this.spinButtonBg, this.spinButtonText]).setDepth(76);
    this.spinHitZone = this.add.zone(0, 0, 1, 1).setOrigin(0, 0).setDepth(112).setInteractive({ useHandCursor: true });
    this.spinHitZone.on("pointerdown", () => this.handleSpinButton());
    this.spinHitZone.on("pointerover", () => this.spinButton.setScale(1.05));
    this.spinHitZone.on("pointerout", () => this.spinButton.setScale(1));
    this.updateHud();
  }

  private createHudText(text: string) {
    return this.add.text(0, 0, text, {
      fontFamily: BODY_FONT,
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(66).setShadow(2, 2, "rgba(0,0,0,0.85)", 2, true, true);
  }

  private createModalButton(text: string, color: number, callback: () => void) {
    const bg = this.add.rectangle(0, 0, 142, 48, color, 1)
      .setStrokeStyle(4, UI_PALETTE.ink, 1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -1, text, {
      fontFamily: UI_FONT,
      fontSize: "25px",
      color: UI_HEX.ink,
    }).setOrigin(0.5);
    const container = this.add.container(0, 0, [bg, label]);
    bg.on("pointerdown", callback);
    bg.on("pointerover", () => container.setScale(1.04));
    bg.on("pointerout", () => container.setScale(1));
    return container;
  }

  private createBoard() {
    this.boardFrame = this.add.rectangle(0, 0, 1, 1, 0x050816, 0.72)
      .setOrigin(0, 0)
      .setStrokeStyle(4, 0xb99345, 0.64);
    this.reelFrame = this.add.image(0, 0, "shogun_reel_frame").setDepth(7);
    this.reelBackingTint = this.add.graphics().setDepth(7.35);
    this.lineGraphics = this.add.graphics().setDepth(12);
  }

  private createSamuraiFx() {
    const idleFrameKeys = SAMURAI_IDLE_FRAME_IDS.map((frame) => ({ key: `samurai_idle_${frame}` }));
    const slashFrameKeys = SAMURAI_SLASH_FRAME_IDS.map((frame) => ({ key: `samurai_slash_${frame}` }));
    if (!this.anims.exists("samurai_idle_loop")) {
      this.anims.create({
        key: "samurai_idle_loop",
        frames: idleFrameKeys as any,
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists("samurai_slash_once")) {
      this.anims.create({
        key: "samurai_slash_once",
        frames: slashFrameKeys as any,
        frameRate: 15,
        repeat: 0,
      });
    }
    this.samuraiFx = this.add.sprite(0, 0, "samurai_idle_001")
      .setOrigin(0.5, 1)
      .setDepth(6.75)
      .setVisible(false);
    this.setSamuraiMood("idle", true);
  }

  private setSamuraiMood(mood: SamuraiMood, force = false) {
    if (!this.samuraiFx) return;
    if (!force && this.samuraiMood === mood) return;
    const shouldTransition = !force && this.samuraiFx.visible;
    this.samuraiMood = mood;
    this.samuraiFx.play(mood === "slash" ? "samurai_slash_once" : "samurai_idle_loop", true);
    this.refreshSamuraiLayout();
    if (shouldTransition) this.playSamuraiMoodTransition();
  }

  private refreshSamuraiLayout() {
    if (!this.samuraiFx) return;
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    this.layoutSamuraiFx(width, height);
  }

  private layoutSamuraiFx(width: number, height: number) {
    if (!this.samuraiFx) return;
    const portrait = height > width * 1.05;
    const boardRight = this.frameLeft + this.frameW;
    const boardBottom = this.frameTop + this.frameH;
    const footerTop = this.uiBar ? this.uiBar.y : height;
    const availableRight = Math.max(0, width - boardRight);
    const targetHeight = portrait
      ? Math.min(height * 0.45, width * 0.82, this.frameH * 0.95)
      : Math.min(this.frameH * 1.06, height * 0.72, Math.max(360, availableRight * 1.55));
    const scale = (targetHeight / SAMURAI_MOOD_BASE_HEIGHT[this.samuraiMood]) * SAMURAI_MOOD_SCALE[this.samuraiMood];
    const x = portrait
      ? this.frameLeft + this.frameW * 0.86
      : (availableRight > 120 ? boardRight + Math.max(availableRight * 0.38, this.frameW * 0.055) : this.frameLeft + this.frameW * 0.92);
    const y = portrait
      ? Math.min(footerTop + targetHeight * 0.08, boardBottom + targetHeight * 0.14)
      : Math.min(footerTop + targetHeight * 0.18, boardBottom + targetHeight * 0.18);
    this.samuraiFx
      .setVisible(true)
      .setAlpha(0.86)
      .setPosition(
        x + this.frameW * 0.035 * SAMURAI_MOOD_X_OFFSET[this.samuraiMood],
        y + this.frameH * 0.035 * SAMURAI_MOOD_Y_OFFSET[this.samuraiMood],
      )
      .setScale(scale);
  }

  private playSamuraiMoodTransition() {
    if (!this.samuraiFx || !this.samuraiFx.visible) return;
    this.tweens.killTweensOf(this.samuraiFx);
    this.samuraiTransitionBits = this.samuraiTransitionBits.filter((bit) => bit.active);

    const baseScaleX = this.samuraiFx.scaleX;
    const baseScaleY = this.samuraiFx.scaleY;
    this.samuraiFx.setAlpha(0.62).setScale(baseScaleX * 0.97, baseScaleY * 0.97);
    this.tweens.add({
      targets: this.samuraiFx,
      alpha: 0.86,
      scaleX: baseScaleX,
      scaleY: baseScaleY,
      duration: 220,
      ease: "Sine.easeOut",
    });

    if (this.samuraiMood !== "slash") return;
    const burstX = this.samuraiFx.x - this.samuraiFx.displayWidth * 0.08;
    const burstY = this.samuraiFx.y - Math.max(70, this.samuraiFx.displayHeight * 0.48);
    const colors = [0xffffff, 0xfacc15, 0x38bdf8, 0xf472b6];
    for (let i = 0; i < 8; i++) {
      const bit = this.add.circle(burstX, burstY, Phaser.Math.Between(2, 4), colors[i % colors.length], 0.78)
        .setDepth(6.9)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.samuraiTransitionBits.push(bit);
      this.tweens.add({
        targets: bit,
        x: burstX + Phaser.Math.Between(-48, 54),
        y: burstY + Phaser.Math.Between(-38, 28),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(0.22, 0.5),
        duration: Phaser.Math.Between(280, 480),
        ease: "Cubic.easeOut",
        onComplete: () => {
          bit.destroy();
          this.samuraiTransitionBits = this.samuraiTransitionBits.filter((candidate) => candidate !== bit && candidate.active);
        },
      });
    }
  }

  private async playSamuraiWinSlash() {
    if (!this.samuraiFx) return;
    this.setSamuraiMood("slash");
    await this.wait(Math.ceil((SAMURAI_SLASH_FRAME_IDS.length / 15) * 1000));
    this.setSamuraiMood("idle");
  }

  private layoutScene() {
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    this.scaleFactor = Math.min(1, (width * 0.94) / REEL_FRAME_BASE_W, (height * 0.62) / REEL_FRAME_BASE_H);
    this.frameW = REEL_FRAME_BASE_W * this.scaleFactor;
    this.frameH = REEL_FRAME_BASE_H * this.scaleFactor;
    this.frameLeft = width / 2 - this.frameW / 2;
    const firstRowY = Math.max(height * 0.28, Math.max(166, height * 0.075 + 112));
    this.frameTop = firstRowY - ROW_CENTER_Y[0] * this.frameH;

    this.titleText.setPosition(width / 2, Math.max(48, height * 0.075)).setFontSize(Math.max(32, Math.min(58, width * 0.043)));
    if (this.logoImage) {
      const logoW = Math.min(width * 0.17, height * 0.28, 220);
      const logoH = logoW * (this.logoImage.height / this.logoImage.width);
      this.logoImage
        .setPosition(Math.max(12, width * 0.014), Math.max(10, height * 0.018))
        .setDisplaySize(logoW, logoH);
    }
    this.boardFrame
      .setPosition(this.frameLeft + this.frameW * 0.035, this.frameTop + this.frameH * 0.05)
      .setSize(this.frameW * 0.93, this.frameH * 0.88);
    this.scaleBackground(width, height);
    this.layoutCherryBlossomParticles(width, height);
    this.reelFrame
      .setPosition(width / 2, this.frameTop + this.frameH / 2)
      .setDisplaySize(this.frameW, this.frameH);
    this.drawReelBackingTint();

    this.layoutBaboonFooter(width, height);
    this.layoutBonusCollectDisplay(width, height);
    this.refreshSamuraiLayout();

    this.positionGridViews();
    this.drawPaylines([]);
  }

  private layoutBaboonFooter(width: number, height: number) {
    const portrait = height > width;
    const barH = portrait ? Math.max(142, height * 0.18) : Math.max(108, height * 0.11);
    const barTop = height - barH;
    this.uiBar.setPosition(0, barTop).setSize(width, barH).setFillStyle(0x050505, portrait ? 0.58 : 0.76);

    const panelW = portrait ? Math.min(width * 0.72, 390) : Math.min(410, width * 0.235);
    const panelH = portrait ? 70 : Math.min(86, Math.max(76, height * 0.078));
    const panelRight = portrait ? width * 0.04 : Math.max(90, width * 0.052);
    const panelX = portrait ? width / 2 : width - panelRight - panelW / 2;
    const panelY = barTop + barH * 0.52;
    this.betPanel.setPosition(panelX, panelY).setSize(panelW, panelH).setFillStyle(0x111111, 0.96).setStrokeStyle(3, 0x030303, 1);

    const spinSize = portrait ? Math.min(104, width * 0.2) : Math.min(94, Math.max(82, height * 0.086));
    const spinX = portrait ? panelX + panelW * 0.22 : panelX + panelW * 0.22;
    const spinY = panelY;
    this.spinButton.setPosition(spinX, spinY).setScale(1);
    this.spinButtonBg.setRadius(spinSize / 2).setFillStyle(0x242424, 0.98).setStrokeStyle(Math.max(7, spinSize * 0.085), 0xffffff, 1);
    this.spinButtonText.setFontSize(Math.max(38, spinSize * 0.58));
    this.spinHitZone.setPosition(spinX - spinSize / 2, spinY - spinSize / 2).setSize(spinSize, spinSize);
    this.spinHitZone.setInteractive(new Phaser.Geom.Rectangle(0, 0, spinSize, spinSize), Phaser.Geom.Rectangle.Contains);

    const betTextX = panelX - panelW * 0.37;
    this.betText.setPosition(betTextX, panelY).setFontSize(this.bonusTotalSpins > 0 ? (portrait ? 14 : 19) : (portrait ? 18 : 22)).setOrigin(0, 0.5);
    const arrowX = panelX - panelW * 0.03;
    this.betUpText.setPosition(arrowX, panelY - panelH * 0.24).setFontSize(portrait ? 24 : 28);
    this.betDownText.setPosition(arrowX, panelY + panelH * 0.24).setFontSize(portrait ? 24 : 28);

    const autoSize = spinSize * 0.58;
    this.autoButton.setPosition(panelX + panelW * 0.42, panelY).setScale(portrait ? 0.45 : 0.52);
    this.autoButtonShell.setPosition(panelX + panelW * 0.43, panelY).setScale(1);
    this.autoButtonBg.setRadius(autoSize / 2).setFillStyle(0x242424, 0.98);
    this.autoButtonText.setFontSize(Math.max(23, autoSize * 0.6));
    this.maxBetButton.setPosition(panelX + panelW * 0.42, panelY).setScale(portrait ? 0.45 : 0.52);

    const buySize = portrait ? Math.min(62, width * 0.13) : Math.min(68, height * 0.064);
    const clusterLeft = portrait ? Math.max(24, width * 0.08) : Math.max(276, width * 0.152);
    const buyX = clusterLeft + buySize / 2;
    const leftY = panelY;
    this.buyButton.setPosition(buyX, leftY).setScale(1);
    this.buyButtonBg.setRadius(buySize / 2).setFillStyle(0xf2d7f0, 1).setStrokeStyle(3, 0x111111, 1);
    this.buyButtonText.setFontSize(Math.max(11, buySize * 0.19));

    this.menuButton.setPosition(buyX + buySize * 1.22, leftY);
    this.menuButtonBg.setSize(portrait ? 50 : 58, portrait ? 50 : 58);

    this.balanceText.setPosition(buyX + buySize * 2.15, leftY).setFontSize(portrait ? 17 : 24).setOrigin(0, 0.5);
    this.winText.setVisible(false);
  }

  private newIdleGrid() {
    const result = playPaidSpin(() => Math.random(), this.bet);
    this.grid = result.grid;
    this.renderGrid([]);
    this.drawPaylines([]);
  }

  private drawReelBackingTint() {
    if (!this.reelBackingTint) return;
    const left = this.frameLeft + this.frameW * 0.035;
    const top = this.frameTop + this.frameH * 0.05;
    const width = this.frameW * 0.93;
    const height = this.frameH * 0.88;
    this.reelBackingTint.clear();
    this.reelBackingTint.fillStyle(0x2c2f35, 0.34);
    this.reelBackingTint.fillRoundedRect(left, top, width, height, Math.max(18, 26 * this.scaleFactor));
    this.reelBackingTint.fillStyle(0xaab0b4, 0.16);
    this.reelBackingTint.fillRoundedRect(left + 5 * this.scaleFactor, top + 5 * this.scaleFactor, width - 10 * this.scaleFactor, height - 10 * this.scaleFactor, Math.max(14, 22 * this.scaleFactor));
    this.reelBackingTint.lineStyle(Math.max(2, 3 * this.scaleFactor), 0x1f2329, 0.18);
    for (let col = 1; col < COLS; col++) {
      const x = Phaser.Math.Linear(this.cellX(col - 1), this.cellX(col), 0.5);
      this.reelBackingTint.lineBetween(x, top + height * 0.035, x, top + height * 0.965);
    }
  }

  private async spin() {
    if (this.spinning) return;
    if (this.balance < this.bet) {
      this.flashStatus("No balance");
      return;
    }
    this.spinning = true;
    this.balance -= this.bet;
    this.lastWin = 0;
    this.updateHud();
    this.flashStatus("Spinning...");
    const result = playPaidSpin(() => Math.random(), this.bet);
    await this.animateReelSpin(result.grid);
    this.grid = result.grid;
    const paidSpinWin = Math.max(0, result.totalWin - result.bonusWin);
    this.lastWin = paidSpinWin;
    this.balance += paidSpinWin;
    this.renderGrid(result.lineWins);
    this.drawPaylines([]);
    this.updateHud();
    await this.presentWins(result.lineWins);

    if (result.wheelMultiplier > 0) {
      await this.showWheelSpin(result.wheelMultiplier, result.baseWin, paidSpinWin);
    }

    if (result.bonusTriggered && result.freeSpins) {
      await this.playFreeSpinSequence(result.freeSpins, result.bonusWin, "BONUS TRIGGERED");
    } else if (paidSpinWin > 0) {
      this.flashStatus(result.wheelMultiplier > 0 ? `Wheel boost ${result.wheelMultiplier}x` : `${result.lineWins.length} line win(s)`);
    } else {
      this.flashStatus("No win");
    }
    this.spinning = false;
    this.updateHud();
  }

  private handleSpinButton() {
    if (this.slamStopAvailable) {
      this.requestSlamStop();
      return;
    }
    this.spin();
  }

  private requestSlamStop() {
    if (!this.slamStopAvailable || this.slamStopRequested) return;
    this.slamStopRequested = true;
    this.updateHud();
    this.activeReelStops.forEach((stopReel, col) => {
      if (!stopReel) return;
      this.time.delayedCall(col * SLAM_STOP_REEL_STAGGER_MS, stopReel);
    });
  }

  private openBuyBonus() {
    if (this.spinning || this.bonusPanel) return;
    const cost = this.bet * BUY_BONUS_PRICE_MULTIPLIER;
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    const blocker = this.add.rectangle(0, 0, width, height, UI_PALETTE.ink, 0.62).setOrigin(0).setInteractive({ useHandCursor: false });
    const panel = this.add.rectangle(0, 0, 390, 230, UI_PALETTE.parchment, 0.98).setStrokeStyle(5, UI_PALETTE.bronze, 1);
    const title = this.add.text(0, -78, "BUY BONUS", { fontFamily: UI_FONT, fontSize: "42px", color: UI_HEX.ink, stroke: UI_HEX.peach, strokeThickness: 3 }).setOrigin(0.5);
    const copy = this.add.text(0, -20, `${FREE_SPINS} free spins\nCost: ${cost.toFixed(2)}`, { fontFamily: BODY_FONT, fontSize: "22px", color: UI_HEX.darkBrown, align: "center" }).setOrigin(0.5);
    const confirm = this.createModalButton(this.balance >= cost ? "BUY" : "NO BALANCE", this.balance >= cost ? UI_PALETTE.bronze : UI_PALETTE.taupe, () => this.executeBuyBonus(cost));
    confirm.setPosition(-78, 72);
    const close = this.createModalButton("CLOSE", UI_PALETTE.sage, () => this.closeBonusPanel());
    close.setPosition(82, 72);
    this.bonusPanel = this.add.container(width / 2, height / 2, [blocker, panel, title, copy, confirm, close]).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: this.bonusPanel, alpha: 1, duration: 150 });
  }

  private async executeBuyBonus(cost: number) {
    if (this.balance < cost || this.spinning) return;
    this.closeBonusPanel();
    this.spinning = true;
    this.balance -= cost;
    this.lastWin = 0;
    this.updateHud();
    this.flashStatus("Buying bonus...");
    const result = buyBonus(() => Math.random(), this.bet);
    await this.playFreeSpinSequence(result.freeSpins, result.totalWin, "BUY BONUS");
    this.spinning = false;
    this.updateHud();
  }

  private closeBonusPanel() {
    if (!this.bonusPanel) return;
    this.bonusPanel.destroy(true);
    this.bonusPanel = undefined;
  }

  private showRulesMenu() {
    if (this.rulesOverlay) this.rulesOverlay.destroy(true);
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    const portrait = height > width * 1.05;
    const panelW = Math.min(width * (portrait ? 0.94 : 0.78), portrait ? 540 : 1040);
    const panelH = Math.min(height * (portrait ? 0.84 : 0.82), portrait ? 740 : 720);
    const cx = width / 2;
    const cy = height / 2;
    const left = cx - panelW / 2;
    const top = cy - panelH / 2;
    const overlay = this.add.container(0, 0).setDepth(260);
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, UI_PALETTE.ink, 0.72).setInteractive({ useHandCursor: false });
    const panel = this.add.rectangle(cx, cy, panelW, panelH, UI_PALETTE.parchment, 0.2).setStrokeStyle(5, UI_PALETTE.bronze, 0.92).setInteractive({ useHandCursor: false });
    panel.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => event.stopPropagation());
    const title = this.add.text(left + 26, top + 18, "PAYTABLE & RULES", {
      fontFamily: UI_FONT,
      fontSize: `${portrait ? 28 : 36}px`,
      color: UI_HEX.ink,
      stroke: UI_HEX.peach,
      strokeThickness: 3,
    }).setOrigin(0, 0);
    const closeBg = this.add.circle(left + panelW - 34, top + 34, 22, UI_PALETTE.darkBrown, 1).setStrokeStyle(3, UI_PALETTE.peach, 0.9).setInteractive({ useHandCursor: true });
    const closeText = this.add.text(closeBg.x, closeBg.y - 1, "X", { fontFamily: "Arial Black, Arial, sans-serif", fontSize: "24px", color: UI_HEX.peach }).setOrigin(0.5);
    closeBg.on("pointerdown", () => this.hideRulesMenu());
    blocker.on("pointerdown", () => this.hideRulesMenu());
    overlay.add([blocker, panel, title, closeBg, closeText]);

    const viewportTop = top + (portrait ? 72 : 82);
    const viewportBottom = top + panelH - 30;
    const viewportH = viewportBottom - viewportTop;
    const content = this.add.container(0, 0).setDepth(261);
    const maskGraphics = this.add.graphics().setVisible(false);
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(left + 18, viewportTop, panelW - 36, viewportH);
    content.setMask(maskGraphics.createGeometryMask());
    overlay.add([maskGraphics, content]);

    const paySymbols = SYMBOLS.filter((symbol) => symbol.code !== "W1").slice().sort((a, b) => b.pay5 - a.pay5);
    const payLeft = left + 30;
    const payTop = viewportTop + 30;
    const payW = portrait ? panelW - 60 : panelW * 0.48;
    const rowH = portrait ? 44 : Math.max(32, Math.min(48, (panelH - 150) / paySymbols.length));
    const payHeader = this.add.text(payLeft, payTop - 30, "SYMBOL PAYS", {
      fontFamily: UI_FONT,
      fontSize: `${portrait ? 22 : 26}px`,
      color: UI_HEX.darkBrown,
      stroke: UI_HEX.peach,
      strokeThickness: 2,
    }).setOrigin(0, 0);
    const payColumns = this.add.text(payLeft + payW - 8, payTop - 24, "3    4    5", {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(13, rowH * 0.34)}px`,
      color: UI_HEX.ink,
      stroke: UI_HEX.beige,
      strokeThickness: 2,
    }).setOrigin(1, 0);
    content.add([payHeader, payColumns]);

    paySymbols.forEach((symbol, index) => {
      const y = payTop + index * rowH;
      const rowBg = this.add.rectangle(payLeft + payW / 2, y + rowH / 2, payW, rowH - 4, index % 2 === 0 ? UI_PALETTE.beige : UI_PALETTE.taupe, 0.86).setStrokeStyle(1, UI_PALETTE.leather, 0.55);
      const assetKey = SYMBOL_IMAGE_KEYS[symbol.code];
      const icon = assetKey && this.textures.exists(assetKey)
        ? this.add.image(payLeft + rowH * 0.52, y + rowH / 2, assetKey).setDisplaySize(rowH * 0.82, rowH * 0.82).setOrigin(0.5)
        : this.add.text(payLeft + rowH * 0.52, y + rowH / 2, symbol.code, { fontFamily: UI_FONT, fontSize: `${Math.max(16, rowH * 0.42)}px`, color: UI_HEX.ink, stroke: UI_HEX.peach, strokeThickness: 2 }).setOrigin(0.5);
      const name = this.add.text(payLeft + rowH + 12, y + rowH / 2, symbol.label.toUpperCase(), {
        fontFamily: UI_FONT,
        fontSize: `${Math.max(13, rowH * 0.34)}px`,
        color: UI_HEX.ink,
        stroke: UI_HEX.peach,
        strokeThickness: 2,
      }).setOrigin(0, 0.5);
      const pays = this.add.text(payLeft + payW - 8, y + rowH / 2, `${symbol.pay3.toFixed(2)}   ${symbol.pay4.toFixed(2)}   ${symbol.pay5.toFixed(2)}x`, {
        fontFamily: BODY_FONT,
        fontSize: `${Math.max(12, rowH * 0.3)}px`,
        color: UI_HEX.darkBrown,
        fontStyle: "bold",
      }).setOrigin(1, 0.5);
      content.add([rowBg, icon, name, pays]);
    });

    const rulesLeft = portrait ? left + 30 : left + panelW * 0.55;
    const rulesTop = portrait ? payTop + paySymbols.length * rowH + 30 : payTop;
    const rulesW = portrait ? panelW - 60 : panelW * 0.39;
    const rulesTitle = this.add.text(rulesLeft, rulesTop - 30, "RULES", {
      fontFamily: UI_FONT,
      fontSize: `${portrait ? 22 : 26}px`,
      color: UI_HEX.redBrown,
      stroke: UI_HEX.peach,
      strokeThickness: 2,
    }).setOrigin(0, 0);
    const rulesBody = "5 reel, 4 row line-pay slot with 14 fixed paylines.\n\n" +
      "Wins pay left to right for 3, 4, or 5 matching paying symbols on a payline.\n\n" +
      "Winning symbols stay bright while non-paying symbols dim during the win presentation.\n\n" +
      "The Shuriken Spinner can land on reels 1, 3, and 5. When it carries a multiplier, the wheel can boost the line win.\n\n" +
      "Bonus trigger starts 10 automatic free spins. Buy Bonus costs 10x the current bet and starts the same feature.\n\n" +
      "Wins are displayed as bet multipliers and balance updates after each resolved spin.";
    const rulesText = this.add.text(rulesLeft, rulesTop + 4, rulesBody, {
      fontFamily: BODY_FONT,
      fontSize: `${portrait ? 14 : 16}px`,
      color: UI_HEX.ink,
      lineSpacing: portrait ? 4 : 6,
      wordWrap: { width: rulesW },
    }).setOrigin(0, 0);
    const wheelTitle = this.add.text(rulesLeft, rulesTop + rulesText.height + 30, "SHURIKEN MULTIPLIERS", {
      fontFamily: UI_FONT,
      fontSize: `${portrait ? 20 : 24}px`,
      color: UI_HEX.green,
      stroke: UI_HEX.peach,
      strokeThickness: 2,
    }).setOrigin(0, 0);
    const wheelText = this.add.text(rulesLeft, wheelTitle.y + 34, "Possible wheel values: 2x, 3x, 5x, 8x, 10x, 15x, 20x, 50x.", {
      fontFamily: BODY_FONT,
      fontSize: `${portrait ? 14 : 15}px`,
      color: UI_HEX.ink,
      wordWrap: { width: rulesW },
    }).setOrigin(0, 0);
    content.add([rulesTitle, rulesText, wheelTitle, wheelText]);

    const paylinesLeft = portrait ? rulesLeft : left + 30;
    const paylinesTop = portrait
      ? wheelText.y + wheelText.height + 34
      : Math.max(payTop + paySymbols.length * rowH, wheelText.y + wheelText.height) + 34;
    const paylinesW = portrait ? rulesW : panelW - 60;
    const paylinesBottom = this.addPaylineRules(content, paylinesLeft, paylinesTop, paylinesW, portrait);
    const contentBottom = Math.max(payTop + paySymbols.length * rowH, paylinesBottom);
    const minScroll = Math.min(0, viewportBottom - contentBottom - 18);
    let scrollY = 0;
    let dragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;
    const applyScroll = (nextY: number) => {
      scrollY = Phaser.Math.Clamp(nextY, minScroll, 0);
      content.setY(scrollY);
    };
    const scrollZone = this.add.zone(left + 18, viewportTop, panelW - 36, viewportH).setOrigin(0, 0).setInteractive({ useHandCursor: false }).setDepth(262);
    scrollZone.on("pointerdown", (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      dragging = true;
      dragStartY = pointer.y;
      dragStartScroll = scrollY;
    });
    scrollZone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (dragging) applyScroll(dragStartScroll + pointer.y - dragStartY);
    });
    scrollZone.on("pointerup", () => { dragging = false; });
    scrollZone.on("pointerout", () => { dragging = false; });
    overlay.add(scrollZone);

    const wheelHandler = (pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (!this.rulesOverlay) return;
      if (pointer.x < left || pointer.x > left + panelW || pointer.y < top || pointer.y > top + panelH) return;
      applyScroll(scrollY - dy * 0.55);
    };
    this.input.on("wheel", wheelHandler);
    overlay.once("destroy", () => this.input.off("wheel", wheelHandler));
    this.rulesOverlay = overlay;
  }

  private addPaylineRules(content: Phaser.GameObjects.Container, x: number, y: number, width: number, portrait: boolean) {
    const title = this.add.text(x, y, "PAYLINES", {
      fontFamily: UI_FONT,
      fontSize: `${portrait ? 20 : 24}px`,
      color: UI_HEX.redBrown,
      stroke: UI_HEX.peach,
      strokeThickness: 2,
    }).setOrigin(0, 0);
    const note = this.add.text(x, y + 30, "Rows shown top to bottom. Wins pay left to right on these fixed paths.", {
      fontFamily: BODY_FONT,
      fontSize: `${portrait ? 13 : 14}px`,
      color: UI_HEX.darkBrown,
      wordWrap: { width },
    }).setOrigin(0, 0);
    content.add([title, note]);

    const columns = portrait && width < 360 ? 1 : 2;
    const columnGap = portrait ? 12 : 18;
    const itemW = (width - columnGap * (columns - 1)) / columns;
    const rowsPerColumn = Math.ceil(PAYLINES.length / columns);
    const cellW = Math.max(13, Math.min(18, (itemW - 44) / 5));
    const cellH = Math.max(8, Math.min(11, cellW * 0.62));
    const cellGap = 3;
    const gridH = ROWS * cellH + (ROWS - 1) * cellGap;
    const itemH = Math.max(portrait ? 58 : 68, gridH + (portrait ? 18 : 24));
    const startY = y + 60;

    PAYLINES.forEach((lineRows, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      const itemX = x + column * (itemW + columnGap);
      const itemY = startY + row * itemH;
      const number = this.add.text(itemX, itemY + gridH / 2, `${index + 1}`, {
        fontFamily: UI_FONT,
        fontSize: `${Math.max(13, cellH * 1.55)}px`,
        color: UI_HEX.ink,
      }).setOrigin(0, 0.5);
      content.add(number);

      const gridX = itemX + 30;
      for (let reel = 0; reel < COLS; reel++) {
        for (let lineRow = 0; lineRow < ROWS; lineRow++) {
          const selected = lineRows[reel] === lineRow;
          const fill = selected ? UI_PALETTE.redBrown : UI_PALETTE.beige;
          const alpha = selected ? 0.96 : 0.5;
          const cell = this.add.rectangle(
            gridX + reel * (cellW + cellGap),
            itemY + lineRow * (cellH + cellGap),
            cellW,
            cellH,
            fill,
            alpha,
          ).setOrigin(0, 0).setStrokeStyle(1, selected ? UI_PALETTE.ink : UI_PALETTE.taupe, selected ? 0.85 : 0.45);
          content.add(cell);
        }
      }
    });

    return startY + rowsPerColumn * itemH;
  }

  private hideRulesMenu() {
    if (!this.rulesOverlay) return;
    this.rulesOverlay.destroy(true);
    this.rulesOverlay = undefined;
  }

  private renderGrid(wins: LineWin[]) {
    this.clearGridViews();
    const winningCells = new Set<string>();
    wins.forEach((win) => win.cells.forEach((cell) => winningCells.add(`${cell.col}:${cell.row}`)));
    this.symbolViews = [];
    for (let col = 0; col < COLS; col++) {
      this.symbolViews[col] = [];
      for (let row = 0; row < ROWS; row++) {
        const cell = this.grid[col][row];
        const isWinningCell = winningCells.has(`${col}:${row}`);
        const view = this.createSymbolView(cell, isWinningCell);
        if (wins.length > 0 && !isWinningCell) view.container.setAlpha(0.32);
        this.symbolViews[col][row] = view;
      }
    }
    this.positionGridViews();
  }

  private createSymbolView(cell: CellResult, highlighted: boolean): SymbolView {
    const symbol = SYMBOL_BY_CODE[cell.code];
    const parts: Phaser.GameObjects.GameObject[] = [];
    let bg: Phaser.GameObjects.Graphics | Phaser.GameObjects.Rectangle | undefined;
    let label: Phaser.GameObjects.Text | undefined;
    let image: Phaser.GameObjects.Image | undefined;

    const assetKey = this.getRenderableSymbolAssetKey(cell.code);
    if (assetKey && this.textures.exists(assetKey)) {
      image = this.add.image(0, 0, assetKey).setOrigin(0.5);
      image.setScale(this.getSymbolImageScale(image, cell.code));
      this.applySymbolImageTint(image, cell.code);
      if (cell.code[0] === "L") image.setAlpha(0.96);
      parts.push(image);
    } else {
      bg = this.add.graphics();
      this.drawSymbolShape(bg, cell.code, highlighted);
      label = this.add.text(0, 1, cell.code, {
        fontFamily: UI_FONT,
        fontSize: cell.code === "W1" ? "28px" : "30px",
        color: cell.code === "W1" ? "#111827" : "#ffffff",
        stroke: "#000000",
        strokeThickness: cell.code === "W1" ? 0 : 4,
      }).setOrigin(0.5);
      parts.push(bg, label);
    }

    let multiplier: Phaser.GameObjects.Text | Phaser.GameObjects.Container | undefined;
    if (cell.wheelMultiplier) {
      multiplier = cell.code === "W1" && image
        ? this.createWheelMultiplierLabels(cell.wheelMultiplier)
        : this.add.text(28, 30, `${cell.wheelMultiplier}x`, {
          fontFamily: UI_FONT,
          fontSize: "18px",
          color: "#facc15",
          stroke: "#000000",
          strokeThickness: 4,
        }).setOrigin(0.5);
      parts.push(multiplier);
    }
    const container = this.add.container(0, 0, parts).setDepth(highlighted ? 11 : 8);
    container.setData("code", symbol.code);
    return { container, bg, label, image, multiplier };
  }

  private createWheelMultiplierLabels(value: number) {
    const text = `${value}x`;
    const offsets = [
      { x: -23, y: -31 },
      { x: 35, y: -7 },
      { x: 12, y: 38 },
      { x: -38, y: 12 },
    ];
    const labels = offsets.map((offset) => this.add.text(offset.x, offset.y, text, {
      fontFamily: UI_FONT,
      fontSize: value >= 100 ? "14px" : "16px",
      color: "#ffe08a",
      stroke: "#050505",
      strokeThickness: 5,
      align: "center",
    }).setOrigin(0.5).setAlpha(0.98));
    return this.add.container(0, 0, labels);
  }

  private scaleBackground(width: number, height: number) {
    if (this.backgroundImage) {
      this.backgroundImage
        .setPosition(width / 2, height / 2)
        .setScale(Math.max(width / this.backgroundImage.width, height / this.backgroundImage.height));
    }
    if (this.backgroundClouds) {
      const texture = this.textures.get("shogun_background_clouds").getSourceImage() as HTMLImageElement;
      const cloudScale = Math.max(width / texture.width, height / texture.height);
      this.backgroundClouds
        .setPosition(width / 2, height / 2)
        .setSize(width, height)
        .setTileScale(cloudScale, cloudScale);
    }
  }

  private setBonusGameBackground(active: boolean) {
    if (!this.backgroundImage) return;
    const targetTexture = active && this.textures.exists("bonus_background") ? "bonus_background" : "shogun_background";
    if (this.backgroundImage.texture.key !== targetTexture) {
      this.backgroundImage.setTexture(targetTexture);
      this.scaleBackground(Number(this.scale.width) || 1280, Number(this.scale.height) || 720);
    }
    this.backgroundImage.setAlpha(active ? 0.95 : 0.96);
    this.backgroundClouds?.setAlpha(active ? 0.24 : 0.72);
  }

  private createCherryBlossomParticles(width: number, height: number) {
    this.createCherryBlossomPetalTexture();
    this.backgroundPetals = this.add.particles(CHERRY_BLOSSOM_PETAL_KEY)
      .setDepth(-4.75);
    this.backgroundPetalEmitter = this.backgroundPetals.createEmitter(this.getCherryBlossomEmitterConfig(width, height));
    this.backgroundPetalEmitter.reserve(Math.max(28, Math.round((width * height) / 26000)));
  }

  private createCherryBlossomPetalTexture() {
    if (this.textures.exists(CHERRY_BLOSSOM_PETAL_KEY)) return;
    const petal = this.make.graphics({ x: 0, y: 0, add: false });
    petal.fillStyle(0xffc9d9, 0.94);
    petal.fillEllipse(11, 8, 17, 9, 24);
    petal.fillStyle(0xffffff, 0.36);
    petal.fillEllipse(8, 6, 6, 3, 16);
    petal.generateTexture(CHERRY_BLOSSOM_PETAL_KEY, 22, 16);
    petal.destroy();
  }

  private layoutCherryBlossomParticles(width: number, height: number) {
    if (!this.backgroundPetalEmitter) {
      this.createCherryBlossomParticles(width, height);
      return;
    }
    this.backgroundPetalEmitter.fromJSON(this.getCherryBlossomEmitterConfig(width, height));
  }

  private getCherryBlossomEmitterConfig(width: number, height: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    const area = width * height;
    const maxParticles = Phaser.Math.Clamp(Math.round(area / 17000), 42, 82);
    const frequency = Phaser.Math.Clamp(Math.round(760 - maxParticles * 6), 250, 460);
    const petalScale = Phaser.Math.Clamp(Math.min(width, height) / 760, 0.72, 1.15);
    return {
      x: { min: -width * 0.18, max: width * 1.06 },
      y: { min: -height * 0.16, max: height * 0.94 },
      speedX: { min: 8, max: 34 },
      speedY: { min: 11, max: 34 },
      accelerationX: { min: -1.5, max: 3.5 },
      lifespan: { min: 12500, max: 19000 },
      frequency,
      quantity: 1,
      maxParticles,
      scale: { start: 0.27 * petalScale, end: 0.1 * petalScale },
      alpha: { start: 0.68, end: 0 },
      rotate: { min: -55, max: 65 },
      particleBringToTop: false,
    };
  }

  private drawSymbolShape(graphics: Phaser.GameObjects.Graphics, code: SymbolCode, highlighted: boolean) {
    const symbol = SYMBOL_BY_CODE[code];
    const size = CELL * 0.72;
    graphics.clear();
    graphics.lineStyle(highlighted ? 6 : 4, highlighted ? 0xffffff : symbol.stroke, 1);
    graphics.fillStyle(symbol.color, 1);
    if (symbol.shape === "circle" || symbol.shape === "wheel") {
      graphics.fillCircle(0, 0, size * 0.48);
      graphics.strokeCircle(0, 0, size * 0.48);
      if (symbol.shape === "wheel") {
        graphics.lineStyle(4, 0x111827, 0.9);
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          graphics.lineBetween(0, 0, Math.cos(angle) * size * 0.42, Math.sin(angle) * size * 0.42);
        }
      }
      return;
    }
    if (symbol.shape === "diamond") {
      graphics.fillPoints([{ x: 0, y: -size / 2 }, { x: size / 2, y: 0 }, { x: 0, y: size / 2 }, { x: -size / 2, y: 0 }], true);
      graphics.strokePoints([{ x: 0, y: -size / 2 }, { x: size / 2, y: 0 }, { x: 0, y: size / 2 }, { x: -size / 2, y: 0 }], true);
      return;
    }
    if (symbol.shape === "triangle") {
      graphics.fillTriangle(0, -size / 2, size / 2, size / 2, -size / 2, size / 2);
      graphics.strokeTriangle(0, -size / 2, size / 2, size / 2, -size / 2, size / 2);
      return;
    }
    if (symbol.shape === "hex") {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 6 + (Math.PI * 2 * i) / 6;
        points.push({ x: Math.cos(angle) * size * 0.5, y: Math.sin(angle) * size * 0.5 });
      }
      graphics.fillPoints(points, true);
      graphics.strokePoints(points, true);
      return;
    }
    if (symbol.shape === "star" || symbol.shape === "burst") {
      const points = [];
      const count = symbol.shape === "star" ? 10 : 12;
      for (let i = 0; i < count; i++) {
        const radius = i % 2 === 0 ? size * 0.5 : size * 0.23;
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / count;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      graphics.fillPoints(points, true);
      graphics.strokePoints(points, true);
      return;
    }
    if (symbol.shape === "cross") {
      const s = size * 0.18;
      const h = size * 0.5;
      const points = [{ x: -s, y: -h }, { x: s, y: -h }, { x: s, y: -s }, { x: h, y: -s }, { x: h, y: s }, { x: s, y: s }, { x: s, y: h }, { x: -s, y: h }, { x: -s, y: s }, { x: -h, y: s }, { x: -h, y: -s }, { x: -s, y: -s }];
      graphics.fillPoints(points, true);
      graphics.strokePoints(points, true);
      return;
    }
    if (symbol.shape === "pill") {
      graphics.fillRoundedRect(-size * 0.48, -size * 0.32, size * 0.96, size * 0.64, size * 0.3);
      graphics.strokeRoundedRect(-size * 0.48, -size * 0.32, size * 0.96, size * 0.64, size * 0.3);
      return;
    }
    if (symbol.shape === "rune") {
      graphics.fillRoundedRect(-size * 0.42, -size * 0.46, size * 0.84, size * 0.92, 10);
      graphics.strokeRoundedRect(-size * 0.42, -size * 0.46, size * 0.84, size * 0.92, 10);
      graphics.lineStyle(5, symbol.stroke, 0.78);
      graphics.lineBetween(-size * 0.18, -size * 0.22, size * 0.18, size * 0.22);
      graphics.lineBetween(size * 0.18, -size * 0.22, -size * 0.18, size * 0.22);
      return;
    }
    graphics.fillRect(-size / 2, -size / 2, size, size);
    graphics.strokeRect(-size / 2, -size / 2, size, size);
  }

  private positionGridViews() {
    this.refreshReelMasks(CELL * this.scaleFactor);
    for (let col = 0; col < this.symbolViews.length; col++) {
      for (let row = 0; row < this.symbolViews[col].length; row++) {
        const view = this.symbolViews[col][row];
        if (!view) continue;
        view.container
          .setPosition(this.cellX(col), this.cellY(row))
          .setScale(this.scaleFactor)
          .setData("baseScale", this.scaleFactor)
          .setMask(this.reelMasks[col]);
      }
    }
  }

  private refreshReelMasks(rowGap: number) {
    for (let col = 0; col < COLS; col++) {
      let maskShape = this.reelMaskShapes[col];
      if (!maskShape) {
        maskShape = this.add.graphics();
        maskShape.setVisible(false);
        this.reelMaskShapes[col] = maskShape;
        this.reelMasks[col] = maskShape.createGeometryMask();
      }
      maskShape.clear();
      maskShape.fillStyle(0xffffff, 1);
      maskShape.fillRect(
        this.cellX(col) - rowGap * 0.56,
        this.frameTop + this.frameH * 0.08,
        rowGap * 1.12,
        this.frameH * 0.78 + 10,
      );
    }
  }

  private async animateReelSpin(finalGrid: CellResult[][]) {
    if (!this.symbolViews.length) {
      await this.wait(260);
      return;
    }
    this.drawPaylines([]);
    this.slamStopRequested = false;
    this.slamStopAvailable = true;
    this.activeReelStops = [];
    this.updateHud();
    const rowGap = CELL * this.scaleFactor;
    const topY = this.cellY(0);
    const reelPromises: Array<Promise<void>> = [];
    const reelOverlays: Phaser.GameObjects.Container[] = [];
    this.refreshReelMasks(rowGap);
    for (let col = 0; col < COLS; col++) {
      const reel = this.add.container(0, 0).setDepth(24 + col);
      reelOverlays.push(reel);
      reel.setMask(this.reelMasks[col]);

      let spinCodes = this.createSpinReelCodes();
      this.populateSpinReel(reel, col, topY, rowGap, spinCodes);
      reel.setVisible(false);

      reelPromises.push(new Promise((resolve) => {
        this.time.delayedCall(col * REEL_START_STAGGER_MS, () => {
          this.symbolViews[col]?.forEach((view) => view?.container.setVisible(false));
          reel.setVisible(true);
          let stopped = false;
          const loop = this.tweens.add({
            targets: reel,
            y: rowGap,
            duration: 86,
            ease: "Linear",
            repeat: -1,
            onRepeat: () => {
              spinCodes = this.advanceSpinReelCodes(spinCodes);
              this.populateSpinReel(reel, col, topY, rowGap, spinCodes);
            },
          });

          const landReel = () => {
            if (stopped) return;
            stopped = true;
            landingTimer.remove(false);
            this.activeReelStops[col] = undefined;
            loop.stop();
            reel.y = -rowGap * 2;
            this.populateLandingReel(reel, col, topY, rowGap, finalGrid);
            this.tweens.add({
              targets: reel,
              y: 0,
              duration: 330,
              ease: "Cubic.Out",
              onComplete: () => {
                this.tweens.add({
                  targets: reel,
                  y: rowGap * 0.055,
                  duration: 72,
                  ease: "Sine.InOut",
                  yoyo: true,
                  onComplete: () => resolve(),
                });
              },
            });
          };
          this.activeReelStops[col] = landReel;
          const landingTimer = this.time.delayedCall(680 + col * 190, landReel);
          if (this.slamStopRequested) {
            this.time.delayedCall(SLAM_STOP_MIN_SPIN_MS, landReel);
          }
        });
      }));
    }
    await Promise.all(reelPromises);
    this.slamStopAvailable = false;
    this.slamStopRequested = false;
    this.activeReelStops = [];
    this.updateHud();
    reelOverlays.forEach((reel) => reel.destroy(true));
  }

  private populateSpinReel(
    reel: Phaser.GameObjects.Container,
    col: number,
    topY: number,
    rowGap: number,
    codes: SymbolCode[],
  ) {
    reel.removeAll(true);
    for (let index = 0; index < codes.length; index++) {
      const row = index - 2;
      reel.add(this.createSpinSymbol(codes[index], this.cellX(col), topY + row * rowGap));
    }
  }

  private populateLandingReel(
    reel: Phaser.GameObjects.Container,
    col: number,
    topY: number,
    rowGap: number,
    finalGrid: CellResult[][],
  ) {
    reel.removeAll(true);
    for (let row = -2; row < ROWS + 2; row++) {
      const code = row >= 0 && row < ROWS ? finalGrid[col][row].code : this.randomSpinCode();
      reel.add(this.createSpinSymbol(code, this.cellX(col), topY + row * rowGap, false));
    }
  }

  private createSpinReelCodes() {
    return Array.from({ length: ROWS + 7 }, () => this.randomSpinCode());
  }

  private advanceSpinReelCodes(codes: SymbolCode[]) {
    return [this.randomSpinCode(), ...codes.slice(0, codes.length - 1)];
  }

  private createSpinSymbol(code: SymbolCode, x: number, y: number, blurred = true) {
    const assetKey = this.getRenderableSymbolAssetKey(code);
    if (assetKey && this.textures.exists(assetKey)) {
      const image = this.add.image(0, 0, assetKey).setOrigin(0.5);
      const scale = this.getSymbolImageScale(image, code) * this.scaleFactor;
      image.setScale(scale);
      this.applySymbolImageTint(image, code);
      if (code[0] === "L") image.setAlpha(0.96);
      if (!blurred) return this.add.container(x, y, [image]);

      const trailScaleY = 1.24;
      const blurFarBehind = this.add.image(0, -34 * this.scaleFactor, assetKey).setOrigin(0.5).setScale(scale, scale * trailScaleY).setAlpha(0.2);
      const blurBehind = this.add.image(0, -17 * this.scaleFactor, assetKey).setOrigin(0.5).setScale(scale, scale * trailScaleY).setAlpha(0.38);
      const blurAhead = this.add.image(0, 17 * this.scaleFactor, assetKey).setOrigin(0.5).setScale(scale, scale * trailScaleY).setAlpha(0.38);
      const blurFarAhead = this.add.image(0, 34 * this.scaleFactor, assetKey).setOrigin(0.5).setScale(scale, scale * trailScaleY).setAlpha(0.2);
      [blurFarBehind, blurBehind, blurAhead, blurFarAhead].forEach((trail) => this.applySymbolImageTint(trail, code));
      return this.add.container(x, y, [blurFarBehind, blurBehind, blurAhead, blurFarAhead, image]);
    }
    return this.add.text(x, y, code, {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(22, CELL * this.scaleFactor * 0.26)}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);
  }

  private getSymbolImageScale(image: Phaser.GameObjects.Image, code: SymbolCode) {
    const lowPayScale = code[0] === "L" ? LOW_PAY_IMAGE_SCALE : 1;
    const tenScale = code === "L5" ? TEN_SYMBOL_EXTRA_SCALE : 1;
    const maxW = code === "W1" ? CELL * 1.08 : code[0] === "L" ? CELL * 0.76 * lowPayScale * tenScale : CELL * 0.86;
    const maxH = code === "W1" ? CELL * 1.08 : code[0] === "L" ? CELL * 0.70 * lowPayScale * tenScale : CELL * 0.88;
    return Math.min(maxW / image.width, maxH / image.height) * SYMBOL_IMAGE_SCALE;
  }

  private getRenderableSymbolAssetKey(code: SymbolCode) {
    const baseKey = code === "W1" ? "shogun_wheel" : SYMBOL_IMAGE_KEYS[code];
    if (code !== "L5" || !baseKey || !this.textures.exists(baseKey)) return baseKey;
    return this.ensureTenSymbolGreyTexture(baseKey);
  }

  private ensureTenSymbolGreyTexture(sourceKey: string) {
    if (this.textures.exists(TEN_SYMBOL_GREY_TEXTURE)) return TEN_SYMBOL_GREY_TEXTURE;
    const source = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const width = source.width;
    const height = source.height;
    const texture = this.textures.createCanvas(TEN_SYMBOL_GREY_TEXTURE, width, height);
    texture.draw(0, 0, source);
    const imageData = texture.getData(0, 0, width, height);
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const grey = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
      pixels[index] = pixels[index] * 0.85 + grey * 0.15;
      pixels[index + 1] = pixels[index + 1] * 0.85 + grey * 0.15;
      pixels[index + 2] = pixels[index + 2] * 0.85 + grey * 0.15;
    }
    texture.putData(imageData, 0, 0);
    texture.refresh();
    return TEN_SYMBOL_GREY_TEXTURE;
  }

  private applySymbolImageTint(image: Phaser.GameObjects.Image, code: SymbolCode) {
    if (code === "L5" && image.texture.key !== TEN_SYMBOL_GREY_TEXTURE) image.setTint(TEN_SYMBOL_GREY_TINT);
  }

  private randomSpinCode() {
    return SPIN_SYMBOL_CODES[Math.floor(Math.random() * SPIN_SYMBOL_CODES.length)];
  }

  private drawPaylines(wins: LineWin[]) {
    if (!this.lineGraphics) return;
    this.lineGraphics.clear();
    const visibleWins = wins.slice(0, 4);
    visibleWins.forEach((win, index) => {
      const color = [0xfacc15, 0x38bdf8, 0xf472b6, 0x34d399][index % 4];
      this.lineGraphics.lineStyle(5, color, 0.9);
      this.lineGraphics.beginPath();
      win.cells.forEach((cell, cellIndex) => {
        const x = this.cellX(cell.col);
        const y = this.cellY(cell.row);
        if (cellIndex === 0) this.lineGraphics.moveTo(x, y);
        else this.lineGraphics.lineTo(x, y);
      });
      this.lineGraphics.strokePath();
    });
  }

  private async presentWins(wins: LineWin[]) {
    if (!wins.length) return;
    const orderedWins = wins.slice().sort((a, b) => a.lineIndex - b.lineIndex);
    const totalWin = this.lastWin;
    const samuraiSlash = this.playSamuraiWinSlash();
    for (let index = 0; index < orderedWins.length; index++) {
      const win = orderedWins[index];
      this.renderGrid([win]);
      this.lastWin = win.amount;
      this.updateHud();
      await this.animatePaylinesLeftToRight([win]);
      this.drawPaylines([win]);
      this.playWinningSymbolAnimations([win]);
      await this.showLineWinCallout(win, index + 1, orderedWins.length);
      await this.wait(160);
    }
    await samuraiSlash;
    this.lastWin = totalWin;
    this.updateHud();
    this.renderGrid(wins);
    this.drawPaylines([]);
  }

  private async showLineWinCallout(win: LineWin, index: number, total: number) {
    const width = Number(this.scale.width) || 1280;
    const y = Math.max(76, this.frameTop + this.frameH * 0.08);
    const label = this.add.text(0, -1, `LINE ${win.lineIndex + 1} WIN  \u20AC${this.formatMoney(win.amount)}`, {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(24, Math.min(42, width * 0.032))}px`,
      color: UI_HEX.peach,
      stroke: UI_HEX.ink,
      strokeThickness: 6,
    }).setOrigin(0.5);
    const progress = total > 1 ? this.add.text(0, label.height * 0.62, `${index}/${total}`, {
      fontFamily: BODY_FONT,
      fontSize: `${Math.max(12, Math.min(16, width * 0.012))}px`,
      color: UI_HEX.parchment,
    }).setOrigin(0.5) : undefined;
    const bgH = label.height + (progress ? progress.height + 18 : 22);
    const bg = this.add.rectangle(0, progress ? 5 : 0, label.width + 54, bgH, UI_PALETTE.ink, 0.86)
      .setStrokeStyle(3, UI_PALETTE.bronze, 0.94);
    const pieces: Phaser.GameObjects.GameObject[] = [bg, label];
    if (progress) pieces.push(progress);
    const callout = this.add.container(width / 2, y, pieces).setDepth(130).setAlpha(0).setScale(0.92);
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: callout,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: "Back.Out",
        onComplete: () => resolve(),
      });
    });
    await this.wait(520);
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: callout,
        alpha: 0,
        y: y - 12,
        duration: 150,
        ease: "Sine.In",
        onComplete: () => {
          callout.destroy(true);
          resolve();
        },
      });
    });
  }

  private async animatePaylinesLeftToRight(wins: LineWin[]) {
    if (!this.lineGraphics) return;
    const visibleWins = wins.slice(0, 4);
    if (!visibleWins.length) return;

    const state = { progress: 0 };
    const drawProgress = () => {
      this.lineGraphics.clear();
      visibleWins.forEach((win, index) => {
        const color = [0xfacc15, 0x38bdf8, 0xf472b6, 0x34d399][index % 4];
        const points = win.cells.map((cell) => ({ x: this.cellX(cell.col), y: this.cellY(cell.row) }));
        const segmentCount = points.length - 1;
        if (segmentCount <= 0) return;
        const scaledProgress = Phaser.Math.Clamp(state.progress, 0, 1) * segmentCount;
        const fullSegments = Math.floor(scaledProgress);
        const remainder = scaledProgress - fullSegments;

        this.lineGraphics.lineStyle(6, color, 0.95);
        this.lineGraphics.beginPath();
        this.lineGraphics.moveTo(points[0].x, points[0].y);
        for (let segment = 0; segment < fullSegments; segment++) {
          this.lineGraphics.lineTo(points[segment + 1].x, points[segment + 1].y);
        }
        if (fullSegments < segmentCount) {
          const from = points[fullSegments];
          const to = points[fullSegments + 1];
          this.lineGraphics.lineTo(
            Phaser.Math.Linear(from.x, to.x, remainder),
            Phaser.Math.Linear(from.y, to.y, remainder),
          );
        }
        this.lineGraphics.strokePath();
      });
    };

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: state,
        progress: 1,
        duration: 260,
        ease: "Cubic.Out",
        onUpdate: drawProgress,
        onComplete: () => resolve(),
      });
    });
  }

  private playWinningSymbolAnimations(wins: LineWin[]) {
    const winningCells = new Set<string>();
    wins.forEach((win) => win.cells.forEach((cell) => winningCells.add(`${cell.col}:${cell.row}`)));
    winningCells.forEach((key) => {
      const [colText, rowText] = key.split(":");
      const view = this.symbolViews[Number(colText)]?.[Number(rowText)];
      if (!view) return;
      view.container.setAlpha(1).setDepth(12);
      this.tweens.add({ targets: view.container, scaleX: 1.08, scaleY: 1.08, duration: 240, yoyo: true, repeat: 2 });
    });
  }

  private updateHud() {
    this.balanceText.setText(`BALANCE\n\u20AC${this.formatMoney(this.balance)}`);
    this.betText
      .setText(this.bonusTotalSpins > 0 ? `FREE\nSPINS ${this.bonusCurrentSpin}/${this.bonusTotalSpins}` : `BET\n\u20AC${this.bet.toFixed(2)}`)
      .setFontSize(this.bonusTotalSpins > 0 ? 19 : 22);
    this.winText.setText(`WIN ${this.lastWin.toFixed(2)}`);
    if (this.spinButtonText) {
      const canSlam = this.slamStopAvailable && this.spinning;
      const spinRadius = Math.max(38, this.spinButtonBg.displayWidth / 2);
      this.spinButtonText
        .setText(canSlam ? "\u25A0" : "\u21BB")
        .setFontSize(canSlam ? spinRadius * 0.86 : spinRadius * 1.14);
      this.spinButtonBg?.setFillStyle(canSlam ? 0x8b1f1f : 0x242424, canSlam ? 1 : 0.98);
      this.spinButton?.setAlpha(this.spinning && !canSlam ? 0.55 : 1);
    }
  }

  private formatMoney(value: number) {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private flashStatus(_text: string) {
    // Status messaging intentionally has no visible standalone label.
  }

  private adjustBet(direction: number) {
    if (this.spinning) return;
    const steps = [0.2, 0.4, 0.6, 0.8, 1, 2, 5, 10];
    const currentIndex = steps.indexOf(this.bet);
    const fallbackIndex = steps.reduce((best, value, index) => Math.abs(value - this.bet) < Math.abs(steps[best] - this.bet) ? index : best, 0);
    const nextIndex = Phaser.Math.Clamp((currentIndex >= 0 ? currentIndex : fallbackIndex) + direction, 0, steps.length - 1);
    this.bet = steps[nextIndex];
    this.updateHud();
  }

  private setMaxBet() {
    if (this.spinning) return;
    this.bet = 10;
    this.updateHud();
  }

  private async showWheelSpin(value: number, baseWin: number, totalWin: number) {
    if (this.wheelOverlay) this.wheelOverlay.destroy(true);
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    const centerX = width / 2;
    const centerY = Math.min(height * 0.52, this.frameTop + this.frameH * 0.52);
    const wheelSize = Math.max(260, Math.min(430, Math.min(width, height) * 0.58));
    const values = this.createWheelValueSequence(value);
    const selectedIndex = values.indexOf(value);
    const labelRadius = wheelSize * 0.28;
    const labelFont = Math.max(18, Math.min(31, wheelSize * 0.068));

    const blocker = this.add.rectangle(0, 0, width, height, UI_PALETTE.ink, 0.64).setOrigin(0).setInteractive({ useHandCursor: false });
    const glow = this.add.circle(centerX, centerY, wheelSize * 0.58, UI_PALETTE.bronze, 0.16);
    const ring = this.add.circle(centerX, centerY, wheelSize * 0.51, UI_PALETTE.darkBrown, 0.84).setStrokeStyle(5, UI_PALETTE.bronze, 0.95);
    const wheel = this.add.image(0, 0, "shogun_wheel").setDisplaySize(wheelSize, wheelSize);
    const labels = values.map((multiplier, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
      const label = this.add.text(Math.cos(angle) * labelRadius, Math.sin(angle) * labelRadius, `${multiplier}x`, {
        fontFamily: UI_FONT,
        fontSize: `${labelFont}px`,
        color: multiplier === value ? UI_HEX.peach : UI_HEX.parchment,
        stroke: UI_HEX.ink,
        strokeThickness: Math.max(5, Math.round(labelFont * 0.22)),
        align: "center",
      }).setOrigin(0.5);
      label.setAngle((angle * 180) / Math.PI + 90);
      return label;
    });
    const wheelParts: Phaser.GameObjects.GameObject[] = [wheel as Phaser.GameObjects.GameObject, ...labels];
    const wheelGroup = this.add.container(centerX, centerY, wheelParts).setScale(0.2).setAlpha(0);
    const pointerSize = Math.max(44, Math.min(76, wheelSize * 0.16));
    const pointer = this.add.image(centerX, centerY - wheelSize * 0.55, "shuriken_spin_pin")
      .setOrigin(0.5)
      .setDisplaySize(pointerSize, pointerSize);
    const title = this.add.text(centerX, centerY - wheelSize * 0.7, "SHURIKEN SPINNER", {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(34, Math.min(58, width * 0.045))}px`,
      color: UI_HEX.peach,
      stroke: UI_HEX.ink,
      strokeThickness: 8,
    }).setOrigin(0.5);
    const resultText = this.add.text(centerX, centerY + wheelSize * 0.66, "SPINNING...", {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(26, Math.min(42, width * 0.033))}px`,
      color: UI_HEX.parchment,
      stroke: UI_HEX.ink,
      strokeThickness: 7,
    }).setOrigin(0.5);
    const mathText = this.add.text(centerX, centerY + wheelSize * 0.77, `${baseWin.toFixed(2)} x ${value} = ${totalWin.toFixed(2)}`, {
      fontFamily: BODY_FONT,
      fontSize: `${Math.max(15, Math.min(22, width * 0.017))}px`,
      color: UI_HEX.peach,
      stroke: UI_HEX.ink,
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    this.wheelOverlay = this.add.container(0, 0, [blocker, glow, ring, wheelGroup, pointer, title, resultText, mathText]).setDepth(45).setAlpha(0);
    this.tweens.add({ targets: this.wheelOverlay, alpha: 1, duration: 180, ease: "Sine.Out" });
    this.tweens.add({ targets: wheelGroup, alpha: 1, scaleX: 1, scaleY: 1, duration: 260, ease: "Back.Out" });
    this.tweens.add({ targets: glow, alpha: 0.27, scaleX: 1.08, scaleY: 1.08, duration: 340, yoyo: true, repeat: 5, ease: "Sine.InOut" });
    await this.wait(260);

    const stopAngle = (360 * 5) + ((360 - selectedIndex * (360 / values.length)) % 360);
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: wheelGroup,
        angle: stopAngle,
        duration: 1750,
        ease: "Cubic.Out",
        onComplete: () => resolve(),
      });
    });

    resultText.setText(`${value}x SHURIKEN BOOST`);
    await this.animateWheelMultiplierApplication(value, baseWin, totalWin, centerX, centerY, wheelSize, resultText, mathText);
    await this.wait(460);
    if (this.wheelOverlay) {
      this.tweens.add({
        targets: this.wheelOverlay,
        alpha: 0,
        duration: 170,
        onComplete: () => {
          if (this.wheelOverlay) this.wheelOverlay.destroy(true);
          this.wheelOverlay = undefined;
        },
      });
      await this.wait(180);
    }
  }

  private createWheelValueSequence(value: number) {
    const values = WHEEL_VALUES.slice(0);
    if (values.indexOf(value) === -1) values[3] = value;
    values.sort((a, b) => a - b);
    return values;
  }

  private async animateWheelMultiplierApplication(
    value: number,
    baseWin: number,
    totalWin: number,
    centerX: number,
    centerY: number,
    wheelSize: number,
    resultText: Phaser.GameObjects.Text,
    mathText: Phaser.GameObjects.Text,
  ) {
    const width = Number(this.scale.width) || 1280;
    const amountY = centerY + wheelSize * 0.79;
    const amountFont = Math.max(24, Math.min(42, width * 0.032));
    const beforeText = this.add.text(centerX - wheelSize * 0.24, amountY, baseWin.toFixed(2), {
      fontFamily: UI_FONT,
      fontSize: `${amountFont}px`,
      color: UI_HEX.beige,
      stroke: UI_HEX.ink,
      strokeThickness: 7,
    }).setOrigin(0.5).setAlpha(0);
    const arrowText = this.add.text(centerX, amountY, "\u2192", {
      fontFamily: UI_FONT,
      fontSize: `${amountFont * 0.9}px`,
      color: UI_HEX.bronze,
      stroke: UI_HEX.ink,
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    const afterText = this.add.text(centerX + wheelSize * 0.25, amountY, baseWin.toFixed(2), {
      fontFamily: UI_FONT,
      fontSize: `${amountFont}px`,
      color: UI_HEX.parchment,
      stroke: UI_HEX.ink,
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);
    const badge = this.add.text(centerX, centerY - wheelSize * 0.02, `${value}x`, {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(30, amountFont * 1.18)}px`,
      color: UI_HEX.peach,
      stroke: UI_HEX.ink,
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0).setScale(0.55);

    this.wheelOverlay?.add([beforeText, arrowText, afterText, badge]);
    mathText.setText("BASE WIN");
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: [resultText, mathText, beforeText, arrowText, afterText],
        alpha: 1,
        duration: 190,
        ease: "Sine.Out",
        onComplete: () => resolve(),
      });
    });

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: badge,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 190,
        ease: "Back.Out",
        onComplete: () => resolve(),
      });
    });

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: badge,
        x: afterText.x,
        y: afterText.y - amountFont * 0.95,
        duration: 520,
        ease: "Cubic.InOut",
        onComplete: () => {
          afterText.setText(totalWin.toFixed(2)).setColor(UI_HEX.peach);
          mathText.setText(`${baseWin.toFixed(2)} x ${value} = ${totalWin.toFixed(2)}`);
          this.tweens.add({ targets: [afterText, mathText], scaleX: 1.12, scaleY: 1.12, duration: 180, yoyo: true, ease: "Sine.Out" });
          this.tweens.add({ targets: badge, alpha: 0, scaleX: 1.45, scaleY: 1.45, duration: 210, ease: "Sine.In" });
          resolve();
        },
      });
    });
    await this.wait(360);
  }

  private async playFreeSpinSequence(freeSpins: SpinResult[], totalWin: number, titleText: string) {
    if (!freeSpins.length) {
      await this.showBonusSummary(totalWin, 0, titleText);
      return;
    }

    await this.showBonusTransition(titleText, freeSpins.length);
    this.setBonusGameBackground(true);

    let collected = 0;
    try {
      this.showBonusCollectDisplay(0, 1, freeSpins.length);
      for (let index = 0; index < freeSpins.length; index++) {
        const spin = freeSpins[index];
        this.flashStatus(`Free spin ${index + 1}/${freeSpins.length}`);
        this.updateBonusCollectDisplay(collected, index + 1, freeSpins.length);
        await this.wait(index === 0 ? 420 : 260);
        await this.animateReelSpin(spin.grid);

        this.grid = spin.grid;
        this.lastWin = spin.totalWin;
        this.balance += spin.totalWin;
        collected += spin.totalWin;
        this.updateBonusCollectDisplay(collected, index + 1, freeSpins.length, spin.totalWin > 0);
        this.renderGrid(spin.lineWins);
        this.drawPaylines([]);
        this.updateHud();
        await this.presentWins(spin.lineWins);

        if (spin.wheelMultiplier > 0) {
          await this.showWheelSpin(spin.wheelMultiplier, spin.baseWin, spin.totalWin);
        }

        this.flashStatus(spin.totalWin > 0 ? `Free spin win ${spin.totalWin.toFixed(2)}x` : "Free spin no win");
        await this.wait(spin.totalWin > 0 ? 680 : 360);
      }

      this.lastWin = collected;
      this.updateBonusCollectDisplay(collected, freeSpins.length, freeSpins.length, collected > 0);
      this.updateHud();
      await this.showBonusSummary(totalWin, freeSpins.length, "TOTAL WIN");
    } finally {
      this.hideBonusCollectDisplay();
      this.setBonusGameBackground(false);
    }
    this.flashStatus(totalWin > 0 ? `Bonus paid ${totalWin.toFixed(2)}x` : "Bonus complete");
  }

  private showBonusCollectDisplay(collected: number, currentSpin: number, totalSpins: number) {
    this.hideBonusCollectDisplay();
    this.bonusCurrentSpin = currentSpin;
    this.bonusTotalSpins = totalSpins;
    this.updateHud();
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    const portrait = height > width * 1.05;
    const panelW = portrait ? Math.min(width * 0.28, 126) : Math.min(220, width * 0.14);
    const panelH = portrait ? 45 : 58;
    this.bonusCollectPanel = this.add.rectangle(0, 0, panelW, panelH, UI_PALETTE.darkBrown, portrait ? 0.74 : 0.82)
      .setStrokeStyle(2, UI_PALETTE.bronze, portrait ? 0.6 : 0.72);
    this.bonusSpinText = this.add.text(0, 0, "", {
      fontFamily: BODY_FONT,
      fontSize: `${portrait ? 10 : 14}px`,
      color: UI_HEX.peach,
      stroke: UI_HEX.ink,
      strokeThickness: 3,
      align: "center",
    }).setOrigin(0.5).setVisible(false);
    this.bonusCollectText = this.add.text(0, 0, `BONUS WIN\n\u20AC${this.formatMoney(collected)}`, {
      fontFamily: UI_FONT,
      fontSize: `${portrait ? 10 : 20}px`,
      color: UI_HEX.parchment,
      stroke: UI_HEX.ink,
      strokeThickness: portrait ? 3 : 5,
      align: "center",
    }).setOrigin(0.5);
    this.bonusCollectDisplay = this.add.container(0, 0, [this.bonusCollectPanel, this.bonusSpinText, this.bonusCollectText])
      .setDepth(69)
      .setAlpha(0);
    this.layoutBonusCollectDisplay(width, height);
    this.tweens.add({ targets: this.bonusCollectDisplay, alpha: 1, duration: 180, ease: "Sine.Out" });
  }

  private updateBonusCollectDisplay(collected: number, currentSpin: number, totalSpins: number, pulse = false) {
    if (!this.bonusCollectDisplay || !this.bonusCollectText || !this.bonusSpinText) return;
    this.bonusCurrentSpin = currentSpin;
    this.bonusTotalSpins = totalSpins;
    this.updateHud();
    this.bonusCollectText.setText(`BONUS WIN\n\u20AC${this.formatMoney(collected)}`);
    if (!pulse) return;
    this.tweens.add({
      targets: this.bonusCollectDisplay,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 170,
      yoyo: true,
      ease: "Sine.Out",
    });
  }

  private hideBonusCollectDisplay() {
    if (!this.bonusCollectDisplay) return;
    this.bonusCollectDisplay.destroy(true);
    this.bonusCollectDisplay = undefined;
    this.bonusCollectPanel = undefined;
    this.bonusCollectText = undefined;
    this.bonusSpinText = undefined;
    this.bonusCurrentSpin = 0;
    this.bonusTotalSpins = 0;
    this.updateHud();
  }

  private layoutBonusCollectDisplay(width: number, height: number) {
    if (!this.bonusCollectDisplay || !this.bonusCollectPanel || !this.bonusCollectText || !this.bonusSpinText) return;
    const portrait = height > width * 1.05;
    const barH = portrait ? Math.max(142, height * 0.18) : Math.max(108, height * 0.11);
    const barTop = height - barH;
    const buySize = portrait ? Math.min(62, width * 0.13) : Math.min(68, height * 0.064);
    const clusterLeft = portrait ? Math.max(24, width * 0.08) : Math.max(276, width * 0.152);
    const buyX = clusterLeft + buySize / 2;
    const menuX = buyX + buySize * 1.22;
    const midY = barTop + barH * 0.52;
    const panelW = portrait ? Math.min(width * 0.28, 126) : Math.min(220, width * 0.14);
    const panelH = portrait ? 45 : Math.min(64, barH * 0.62);
    const x = portrait ? width * 0.365 : menuX + Math.min(270, width * 0.18);
    const y = portrait ? height - 27 : midY + 2;

    this.bonusCollectDisplay.setPosition(x, y);
    this.bonusCollectPanel.setSize(panelW, panelH).setFillStyle(UI_PALETTE.darkBrown, portrait ? 0.74 : 0.82);
    this.bonusSpinText
      .setPosition(0, 0)
      .setFontSize(portrait ? 10 : 14)
      .setOrigin(0.5)
      .setAlign("center")
      .setVisible(false);
    this.bonusCollectText
      .setPosition(0, 0)
      .setFontSize(portrait ? 10 : 20)
      .setOrigin(0.5)
      .setAlign("center");
  }

  private async showBonusTransition(titleText: string, spins: number) {
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    const blocker = this.add.rectangle(0, 0, width, height, UI_PALETTE.ink, 0.72).setOrigin(0).setInteractive({ useHandCursor: false });
    const parts: Phaser.GameObjects.GameObject[] = [blocker];

    if (this.textures.exists("bonus_transition")) {
      const image = this.add.image(width / 2, height / 2, "bonus_transition").setOrigin(0.5).setAlpha(0.9);
      image.setScale(Math.max(width / image.width, height / image.height));
      parts.push(image);
    }

    const glow = this.add.rectangle(width / 2, height / 2, Math.min(560, width * 0.76), Math.min(230, height * 0.34), UI_PALETTE.parchment, 0.82)
      .setStrokeStyle(5, UI_PALETTE.bronze, 0.95);
    const title = this.add.text(width / 2, height / 2 - 54, titleText, {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(34, Math.min(62, width * 0.05))}px`,
      color: UI_HEX.redBrown,
      stroke: UI_HEX.peach,
      strokeThickness: 6,
    }).setOrigin(0.5);
    const spinCount = this.add.text(width / 2, height / 2 + 12, `${spins} FREE SPINS`, {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(30, Math.min(54, width * 0.043))}px`,
      color: UI_HEX.darkBrown,
      stroke: UI_HEX.peach,
      strokeThickness: 6,
    }).setOrigin(0.5);
    const auto = this.add.text(width / 2, height / 2 + 74, "AUTO PLAY", {
      fontFamily: BODY_FONT,
      fontSize: `${Math.max(16, Math.min(24, width * 0.018))}px`,
      color: UI_HEX.ink,
      stroke: UI_HEX.beige,
      strokeThickness: 3,
    }).setOrigin(0.5);

    const overlay = this.add.container(0, 0, [...parts, glow, title, spinCount, auto]).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 220, ease: "Sine.Out" });
    this.tweens.add({ targets: [glow, title, spinCount], scaleX: 1.04, scaleY: 1.04, duration: 360, yoyo: true, repeat: 1, ease: "Sine.InOut" });
    await this.wait(1120);
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 220,
        ease: "Sine.In",
        onComplete: () => resolve(),
      });
    });
    overlay.destroy(true);
  }

  private async showBonusSummary(value: number, spins: number, titleText: string) {
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    const overlay = this.add.container(width / 2, height / 2).setDepth(50).setAlpha(0);
    const panel = this.add.rectangle(0, 0, 460, 220, UI_PALETTE.parchment, 0.97).setStrokeStyle(6, UI_PALETTE.bronze, 1);
    const title = this.add.text(0, -62, titleText, { fontFamily: UI_FONT, fontSize: "40px", color: UI_HEX.ink, stroke: UI_HEX.peach, strokeThickness: 3 }).setOrigin(0.5);
    const amount = this.add.text(0, 8, "0.00x", { fontFamily: UI_FONT, fontSize: "58px", color: UI_HEX.redBrown, stroke: UI_HEX.peach, strokeThickness: 4 }).setOrigin(0.5);
    const copy = this.add.text(0, 72, `${spins} free spins resolved`, { fontFamily: BODY_FONT, fontSize: "20px", color: UI_HEX.darkBrown }).setOrigin(0.5);
    overlay.add([panel, title, amount, copy]);
    const counter = { value: 0 };
    this.tweens.add({ targets: overlay, alpha: 1, scaleX: 1.04, scaleY: 1.04, duration: 280, ease: "Back.Out" });
    this.tweens.add({
      targets: counter,
      value,
      duration: Phaser.Math.Clamp(900 + value * 20, 1100, 2600),
      ease: "Cubic.Out",
      onUpdate: () => amount.setText(`${counter.value.toFixed(2)}x`),
      onComplete: () => amount.setText(`${value.toFixed(2)}x`),
    });
    await this.wait(Phaser.Math.Clamp(1800 + value * 20, 2200, 3600));
    this.tweens.add({ targets: overlay, alpha: 0, scaleX: 0.9, scaleY: 0.9, duration: 320, ease: "Sine.In", onComplete: () => overlay.destroy(true) });
    await this.wait(340);
  }

  private clearGridViews() {
    for (let col = 0; col < this.symbolViews.length; col++) {
      for (let row = 0; row < this.symbolViews[col].length; row++) {
        this.symbolViews[col][row].container.destroy(true);
      }
    }
    this.symbolViews = [];
  }

  private cellX(col: number) {
    return this.frameLeft + REEL_CENTER_X[col] * this.frameW;
  }

  private cellY(row: number) {
    return this.frameTop + ROW_CENTER_Y[row] * this.frameH + STOPPED_SYMBOL_Y_OFFSET;
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
