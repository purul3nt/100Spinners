import 'phaser';
import dataServer from '../Data/Data';
import buttons from '../UI/UI_Buttons';
import text from '../UI/UI_Text';
import menu from '../UI/UI_Menu';
import info from '../UI/UI_Info';
import settings from '../UI/UI_Settings';
import ed from '../genericScripts/EventDispatcher';
import { fullScreenHandler } from '../genericScripts/HelperFuncts';
export default class UI_Buttons extends Phaser.GameObjects.GameObjectFactory {
  config: any;
  emitter: any;
  ui_buttons: any;
  ui_text: text;
  ui_menu: menu;
  ui_info: info;
  ui_settings: settings;
  scene: any;
  constructor(config: { scene: any; player_data: any; auth: any; }) {
    super(config.scene)
    this.ui_menu = new menu({ scene: config.scene });
    this.ui_buttons = new buttons({ scene: config.scene, x: 0, y: 0 });
    this.ui_text = new text({ scene: config.scene, player_data: config.player_data, auth: config.auth });
    this.ui_info = new info({ scene: config.scene });
    this.ui_settings = new settings({ scene: config.scene });
    this.scene = config.scene;
    this.emitter = ed.getInstance();
    this.setListeners()
  }
  setListeners() {
    this.emitter.on('betChangeMore', () => { this.PressBetMoreHandler(); }, this);
    this.emitter.on('betChangeLess', () => { this.PressBetLessHandler(); }, this);
    this.emitter.on('lineChangeMore', () => { this.PressLineMoreHandler(); }, this);
    this.emitter.on('lineChangeLess', () => { this.PressLineLessHandler(); }, this);
    this.emitter.on('pressInfo', () => { this.PressInfoHandler(); }, this);
    this.emitter.on('pressSettings', () => { this.PressSettingsHandler(); }, this);
    this.emitter.on('pressFullScreen', () => { this.PressFullScreenHandler(); }, this);
    this.emitter.on('pressLang', this.PressLangHandler, this);
    this.emitter.on('pressSound', this.PressSoundHandler, this);
  }

  buttonAlphaHandler() {
    this.ui_buttons.togglePlayButtonAlpha();
    this.ui_menu.toggleButtonAlpha();
  }

  PressBetMoreHandler() {
    dataServer.setBetMore();
    this.ui_text.updateBetText(dataServer.getBet(), dataServer.getLine())
  }

  PressBetLessHandler() {
    dataServer.setBetLess();
    this.ui_text.updateBetText(dataServer.getBet(), dataServer.getLine())
  }

  PressLineMoreHandler() {
    dataServer.setLineMore();
    this.ui_text.updateLineText(dataServer.getLine())
  }

  PressLineLessHandler() {
    dataServer.setLineLess();
    this.ui_text.updateLineText(dataServer.getLine())
  }

  PressInfoHandler() {
    this.ui_info.resetInfo();
  }

  PressSettingsHandler() {
    this.ui_settings.resetSettings();
  }

  PressFullScreenHandler() {
    console.log('pressFullScreen')
    fullScreenHandler(this.scene, this.ui_settings.settings_fullscreen_button);
  }

  PressLangHandler(lang) {
    this.ui_text.updateLanguage(lang);
    this.ui_settings.updateLanguage(lang);
  }
  PressSoundHandler() {
    this.scene.audio.toggleAllMusic();
  }
  toggleFreeSpinUI() {
    this.ui_text.toggleFsText();
  }

  updateFreeSpinText(value) {
    this.ui_text.updateFreeSpinText(value)
  }

  UIPortrait() {
    this.ui_buttons.setButtonsPortrait();
    this.ui_menu.setMenuPortrait();
    this.ui_settings.setSettingsPortrait();
    this.ui_text.setTextPortrait();

  }

  UILandscape() {
    this.ui_buttons.setButtonsLandscape();
    this.ui_menu.setMenuLandscape();
    this.ui_text.setTextLandscape();
    this.ui_settings.setSettingsLandscape();
  }
}
