import 'phaser';
import dispatcher from '../genericScripts/EventDispatcher';
import { Scrollbar, Column, Viewport } from 'phaser-ui-tools';
import dataServer from '../Data/Data';
import shared from '../config/Shared';
import lang from '../config/language';

var LANG = lang;
let LANGUAGE = dataServer.getLanguage();
export default class UI_Info extends Phaser.GameObjects.GameObjectFactory {
  emitter: any;
  scene: any;
  config: any;
  container: any;
  settingsmenu: any;
  settingsmenubuttons: any;
  settings_fullscreen_button: any;
  settings_lang1_button: any;
  settings_lang3_button: any;
  settings_lang2_button: any;
  settings_title1: any;
  settings_title2: any;
  settings_close_button: any;
  portraitConfig: { container_x: number; close_button_x: number; };
  close_button_x: number;

  constructor(config) {
    super(config.scene)
    this.config = config.scene.cache.json.get('game_config');
    this.scene = config.scene;
    this.emitter = dispatcher.getInstance();
    this.createSettings();
    this.resetSettings();
  }

  createSettings() {
    this.emitter = dispatcher.getInstance();
    this.container = this.scene.add.container(0, 0);
    this.portraitConfig = {
      container_x: -200,
      close_button_x: 900
    };
    this.close_button_x = 1500;
    var background = this.scene.add.image(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY, "popup").setScale(5).setOrigin(0.5);
    this.settingsmenubuttons = this.scene.add.group();
    this.settings_fullscreen_button = this.settingsmenubuttons.create(this.scene.cameras.main.centerX - 100, 240, 'btn_opt_normal').setOrigin(0.5).setInteractive().on('pointerdown', () => this.PressFullScreen());
    this.settings_lang1_button = this.settingsmenubuttons.create(this.scene.cameras.main.centerX - 100, 320, 'en-flag').setOrigin(0.5).setInteractive().on('pointerdown', () => this.PressLang('en'));
    this.settings_lang2_button = this.settingsmenubuttons.create(this.scene.cameras.main.centerX - 200, 320, 'de-flag').setOrigin(0.5).setInteractive().on('pointerdown', () => this.PressLang('de'));
    this.settings_lang3_button = this.settingsmenubuttons.create(this.scene.cameras.main.centerX - 300, 320, 'es-flag').setOrigin(0.5).setInteractive().on('pointerdown', () => this.PressLang('es'));
    this.settings_title1 = this.scene.add.text(this.scene.cameras.main.centerX - 400, 140, LANG[LANGUAGE.toString()]['settings_title_1'], { font: "bold 38px Arial", fill: "#ffffff" });
    this.settings_title2 = this.scene.add.text(this.scene.cameras.main.centerX - 400, 240, LANG[LANGUAGE.toString()]['settings_title_2'], { font: "bold 38px Arial", fill: "#ffffff" });
    this.settings_close_button = this.scene.add.image(this.close_button_x, 200, 'btn_close', 0).setOrigin(0.5).setInteractive().on('pointerdown', () => this.resetSettings());

    this.container.add(background);
    this.container.add(this.settings_fullscreen_button);
    this.container.add(this.settings_lang1_button);
    this.container.add(this.settings_lang2_button);
    this.container.add(this.settings_lang3_button);
    this.container.add(this.settings_title1);
    this.container.add(this.settings_title2);
    this.container.add(this.settings_close_button);
  }

  resetSettings() {
    this.container.setVisible(!this.container.visible);
    //send info for delay on/off
    //linked to close button also
  }

  PressFullScreen() {
    this.emitter.emit("pressFullScreen");
  }

  PressLang(lang) {
    this.emitter.emit("pressLang", lang);
  }

  updateLanguage(lang) {
    this.settings_title1.text = LANG[lang.toString()]['settings_title_1'];
    this.settings_title2.text = LANG[lang.toString()]['settings_title_2'];
  }

  setSettingsPortrait() {
    this.container.x = this.portraitConfig.container_x;
    this.settings_close_button.x = this.portraitConfig.close_button_x;
  }

  setSettingsLandscape() {
    this.container.x = 0;
    this.settings_close_button.x = this.close_button_x;
  }
}
