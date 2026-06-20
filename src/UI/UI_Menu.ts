import 'phaser';
import dispatcher from '../genericScripts/EventDispatcher';
import { STATE } from '../config/GameController';

export default class UI_Menu extends Phaser.GameObjects.GameObjectFactory {
  emitter: any;
  scene: any;
  config: any;
  menuHeight: number;
  startX: number;
  settingsButton: any;
  infoButton: any;
  ptButton: any;
  soundButton: any;
  bg: any;
  menu: any;
  portraitConfig: { menu_start: number; menu_start_y: number; menu_margin: number; menu_bg_height: number; menu_scale: number; };
  bg_height: number;

  constructor(config) {
    super(config.scene)
    this.config = config.scene.cache.json.get('game_config');
    this.scene = config.scene;
    this.emitter = dispatcher.getInstance();
    this.portraitConfig = {
      menu_start: 50,
      menu_start_y: 300,
      menu_margin: 120,
      menu_bg_height: 960,
      menu_scale: 2.5
    };
    this.menuHeight = 1060;
    this.startX = 50;
    this.bg_height = 100;

    this.bg = this.scene.add.rectangle(960, 1080, 1920, this.bg_height, '0000');
    this.menu = this.scene.add.container(0, 0);
    // this.settingsButton = this.scene.add.image(this.startX, this.menuHeight, 'btn_settings').setInteractive({ pixelPerfect: true });
    // this.settingsButton.on('pointerdown', this.PressSettings, this);
    // this.settingsButton.setOrigin(0);
    // this.infoButton = this.scene.add.image(this.startX * 2, this.menuHeight, 'btn_info').setInteractive({ pixelPerfect: true });
    // this.infoButton.on('pointerdown', this.PressInfo, this);
    // this.infoButton.setOrigin(0);
    // this.ptButton = this.scene.add.image(this.startX * 3, this.menuHeight, 'btn_pt').setInteractive({ pixelPerfect: true });
    // this.ptButton.setOrigin(0);
    this.soundButton = this.scene.add.image(this.startX, this.menuHeight - 20, 'btn_sound').setInteractive({ pixelPerfect: true });
    this.soundButton.on('pointerdown', this.PressSound, this);
    this.soundButton.setOrigin(0);
    // this.menu.add(this.settingsButton);
    // this.menu.add(this.infoButton);
    // this.menu.add(this.ptButton);
    this.menu.add(this.soundButton);
    this.emitter = dispatcher.getInstance();
  }

  PressInfo() {
    if (STATE == "idle") {
      this.emitter.emit("pressInfo");
    }
  }

  PressSettings() {
    if (STATE == "idle") {
      this.emitter.emit("pressSettings");
    }
  }

  PressSound() {
    this.emitter.emit("pressSound");
  }

  setMenuPortrait() {
    this.bg.height = this.portraitConfig.menu_bg_height;
    for (var i = 0; i < this.menu.length; i++) {
      this.menu.getAt(i).x = this.portraitConfig.menu_start;
      this.menu.getAt(i).setScale(this.portraitConfig.menu_scale);
      this.menu.getAt(i).y = this.menuHeight + this.portraitConfig.menu_start_y + (this.portraitConfig.menu_margin * i);
    }
  }

  toggleButtonAlpha() {
    // this.infoButton.alpha = 1 - this.infoButton.alpha;
    // this.settingsButton.alpha = 1 - this.settingsButton.alpha;
    // this.ptButton.alpha = 1 - this.ptButton.alpha;
  }

  setMenuLandscape() {
    this.bg.height = this.bg_height;
    this.bg.width = this.scene.cameras.main.width;
  }
}
