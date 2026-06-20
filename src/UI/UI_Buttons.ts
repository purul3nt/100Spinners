import 'phaser';
import dispatcher from '../genericScripts/EventDispatcher';
import dataServer from '../Data/Data';
import { STATE } from '../config/GameController';

export default class UI_Buttons extends Phaser.GameObjects.Sprite {

  config: any;
  gamebuttons: any;
  autobutton: Phaser.GameObjects.Sprite;
  startbutton: Phaser.GameObjects.Image;
  lineless: Phaser.GameObjects.Image;
  linemore: Phaser.GameObjects.Image;
  emitter: any;
  betless: any;
  betmore: any;
  constructor(config: { scene: any; x: any; y: any; texture?: any; }) {
    super(config.scene, config.x, config.y, config.texture)
    this.config = config.scene.cache.json.get('game_config');
    this.scene = config.scene;
    this.emitter = dispatcher.getInstance();
    this.gamebuttons = this.scene.add.group();
    // this.autobutton = this.scene.add.sprite(this.config.ui.buttons.auto.x, this.config.ui.buttons.auto.y, 'autobtn').setInteractive({ pixelPerfect: true });
    // this.autobutton.on('pointerdown', this.PressAutoplay, this);
    // this.autobutton.setOrigin(0.5);
    this.startbutton = this.scene.add.image(this.config.ui.buttons.spin.x, this.config.ui.buttons.spin.y, 'btn_spin').setInteractive({ pixelPerfect: true });
    this.startbutton.on('pointerdown', this.PressPlay, this);
    this.startbutton.setOrigin(0.5, 0);
    // this.lineless = this.scene.add.image(this.config.ui.buttons.line_minus.x, this.config.ui.buttons.line_minus.y, 'btn_less').setInteractive({ pixelPerfect: true });
    // this.lineless.on('pointerdown', this.PressLineLess, this);
    // this.lineless.setOrigin(0);
    // this.linemore = this.scene.add.image(this.config.ui.buttons.line_plus.x, this.config.ui.buttons.line_plus.y, 'btn_more').setInteractive({ pixelPerfect: true });
    // this.linemore.on('pointerdown', this.PressLineMore, this);
    // this.linemore.setOrigin(0);
    this.betless = this.scene.add.sprite(this.config.ui.buttons.bet_amount_minus.x, this.config.ui.buttons.bet_amount_minus.y, 'btn_less').setInteractive({ pixelPerfect: true });
    this.betless.on('pointerdown', this.PressBetLess, this, 0, 1, 2);
    this.betless.setOrigin(0);
    this.betmore = this.scene.add.sprite(this.config.ui.buttons.bet_amount_plus.x, this.config.ui.buttons.bet_amount_plus.y, 'btn_more').setInteractive({ pixelPerfect: true });
    this.betmore.on('pointerdown', this.PressBetMore, this, 0, 1, 2);
    this.betmore.setOrigin(0);
    this.betmore.setScale(0.5)
    this.betless.setScale(0.5)
    config.scene.add.existing(this)
  }

  PressAutoplay() {

  }
  PressPlay(button: any) {
    console.log(STATE)
    if (STATE == "idle") {
      this.emitter.emit("startPlay");

      console.log("startplay")
    }
  }
  PressLineLess() {
    this.emitter.emit("lineChangeLess");
  }
  PressLineMore() {
    this.emitter.emit("lineChangeMore");
  }

  PressBetLess() {
    this.emitter.emit("betChangeLess");
  }
  PressBetMore() {
    this.emitter.emit("betChangeMore");
  }

  togglePlayButtonAlpha() {
    this.startbutton.alpha = 1 - this.startbutton.alpha;
  }

  setButtonsPortrait() {
    var start_pos = 25;
    this.startbutton.setScale(3);
    this.startbutton.x = this.scene.cameras.main.centerX;
    this.startbutton.y = this.scene.cameras.main.height * 0.7;
    this.betmore.x = start_pos;
    this.betless.x = start_pos;
    this.betless.y = this.scene.cameras.main.height * 0.6;
    this.betmore.setScale(1);
    this.betless.setScale(1);
  }
  setButtonsLandscape() {
    this.startbutton.setScale(1);
    this.startbutton.x = this.scene.cameras.main.centerX;
    this.startbutton.y = this.config.ui.buttons.spin.y;
    this.betmore.x = this.config.ui.buttons.bet_amount_plus.x;
    this.betless.x = this.config.ui.buttons.bet_amount_minus.x;
    this.betless.y = this.config.ui.buttons.bet_amount_plus.y;
    this.betmore.setScale(0.5);
    this.betless.setScale(0.5);
  }

}
