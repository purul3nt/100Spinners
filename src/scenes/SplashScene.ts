import "phaser";

const UI_FONT = "Impact, Haettenschweiler, 'Arial Black', sans-serif";
const BODY_FONT = "'Trebuchet MS', Arial, sans-serif";
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
    const title = this.add.text(width / 2, height * 0.22, portrait ? "1000 SHOGUN\nSPINNERS" : "1000 SHOGUN SPINNERS", {
      fontFamily: UI_FONT,
      fontSize: (portrait ? Math.max(30, Math.min(46, width * 0.108)) : Math.max(36, Math.min(78, width * 0.055))) + "px",
      color: UI_HEX.peach,
      stroke: UI_HEX.ink,
      strokeThickness: 10,
      align: "center",
      lineSpacing: -6,
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height * 0.34, "4x5 PAYLINE SLOT", {
      fontFamily: BODY_FONT,
      fontSize: Math.max(18, Math.min(30, width * 0.024)) + "px",
      color: UI_HEX.parchment,
      stroke: UI_HEX.ink,
      strokeThickness: 3,
    }).setOrigin(0.5);

    const left = width / 2 - Math.min(250, width * 0.22);
    const right = width / 2 + Math.min(250, width * 0.22);
    const centerY = height * 0.55;
    const cardW = Math.min(310, width * 0.36);
    const cardH = Math.min(170, height * 0.24);
    const cardA = this.card(left, centerY, cardW, cardH, "14 PAYLINES", "Left-to-right 3/4/5 matches.");
    const cardB = this.card(right, centerY, cardW, cardH, "100x BUY", "Bonus buy recalibrated.");

    const prompt = this.add.text(width / 2, height * 0.82, "CLICK TO PLAY", {
      fontFamily: UI_FONT,
      fontSize: Math.max(28, Math.min(46, width * 0.036)) + "px",
      color: UI_HEX.peach,
      stroke: UI_HEX.ink,
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.45, duration: 620, yoyo: true, repeat: -1 });
    this.content.add([bg, shade, title, subtitle, cardA, cardB, prompt]);
  }

  private card(x: number, y: number, width: number, height: number, titleText: string, bodyText: string) {
    const container = this.add.container(0, 0);
    const panel = this.add.rectangle(x, y, width, height, UI_PALETTE.parchment, 0.94).setStrokeStyle(4, UI_PALETTE.bronze, 0.94);
    const title = this.add.text(x, y - height * 0.18, titleText, {
      fontFamily: UI_FONT,
      fontSize: Math.max(24, width * 0.105) + "px",
      color: UI_HEX.redBrown,
      stroke: UI_HEX.peach,
      strokeThickness: 5,
    }).setOrigin(0.5);
    const body = this.add.text(x, y + height * 0.18, bodyText, {
      fontFamily: BODY_FONT,
      fontSize: Math.max(15, width * 0.055) + "px",
      color: UI_HEX.ink,
      align: "center",
      wordWrap: { width: width * 0.78 },
    }).setOrigin(0.5);
    container.add([panel, title, body]);
    return container;
  }

  private startGame() {
    if (this.locked) return;
    this.locked = true;
    this.scale.off("resize", this.draw, this);
    this.scene.stop();
  }
}
