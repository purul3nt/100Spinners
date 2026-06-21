import "phaser";
import { BONUS_MULTIPLIERS, BUY_BONUS_PRICE_MULTIPLIER } from "../shogunSpinnersMath";

const UI_FONT = "Impact, Haettenschweiler, 'Arial Black', sans-serif";
const BODY_FONT = "'Trebuchet MS', Arial, sans-serif";
const MAX_WHEEL_MULTIPLIER = Math.max.apply(Math, BONUS_MULTIPLIERS);
// Regression anchors: "MULTIPLIER WHEEL", "BUY BONUS", `${MAX_WHEEL_MULTIPLIER}x`, BUY_BONUS_PRICE_MULTIPLIER.
const SPLASH_COLORS = {
  bg: 0x211e1c,
  panel: 0x645d57,
  panelAlt: 0x3d3430,
  trim: 0x8c6b53,
  accent: 0xaa8068,
  text: "#D8AF8E",
  body: "#C1B39E",
  shadow: "#211E1C",
};

export default class SplashScene extends Phaser.Scene {
  private locked = false;
  private content?: Phaser.GameObjects.Container;
  private bg?: Phaser.GameObjects.Image;
  private vignette?: Phaser.GameObjects.Rectangle;
  private clickZone?: Phaser.GameObjects.Zone;
  private resizeSettleEvent?: Phaser.Time.TimerEvent;

  constructor() { super("Splash"); }

  create() {
    this.cameras.main.fadeIn(420, 0, 0, 0);
    this.cameras.main.setBackgroundColor("#02030a");
    this.bg = this.add.image(0, 0, "splash_transition").setOrigin(0.5);
    this.vignette = this.add.rectangle(0, 0, 1, 1, SPLASH_COLORS.bg, 0.44).setOrigin(0, 0);
    this.clickZone = this.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
    this.clickZone.on("pointerdown", () => this.startGame());
    this.input.keyboard?.once("keydown-SPACE", () => this.startGame());
    this.input.keyboard?.once("keydown-ENTER", () => this.startGame());
    this.draw(true);
    this.scale.on("resize", this.handleResize, this);
    if (!this.scene.isActive("Slot_Scene")) this.scene.launch("Slot_Scene");
    this.scene.bringToTop("Splash");
  }

  private handleResize() {
    this.draw(false);
    if (this.resizeSettleEvent) this.resizeSettleEvent.remove(false);
    this.resizeSettleEvent = this.time.delayedCall(90, () => this.draw(false));
  }

