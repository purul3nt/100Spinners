import "phaser";
import { BONUS_MULTIPLIERS, BUY_BONUS_PRICE_MULTIPLIER } from "../sixsixsixMath";

const UI_FONT = "Impact, Haettenschweiler, 'Arial Black', sans-serif";
const BODY_FONT = "'Trebuchet MS', Arial, sans-serif";
const MAX_WHEEL_MULTIPLIER = Math.max.apply(Math, BONUS_MULTIPLIERS);
const UI_PALETTE = {
  parchment: 0xC1B39E,
  beige: 0xBAAC97,
  ink: 0x211E1C,
  darkBrown: 0x3D3430,
  bronze: 0x8C6B53,
  redBrown: 0x633733,
  peach: 0xD8AF8E,
};
const UI_HEX = {
  parchment: "#C1B39E",
  beige: "#BAAC97",
  ink: "#211E1C",
  darkBrown: "#3D3430",
  bronze: "#8C6B53",
  redBrown: "#633733",
  peach: "#D8AF8E",
};

export default class SplashScene extends Phaser.Scene {
  private locked = false;
  private content?: Phaser.GameObjects.Container;

  constructor() {
    super("Splash");
  }

  create() {
    this.cameras.main.setBackgroundColor(UI_HEX.ink);
    this.draw();
    this.scale.on("resize", this.draw, this);
    this.input.once("pointerdown", () => this.startGame());
    this.input.keyboard?.once("keydown-SPACE", () => this.startGame());
    this.input.keyboard?.once("keydown-ENTER", () => this.startGame());
    if (!this.scene.isActive("Slot_Scene")) this.scene.launch("Slot_Scene");
    this.scene.bringToTop("Splash");
  }

  private draw() {
    const width = Number(this.scale.width) || 1280;
    const height = Number(this.scale.height) || 720;
    if (this.content) this.content.destroy(true);
    this.content = this.add.container(0, 0).setDepth(5);
    const portrait = height > width * 1.05;

    const bg = this.add.image(width / 2, height / 2, "splash_transition").setOrigin(0.5);
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    const shade = this.add.rectangle(width / 2, height / 2, width, height, UI_PALETTE.ink, 0.48);
    const logo = this.add.image(width / 2, portrait ? height * 0.16 : height * 0.18, "shogun_logo").setOrigin(0.5);
    const logoMaxW = portrait ? width * 0.76 : Math.min(510, width * 0.42);
    const logoMaxH = portrait ? height * 0.19 : height * 0.21;
    logo.setScale(Math.min(logoMaxW / logo.width, logoMaxH / logo.height));

    const subtitle = this.add.text(width / 2, portrait ? height * 0.31 : height * 0.34, "4x5 PAYLINE SLOT", {
      fontFamily: BODY_FONT,
      fontSize: Math.max(18, Math.min(30, width * 0.024)) + "px",
      color: UI_HEX.parchment,
      stroke: UI_HEX.ink,
      strokeThickness: 3,
    }).setOrigin(0.5);

    const featureGap = portrait ? Math.max(12, height * 0.018) : Math.max(22, width * 0.018);
    const cardW = portrait ? Math.min(width * 0.82, 390) : Math.min(340, width * 0.34);
    const cardH = portrait ? Math.min(150, height * 0.18) : Math.min(190, height * 0.26);
    const centerY = portrait ? height * 0.52 : height * 0.56;
    const left = portrait ? width / 2 : width / 2 - cardW / 2 - featureGap;
    const right = portrait ? width / 2 : width / 2 + cardW / 2 + featureGap;
    const cardA = this.featureCard(
      left,
      portrait ? centerY - cardH / 2 - featureGap / 2 : centerY,
      cardW,
      cardH,
      "MULTIPLIER WHEEL",
      `UP TO ${MAX_WHEEL_MULTIPLIER}x`,
      "wheel",
    );
    const cardB = this.featureCard(
      right,
      portrait ? centerY + cardH / 2 + featureGap / 2 : centerY,
      cardW,
      cardH,
      "BUY BONUS",
      `${BUY_BONUS_PRICE_MULTIPLIER}x BET`,
      "buy",
    );

    const prompt = this.add.text(width / 2, height * 0.82, "CLICK TO PLAY", {
      fontFamily: UI_FONT,
      fontSize: Math.max(28, Math.min(46, width * 0.036)) + "px",
      color: UI_HEX.peach,
      stroke: UI_HEX.ink,
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.45, duration: 620, yoyo: true, repeat: -1 });
    this.content.add([bg, shade, logo, subtitle, cardA, cardB, prompt]);
  }

  private featureCard(
    x: number,
    y: number,
    width: number,
    height: number,
    titleText: string,
    bodyText: string,
    type: "wheel" | "buy",
  ) {
    const container = this.add.container(0, 0);
    const panel = this.add.rectangle(x, y, width, height, UI_PALETTE.parchment, 0.94).setStrokeStyle(4, UI_PALETTE.bronze, 0.94);
    const title = this.add.text(x, y - height * 0.34, titleText, {
      fontFamily: UI_FONT,
      fontSize: Math.max(22, Math.min(34, width * 0.096)) + "px",
      color: UI_HEX.redBrown,
      stroke: UI_HEX.peach,
      strokeThickness: 5,
    }).setOrigin(0.5);

    const visualSize = Math.min(height * 0.5, width * 0.28);
    const visualY = y - height * 0.02;
    const visual = type === "wheel"
      ? this.add.image(x, visualY, "shogun_wheel").setDisplaySize(visualSize, visualSize)
      : this.add.image(x, visualY, "splash_bonus_symbol").setDisplaySize(visualSize, visualSize);
    const accent = type === "wheel"
      ? this.add.image(x, visualY - visualSize * 0.48, "shuriken_spin_pin")
        .setDisplaySize(visualSize * 0.28, visualSize * 0.28)
        .setOrigin(0.5)
      : this.add.rectangle(x, visualY, visualSize * 0.82, visualSize * 0.82, UI_PALETTE.redBrown, 0.2)
        .setStrokeStyle(3, UI_PALETTE.bronze, 0.72)
        .setAngle(45);

    const maxMultiplier = type === "wheel"
      ? this.add.text(x, visualY, `${MAX_WHEEL_MULTIPLIER}x`, {
        fontFamily: UI_FONT,
        fontSize: Math.max(20, Math.min(34, visualSize * 0.36)) + "px",
        color: UI_HEX.peach,
        stroke: UI_HEX.ink,
        strokeThickness: 6,
      }).setOrigin(0.5)
      : undefined;

    const body = this.add.text(x, y + height * 0.34, bodyText, {
      fontFamily: UI_FONT,
      fontSize: Math.max(20, Math.min(34, width * 0.09)) + "px",
      color: UI_HEX.ink,
      stroke: UI_HEX.peach,
      strokeThickness: 4,
      align: "center",
      wordWrap: { width: width * 0.78 },
    }).setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [panel, title, accent, visual, body];
    if (maxMultiplier) parts.push(maxMultiplier);
    container.add(parts);
    return container;
  }

  private startGame() {
    if (this.locked) return;
    this.locked = true;
    this.scale.off("resize", this.draw, this);
    this.scene.stop();
  }
}
