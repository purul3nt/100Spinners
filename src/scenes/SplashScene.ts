import "phaser";

const UI_FONT = "Impact, Haettenschweiler, 'Arial Black', sans-serif";
const BODY_FONT = "'Trebuchet MS', Arial, sans-serif";

export default class SplashScene extends Phaser.Scene {
  private locked = false;
  private content?: Phaser.GameObjects.Container;

  constructor() {
    super("Splash");
  }

  create() {
    this.cameras.main.setBackgroundColor("#120f18");
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

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x120f18, 1);
    const title = this.add.text(width / 2, height * 0.22, "1000 SHOGUN SPINNERS", {
      fontFamily: UI_FONT,
      fontSize: Math.max(36, Math.min(78, width * 0.055)) + "px",
      color: "#facc15",
      stroke: "#000000",
      strokeThickness: 10,
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height * 0.34, "4x5 payline prototype", {
      fontFamily: BODY_FONT,
      fontSize: Math.max(18, Math.min(30, width * 0.024)) + "px",
      color: "#e5e7eb",
    }).setOrigin(0.5);

    const left = width / 2 - Math.min(250, width * 0.22);
    const right = width / 2 + Math.min(250, width * 0.22);
    const centerY = height * 0.55;
    const cardW = Math.min(310, width * 0.36);
    const cardH = Math.min(170, height * 0.24);
    const cardA = this.card(left, centerY, cardW, cardH, "14 PAYLINES", "Left-to-right 3/4/5 matches.");
    const cardB = this.card(right, centerY, cardW, cardH, "10x BUY", "Cheapest bonus buy only.");

    const prompt = this.add.text(width / 2, height * 0.82, "CLICK TO PLAY", {
      fontFamily: UI_FONT,
      fontSize: Math.max(28, Math.min(46, width * 0.036)) + "px",
      color: "#38bdf8",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.45, duration: 620, yoyo: true, repeat: -1 });
    this.content.add([bg, title, subtitle, cardA, cardB, prompt]);
  }

  private card(x: number, y: number, width: number, height: number, titleText: string, bodyText: string) {
    const container = this.add.container(0, 0);
    const panel = this.add.rectangle(x, y, width, height, 0x1f2937, 0.92).setStrokeStyle(4, 0xfacc15, 0.9);
    const title = this.add.text(x, y - height * 0.18, titleText, {
      fontFamily: UI_FONT,
      fontSize: Math.max(24, width * 0.105) + "px",
      color: "#facc15",
      stroke: "#000000",
      strokeThickness: 5,
    }).setOrigin(0.5);
    const body = this.add.text(x, y + height * 0.18, bodyText, {
      fontFamily: BODY_FONT,
      fontSize: Math.max(15, width * 0.055) + "px",
      color: "#ffffff",
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