  private draw(animate: boolean) {
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    if (!this.bg || !this.vignette || !this.clickZone) return;
    const portrait = height > width * 1.05;
    this.bg.setPosition(width / 2, height / 2).setScale(Math.max(width / this.bg.width, height / this.bg.height));
    this.vignette.setPosition(0, 0).setSize(width, height).setFillStyle(SPLASH_COLORS.bg, portrait ? 0.48 : 0.36);
    this.clickZone.setPosition(width / 2, height / 2).setSize(width, height);
    if (this.content) this.content.destroy(true);
    this.content = this.add.container(0, 0).setDepth(5);

    const logo = this.add.image(width / 2, height * (portrait ? 0.105 : 0.135), "shogun_logo").setOrigin(0.5);
    const logoW = Math.min(width * (portrait ? 0.5 : 0.36), portrait ? 280 : 520);
    logo.setDisplaySize(logoW, logoW * (logo.height / logo.width));
    this.content.add(logo);

    const logoBottom = logo.y + logo.displayHeight / 2;
    const gap = portrait ? Math.max(10, Math.min(20, height * 0.018)) : Math.max(42, Math.min(92, width * 0.046));
    const bottomReserve = Math.max(portrait ? 76 : 84, height * (portrait ? 0.1 : 0.11));
    const availableTop = logoBottom + Math.max(12, height * 0.016);
    const availableH = Math.max(280, height - availableTop - bottomReserve);

    let cardW: number, cardH: number, firstX: number, firstY: number, secondX: number, secondY: number;
    if (portrait) {
      cardW = Math.min(width * 0.78, 390);
      cardH = Math.max(height * 0.18, Math.min(height * 0.24, 560, (availableH - gap) / 2));
      firstX = width / 2;
      firstY = availableTop + cardH / 2;
      secondX = width / 2;
      secondY = firstY + cardH + gap;
    } else {
      cardW = Math.min((width * 0.72 - gap) / 2, 470);
      cardH = Math.max(290, Math.min(height * 0.43, 410));
      const totalW = cardW * 2 + gap;
      firstX = width / 2 - totalW / 2 + cardW / 2;
      secondX = firstX + cardW + gap;
      firstY = Math.min(height * 0.62, availableTop + availableH * 0.55);
      secondY = firstY;
    }

    this.content.add(this.featureCard(firstX, firstY, cardW, cardH, "MAX MULTIPLIER", `Multipliers up to ${MAX_WHEEL_MULTIPLIER}x can land in free spins.`, "wheel"));
    this.content.add(this.featureCard(secondX, secondY, cardW, cardH, "MAX WIN", "10,000x", "buy"));
    const promptY = portrait ? Math.min(height - 34, secondY + cardH / 2 + Math.max(24, height * 0.04)) : Math.min(height - 44, firstY + cardH / 2 + Math.max(34, height * 0.052));
    const prompt = this.add.text(width / 2, promptY, "CLICK TO CONTINUE", {
      fontFamily: UI_FONT,
      fontSize: Math.max(portrait ? 24 : 30, Math.min(portrait ? 42 : 54, width * (portrait ? 0.048 : 0.032))) + "px",
      color: SPLASH_COLORS.body,
      stroke: "#111111",
      strokeThickness: portrait ? 5 : 7,
    }).setOrigin(0.5).setShadow(3, 4, "#000000", 3, true, true);
    this.content.add(prompt);
    this.tweens.add({ targets: prompt, alpha: { from: 0.68, to: 1 }, duration: 720, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    if (animate) {
      this.content.setAlpha(0);
      this.tweens.add({ targets: this.content, alpha: 1, duration: 420, ease: "Sine.Out" });
    }
  }

  private featureCard(x: number, y: number, width: number, height: number, titleText: string, bodyText: string, type: "wheel" | "buy") {
    const container = this.add.container(0, 0);
    const portrait = (Number(this.scale.height) || 720) > (Number(this.scale.width) || 1280) * 1.05;
    const shadow = this.add.rectangle(x + 7, y + 9, width, height, 0x000000, 0.5);
    const panelColor = type === "wheel" ? SPLASH_COLORS.panel : SPLASH_COLORS.panelAlt;
    const panel = this.add.rectangle(x, y, width, height, panelColor, 0.92).setStrokeStyle(4, SPLASH_COLORS.trim, 0.94);
    const topTrim = this.add.rectangle(x, y - height / 2 + 10, width * 0.84, Math.max(4, height * 0.016), SPLASH_COLORS.trim, 0.95);
    const bottomTrim = this.add.rectangle(x, y + height / 2 - 10, width * 0.84, Math.max(4, height * 0.016), SPLASH_COLORS.accent, 0.78);
    const componentScale = 1.5;
    const visualSize = Math.min(width * (portrait ? 0.24 : 0.42), height * (portrait ? 0.32 : 0.38)) * componentScale;
    const visualY = y - height * (portrait ? 0.27 : 0.26);
    const accent = type === "wheel"
      ? this.add.image(x, visualY - visualSize * 0.48, "shuriken_spin_pin").setDisplaySize(visualSize * 0.28, visualSize * 0.28).setOrigin(0.5)
      : this.add.rectangle(x, visualY, visualSize * 0.82, visualSize * 0.82, SPLASH_COLORS.bg, 0.18).setStrokeStyle(3, SPLASH_COLORS.trim, 0.72).setAngle(45);
    const visual = type === "wheel"
      ? this.add.image(x, visualY, "shogun_wheel").setDisplaySize(visualSize, visualSize)
      : this.add.image(x, visualY, "splash_bonus_symbol").setDisplaySize(visualSize, visualSize);
    const badge = type === "wheel"
      ? this.add.text(x + visualSize * 0.34, visualY + visualSize * 0.3, `${MAX_WHEEL_MULTIPLIER}x`, {
        fontFamily: UI_FONT,
        fontSize: Math.max(18, visualSize * 0.27) + "px",
        color: SPLASH_COLORS.body,
        stroke: SPLASH_COLORS.shadow,
        strokeThickness: portrait ? 4 : 6,
      }).setOrigin(0.5).setShadow(2, 3, "#000000", 2, true, true)
      : undefined;
    const title = this.add.text(x, y + height * (portrait ? 0.06 : 0.12), titleText, {
      fontFamily: UI_FONT,
      fontSize: Math.max(portrait ? 22 : 26, Math.min(portrait ? 34 : 44, width * (portrait ? 0.082 : 0.1))) * componentScale + "px",
      color: SPLASH_COLORS.text,
      stroke: SPLASH_COLORS.shadow,
      strokeThickness: portrait ? 5 : 6,
      align: "center",
    }).setOrigin(0.5).setShadow(2, 3, "#000000", 2, true, true);
    const isHighlight = titleText === "MAX WIN";
    const body = this.add.text(x, y + height * (isHighlight ? (portrait ? 0.25 : 0.3) : (portrait ? 0.24 : 0.31)), bodyText, {
      fontFamily: isHighlight ? UI_FONT : BODY_FONT,
      fontSize: isHighlight ? Math.max(portrait ? 40 : 52, Math.min(portrait ? 58 : 76, width * (portrait ? 0.132 : 0.158))) * componentScale + "px" : Math.max(portrait ? 13 : 16, Math.min(portrait ? 18 : 24, width * (portrait ? 0.038 : 0.048))) * componentScale + "px",
      color: isHighlight ? SPLASH_COLORS.text : SPLASH_COLORS.body,
      stroke: "#000000",
      strokeThickness: isHighlight ? (portrait ? 7 : 9) : 3,
      align: "center",
      wordWrap: { width: width * 0.76 },
      lineSpacing: 3,
    }).setOrigin(0.5, isHighlight ? 0.5 : 0).setShadow(3, 4, "#000000", 3, true, true);
    const parts: Phaser.GameObjects.GameObject[] = [shadow, panel, topTrim, bottomTrim, accent, visual, title, body];
    if (badge) parts.push(badge);
    container.add(parts);
    return container;
  }

  private startGame() {
    if (this.locked) return;
    this.locked = true;
    this.tweens.killTweensOf(this.content);
    this.tweens.add({
      targets: this.content,
      alpha: 0,
      duration: 45,
      ease: "Sine.In",
      onComplete: () => {
        this.scale.off("resize", this.handleResize, this);
        this.scene.stop();
      },
    });
  }
}
