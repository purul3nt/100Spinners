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
const CELL = 118;
const REEL_FRAME_W = 1376;
const REEL_FRAME_H = 768;
const REEL_FRAME_ASPECT = REEL_FRAME_W / REEL_FRAME_H;
const REEL_FRAME_BASE_H = ROWS * CELL + 96;
const REEL_FRAME_BASE_W = REEL_FRAME_BASE_H * REEL_FRAME_ASPECT;
const REEL_CENTER_X = [184, 449, 704, 949, 1198].map((x) => x / REEL_FRAME_W);
const ROW_CENTER_Y = [0.188, 0.396, 0.604, 0.812];
const CLOUD_DRIFT_PIXELS_PER_SECOND = 9;
const SYMBOL_IMAGE_SCALE = 1.1;
const LOW_PAY_IMAGE_SCALE = 1.2;
const REEL_START_STAGGER_MS = 42;
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

export default class SlotScene extends Phaser.Scene {
  private balance = 5000;
  private bet = DEFAULT_BET;
  private lastWin = 0;
  private spinning = false;
  private grid: CellResult[][] = [];
  private symbolViews: SymbolView[][] = [];
  private reelMaskShapes: Phaser.GameObjects.Graphics[] = [];
  private reelMasks: Phaser.Display.Masks.GeometryMask[] = [];
  private lineGraphics!: Phaser.GameObjects.Graphics;
  private boardFrame!: Phaser.GameObjects.Rectangle;
  private reelFrame!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
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
  private wheelOverlay?: Phaser.GameObjects.Container;
  private rulesOverlay?: Phaser.GameObjects.Container;
  private backgroundClouds?: Phaser.GameObjects.TileSprite;
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
    this.layoutScene();
    this.scale.on("resize", this.layoutScene, this);
    this.newIdleGrid();
  }

  private createBackground() {
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    this.add.image(width / 2, height / 2, "shogun_background").setDepth(-6).setAlpha(0.96);
    this.backgroundClouds = this.add.tileSprite(width / 2, height / 2, width, height, "shogun_background_clouds")
      .setDepth(-5.5)
      .setAlpha(0.72);
    this.add.rectangle(width / 2, height / 2, width, height, 0x180f0a, 0.18).setDepth(-5);
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

    this.statusText = this.add.text(0, 0, "GOOD LUCK", {
      fontFamily: BODY_FONT,
      fontSize: "18px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(66);

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
    this.spinHitZone.on("pointerdown", () => this.spin());
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
      .setStrokeStyle(4, 0x0f172a, 1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -1, text, {
      fontFamily: UI_FONT,
      fontSize: "25px",
      color: "#111827",
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
    this.lineGraphics = this.add.graphics().setDepth(12);
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
    this.statusText.setPosition(width / 2, this.titleText.y + 45).setFontSize(Math.max(14, Math.min(21, width * 0.017)));
    this.boardFrame
      .setPosition(this.frameLeft + this.frameW * 0.035, this.frameTop + this.frameH * 0.05)
      .setSize(this.frameW * 0.93, this.frameH * 0.88);
    this.scaleBackground(width, height);
    this.reelFrame
      .setPosition(width / 2, this.frameTop + this.frameH / 2)
      .setDisplaySize(this.frameW, this.frameH);

    this.layoutBaboonFooter(width, height);

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
    this.betText.setPosition(betTextX, panelY).setFontSize(portrait ? 18 : 22).setOrigin(0, 0.5);
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
    this.statusText.setPosition(width / 2, barTop - Math.max(46, height * 0.07)).setFontSize(portrait ? 15 : 18);
  }

  private newIdleGrid() {
    const result = playPaidSpin(() => Math.random(), this.bet);
    this.grid = result.grid;
    this.renderGrid([]);
    this.drawPaylines([]);
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
    this.drawPaylines(result.lineWins);
    this.updateHud();

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

  private openBuyBonus() {
    if (this.spinning || this.bonusPanel) return;
    const cost = this.bet * BUY_BONUS_PRICE_MULTIPLIER;
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive({ useHandCursor: false });
    const panel = this.add.rectangle(0, 0, 390, 230, 0x151827, 0.98).setStrokeStyle(5, 0xfacc15, 1);
    const title = this.add.text(0, -78, "BUY BONUS", { fontFamily: UI_FONT, fontSize: "42px", color: "#facc15", stroke: "#000000", strokeThickness: 6 }).setOrigin(0.5);
    const copy = this.add.text(0, -20, `${FREE_SPINS} free spins\nCost: ${cost.toFixed(2)}`, { fontFamily: BODY_FONT, fontSize: "22px", color: "#ffffff", align: "center" }).setOrigin(0.5);
    const confirm = this.createModalButton(this.balance >= cost ? "BUY" : "NO BALANCE", this.balance >= cost ? 0xfacc15 : 0x71717a, () => this.executeBuyBonus(cost));
    confirm.setPosition(-78, 72);
    const close = this.createModalButton("CLOSE", 0x38bdf8, () => this.closeBonusPanel());
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
    const blocker = this.add.rectangle(width / 2, height / 2, width, height, 0x02030a, 0.72).setInteractive({ useHandCursor: false });
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x121322, 0.96).setStrokeStyle(5, 0xfacc15, 0.86).setInteractive({ useHandCursor: false });
    panel.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => event.stopPropagation());
    const title = this.add.text(left + 26, top + 18, "PAYTABLE & RULES", {
      fontFamily: UI_FONT,
      fontSize: `${portrait ? 28 : 36}px`,
      color: "#facc15",
      stroke: "#111111",
      strokeThickness: 6,
    }).setOrigin(0, 0);
    const closeBg = this.add.circle(left + panelW - 34, top + 34, 22, 0x181818, 1).setStrokeStyle(3, 0xffffff, 0.9).setInteractive({ useHandCursor: true });
    const closeText = this.add.text(closeBg.x, closeBg.y - 1, "X", { fontFamily: "Arial Black, Arial, sans-serif", fontSize: "24px", color: "#ffffff" }).setOrigin(0.5);
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
      color: "#38bdf8",
      stroke: "#111111",
      strokeThickness: 4,
    }).setOrigin(0, 0);
    const payColumns = this.add.text(payLeft + payW - 8, payTop - 24, "3    4    5", {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(13, rowH * 0.34)}px`,
      color: "#fef3c7",
      stroke: "#111111",
      strokeThickness: 3,
    }).setOrigin(1, 0);
    content.add([payHeader, payColumns]);

    paySymbols.forEach((symbol, index) => {
      const y = payTop + index * rowH;
      const rowBg = this.add.rectangle(payLeft + payW / 2, y + rowH / 2, payW, rowH - 4, index % 2 === 0 ? 0x1e2234 : 0x171a2a, 0.86).setStrokeStyle(1, 0x405074, 0.55);
      const assetKey = SYMBOL_IMAGE_KEYS[symbol.code];
      const icon = assetKey && this.textures.exists(assetKey)
        ? this.add.image(payLeft + rowH * 0.52, y + rowH / 2, assetKey).setDisplaySize(rowH * 0.82, rowH * 0.82).setOrigin(0.5)
        : this.add.text(payLeft + rowH * 0.52, y + rowH / 2, symbol.code, { fontFamily: UI_FONT, fontSize: `${Math.max(16, rowH * 0.42)}px`, color: "#ffffff", stroke: "#000000", strokeThickness: 4 }).setOrigin(0.5);
      const name = this.add.text(payLeft + rowH + 12, y + rowH / 2, symbol.label.toUpperCase(), {
        fontFamily: UI_FONT,
        fontSize: `${Math.max(13, rowH * 0.34)}px`,
        color: "#ffffff",
        stroke: "#111111",
        strokeThickness: 3,
      }).setOrigin(0, 0.5);
      const pays = this.add.text(payLeft + payW - 8, y + rowH / 2, `${symbol.pay3.toFixed(2)}   ${symbol.pay4.toFixed(2)}   ${symbol.pay5.toFixed(2)}x`, {
        fontFamily: BODY_FONT,
        fontSize: `${Math.max(12, rowH * 0.3)}px`,
        color: "#fef3c7",
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
      color: "#ec4899",
      stroke: "#111111",
      strokeThickness: 4,
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
      color: "#ffffff",
      lineSpacing: portrait ? 4 : 6,
      wordWrap: { width: rulesW },
    }).setOrigin(0, 0);
    const wheelTitle = this.add.text(rulesLeft, rulesTop + rulesText.height + 30, "SHURIKEN MULTIPLIERS", {
      fontFamily: UI_FONT,
      fontSize: `${portrait ? 20 : 24}px`,
      color: "#38bdf8",
      stroke: "#111111",
      strokeThickness: 4,
    }).setOrigin(0, 0);
    const wheelText = this.add.text(rulesLeft, wheelTitle.y + 34, "Possible wheel values: 2x, 3x, 5x, 8x, 10x, 15x, 20x, 50x.", {
      fontFamily: BODY_FONT,
      fontSize: `${portrait ? 14 : 15}px`,
      color: "#fef3c7",
      wordWrap: { width: rulesW },
    }).setOrigin(0, 0);
    content.add([rulesTitle, rulesText, wheelTitle, wheelText]);

    const contentBottom = Math.max(payTop + paySymbols.length * rowH, wheelText.y + wheelText.height);
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

    const assetKey = cell.code === "W1" ? "shogun_wheel" : SYMBOL_IMAGE_KEYS[cell.code];
    if (assetKey && this.textures.exists(assetKey)) {
      image = this.add.image(0, 0, assetKey).setOrigin(0.5);
      image.setScale(this.getSymbolImageScale(image, cell.code));
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
    if (highlighted) {
      this.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 240, yoyo: true, repeat: 2 });
    }
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
    const bg = this.children.list.find((child) => child instanceof Phaser.GameObjects.Image && child.texture.key === "shogun_background") as Phaser.GameObjects.Image | undefined;
    if (bg) bg.setPosition(width / 2, height / 2).setScale(Math.max(width / bg.width, height / bg.height));
    if (this.backgroundClouds) {
      const texture = this.textures.get("shogun_background_clouds").getSourceImage() as HTMLImageElement;
      const cloudScale = Math.max(width / texture.width, height / texture.height);
      this.backgroundClouds
        .setPosition(width / 2, height / 2)
        .setSize(width, height)
        .setTileScale(cloudScale, cloudScale);
    }
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
    const rowGap = CELL * this.scaleFactor;
    const topY = this.cellY(0);
    const reelPromises: Array<Promise<void>> = [];
    const reelOverlays: Phaser.GameObjects.Container[] = [];
    this.refreshReelMasks(rowGap);
    for (let col = 0; col < COLS; col++) {
      const reel = this.add.container(0, 0).setDepth(24 + col);
      reelOverlays.push(reel);
      reel.setMask(this.reelMasks[col]);

      for (let row = -2; row < ROWS + 5; row++) {
        reel.add(this.createSpinSymbol(this.randomSpinCode(), this.cellX(col), topY + row * rowGap));
      }
      reel.setVisible(false);

      reelPromises.push(new Promise((resolve) => {
        this.time.delayedCall(col * REEL_START_STAGGER_MS, () => {
          this.symbolViews[col]?.forEach((view) => view?.container.setVisible(false));
          reel.setVisible(true);
          const loop = this.tweens.add({
            targets: reel,
            y: rowGap,
            duration: 86,
            ease: "Linear",
            repeat: -1,
          });

          this.time.delayedCall(680 + col * 190, () => {
            loop.stop();
            reel.removeAll(true);
            reel.y = -rowGap * 2;
            for (let row = -2; row < ROWS + 2; row++) {
              const code = row >= 0 && row < ROWS ? finalGrid[col][row].code : this.randomSpinCode();
              reel.add(this.createSpinSymbol(code, this.cellX(col), topY + row * rowGap, false));
            }
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
          });
        });
      }));
    }
    await Promise.all(reelPromises);
    reelOverlays.forEach((reel) => reel.destroy(true));
  }

  private createSpinSymbol(code: SymbolCode, x: number, y: number, blurred = true) {
    const assetKey = code === "W1" ? "shogun_wheel" : SYMBOL_IMAGE_KEYS[code];
    if (assetKey && this.textures.exists(assetKey)) {
      const image = this.add.image(0, 0, assetKey).setOrigin(0.5);
      const scale = this.getSymbolImageScale(image, code) * this.scaleFactor;
      image.setScale(scale);
      if (code[0] === "L") image.setAlpha(0.96);
      if (!blurred) return this.add.container(x, y, [image]);

      const blurFarBehind = this.add.image(0, -24 * this.scaleFactor, assetKey).setOrigin(0.5).setScale(scale).setAlpha(0.16);
      const blurBehind = this.add.image(0, -12 * this.scaleFactor, assetKey).setOrigin(0.5).setScale(scale).setAlpha(0.3);
      const blurAhead = this.add.image(0, 12 * this.scaleFactor, assetKey).setOrigin(0.5).setScale(scale).setAlpha(0.3);
      const blurFarAhead = this.add.image(0, 24 * this.scaleFactor, assetKey).setOrigin(0.5).setScale(scale).setAlpha(0.16);
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
    const maxW = code === "W1" ? CELL * 1.08 : code[0] === "L" ? CELL * 0.76 * lowPayScale : CELL * 0.86;
    const maxH = code === "W1" ? CELL * 1.08 : code[0] === "L" ? CELL * 0.70 * lowPayScale : CELL * 0.88;
    return Math.min(maxW / image.width, maxH / image.height) * SYMBOL_IMAGE_SCALE;
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
      const rows = PAYLINES[win.lineIndex];
      for (let col = 0; col < COLS; col++) {
        const x = this.cellX(col);
        const y = this.cellY(rows[col]);
        if (col === 0) this.lineGraphics.moveTo(x, y);
        else this.lineGraphics.lineTo(x, y);
      }
      this.lineGraphics.strokePath();
    });
  }

  private updateHud() {
    this.balanceText.setText(`BALANCE\n\u20AC${this.formatMoney(this.balance)}`);
    this.betText.setText(`BET\n\u20AC${this.bet.toFixed(2)}`);
    this.winText.setText(`WIN ${this.lastWin.toFixed(2)}`);
    this.spinButton?.setAlpha(this.spinning ? 0.55 : 1);
  }

  private formatMoney(value: number) {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private flashStatus(text: string) {
    this.statusText.setText(text);
    this.tweens.add({ targets: this.statusText, alpha: 0.55, duration: 130, yoyo: true, repeat: 1 });
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

    const blocker = this.add.rectangle(0, 0, width, height, 0x020617, 0.62).setOrigin(0).setInteractive({ useHandCursor: false });
    const glow = this.add.circle(centerX, centerY, wheelSize * 0.58, 0xfacc15, 0.14);
    const ring = this.add.circle(centerX, centerY, wheelSize * 0.51, 0x070711, 0.82).setStrokeStyle(5, 0xfacc15, 0.95);
    const wheel = this.add.image(0, 0, "shogun_wheel").setDisplaySize(wheelSize, wheelSize);
    const labels = values.map((multiplier, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
      const label = this.add.text(Math.cos(angle) * labelRadius, Math.sin(angle) * labelRadius, `${multiplier}x`, {
        fontFamily: UI_FONT,
        fontSize: `${labelFont}px`,
        color: multiplier === value ? "#ffffff" : "#ffe08a",
        stroke: "#030303",
        strokeThickness: Math.max(5, Math.round(labelFont * 0.22)),
        align: "center",
      }).setOrigin(0.5);
      label.setAngle((angle * 180) / Math.PI + 90);
      return label;
    });
    const wheelParts: Phaser.GameObjects.GameObject[] = [wheel as Phaser.GameObjects.GameObject, ...labels];
    const wheelGroup = this.add.container(centerX, centerY, wheelParts).setScale(0.2).setAlpha(0);
    const pointer = this.add.triangle(centerX, centerY - wheelSize * 0.55, 0, 0, -22, -40, 22, -40, 0xfacc15, 1)
      .setStrokeStyle(4, 0x030303, 1)
      .setAngle(180);
    const title = this.add.text(centerX, centerY - wheelSize * 0.7, "SHURIKEN SPINNER", {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(34, Math.min(58, width * 0.045))}px`,
      color: "#facc15",
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5);
    const resultText = this.add.text(centerX, centerY + wheelSize * 0.66, "SPINNING...", {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(26, Math.min(42, width * 0.033))}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 7,
    }).setOrigin(0.5);
    const mathText = this.add.text(centerX, centerY + wheelSize * 0.77, `${baseWin.toFixed(2)} x ${value} = ${totalWin.toFixed(2)}`, {
      fontFamily: BODY_FONT,
      fontSize: `${Math.max(15, Math.min(22, width * 0.017))}px`,
      color: "#fde68a",
      stroke: "#000000",
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
    this.tweens.add({ targets: [resultText, mathText], alpha: 1, scaleX: 1.08, scaleY: 1.08, duration: 220, yoyo: true, ease: "Sine.Out" });
    await this.wait(950);
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

  private async playFreeSpinSequence(freeSpins: SpinResult[], totalWin: number, titleText: string) {
    if (!freeSpins.length) {
      await this.showBonusSummary(totalWin, 0, titleText);
      return;
    }

    await this.showBonusTransition(titleText, freeSpins.length);

    let collected = 0;
    for (let index = 0; index < freeSpins.length; index++) {
      const spin = freeSpins[index];
      this.flashStatus(`Free spin ${index + 1}/${freeSpins.length}`);
      await this.wait(index === 0 ? 420 : 260);
      await this.animateReelSpin(spin.grid);

      this.grid = spin.grid;
      this.lastWin = spin.totalWin;
      this.balance += spin.totalWin;
      collected += spin.totalWin;
      this.renderGrid(spin.lineWins);
      this.drawPaylines(spin.lineWins);
      this.updateHud();

      if (spin.wheelMultiplier > 0) {
        await this.showWheelSpin(spin.wheelMultiplier, spin.baseWin, spin.totalWin);
      }

      this.flashStatus(spin.totalWin > 0 ? `Free spin win ${spin.totalWin.toFixed(2)}x` : "Free spin no win");
      await this.wait(spin.totalWin > 0 ? 680 : 360);
    }

    this.lastWin = collected;
    this.updateHud();
    await this.showBonusSummary(totalWin, freeSpins.length, "FREE SPINS COMPLETE");
    this.flashStatus(totalWin > 0 ? `Bonus paid ${totalWin.toFixed(2)}x` : "Bonus complete");
  }

  private async showBonusTransition(titleText: string, spins: number) {
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    const blocker = this.add.rectangle(0, 0, width, height, 0x020617, 0.72).setOrigin(0).setInteractive({ useHandCursor: false });
    const parts: Phaser.GameObjects.GameObject[] = [blocker];

    if (this.textures.exists("bonus_transition")) {
      const image = this.add.image(width / 2, height / 2, "bonus_transition").setOrigin(0.5).setAlpha(0.9);
      image.setScale(Math.max(width / image.width, height / image.height));
      parts.push(image);
    }

    const glow = this.add.rectangle(width / 2, height / 2, Math.min(560, width * 0.76), Math.min(230, height * 0.34), 0x09090f, 0.7)
      .setStrokeStyle(5, 0xfacc15, 0.95);
    const title = this.add.text(width / 2, height / 2 - 54, titleText, {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(34, Math.min(62, width * 0.05))}px`,
      color: "#facc15",
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5);
    const spinCount = this.add.text(width / 2, height / 2 + 12, `${spins} FREE SPINS`, {
      fontFamily: UI_FONT,
      fontSize: `${Math.max(30, Math.min(54, width * 0.043))}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5);
    const auto = this.add.text(width / 2, height / 2 + 74, "AUTO PLAY", {
      fontFamily: BODY_FONT,
      fontSize: `${Math.max(16, Math.min(24, width * 0.018))}px`,
      color: "#fde68a",
      stroke: "#000000",
      strokeThickness: 4,
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
    const panel = this.add.rectangle(0, 0, 460, 220, 0x111827, 0.97).setStrokeStyle(6, 0xfacc15, 1);
    const title = this.add.text(0, -62, titleText, { fontFamily: UI_FONT, fontSize: "40px", color: "#facc15", stroke: "#000000", strokeThickness: 6 }).setOrigin(0.5);
    const amount = this.add.text(0, 8, `${value.toFixed(2)}x`, { fontFamily: UI_FONT, fontSize: "58px", color: "#ffffff", stroke: "#000000", strokeThickness: 8 }).setOrigin(0.5);
    const copy = this.add.text(0, 72, `${spins} free spins resolved`, { fontFamily: BODY_FONT, fontSize: "20px", color: "#cbd5e1" }).setOrigin(0.5);
    overlay.add([panel, title, amount, copy]);
    this.tweens.add({ targets: overlay, alpha: 1, scaleX: 1.04, scaleY: 1.04, duration: 180, yoyo: true });
    await this.wait(1500);
    overlay.destroy(true);
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
