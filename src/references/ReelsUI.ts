import 'jquery';
// var $ = require('jquery');
// import {jQuery, $} from "jquery"; //to try add jStorage Here
// import 'jquery-ajax-native';
import 'phaser';
import 'jstorage';

//var jStorage = require('jstorage');
//import {jStorage} from "jstorage";
import lang from '../config/language';
import shared from '../config/Shared';

var LANGUAGE;
if (LANGUAGE === null || LANGUAGE === undefined) { LANGUAGE = 'en'; };
var LANG = lang;
let SFX = shared.SFX;
let MUSIC = shared.MUSIC;
if (SFX === null || undefined) { SFX = true; }
if (MUSIC === null || undefined) { MUSIC = true; }
export default class ReelsUI extends Phaser.Scene {
  private settings_ani2: Phaser.Tweens.Tween;
  private gamescene: any;
  private settingsbg: Phaser.GameObjects.Sprite;
  private settingsbg_width;
  private settings_title1;
  private settings_title2;
  private settings_close_button;
  private settingsmenu;
  private settingsmenubuttons;
  private settingsbg_height;
  private settings_lang3_button;
  private settings_lang2_button;
  private settings_lang1_button;
  private settings_fullscreen_button;
  private gameScene;
  private settings_delay;
  private settings_ani;
  private settings;
  private help_delay;
  private help;
  private stopFullScreen;
  private isFullScreen;

  public config;
  public play = false;
  settings_sfx_button: any;
  MusicBG: any;
  settings_music_button: any;
  WheelStartSFX: Phaser.Sound.BaseSound;
  WinNormalSFX: Phaser.Sound.BaseSound;
  WheelStopSFX: Phaser.Sound.BaseSound;
  WinJackpotSFX: Phaser.Sound.BaseSound;
  textSettings: Phaser.GameObjects.Text;
  textAuto: any;
  textInfo: any;



  constructor() { super({ key: 'ReelsUI', active: false }); }

  init() {
    // grab reference to game scene
    this.gameScene = this.scene.get('Game');
  }

  preload() {
    this.config = this.cache.json.get('game_config');

  };


  create() {
 
    this.scene.get('Game').events.on('playON', function() { this.play = true; }, this);
    this.scene.get('Game').events.on('playOFF', function() { this.play = false; }, this);
    //this.gameScene.events.on('spinWheel1', function () {this.walze1.children.entries[3].alpha = 1;});
    this.settingsbg = this.add.sprite(this.cameras.main.centerX, -400, 'btn_spin');
    this.textAuto = this.add.text(this.config.ui.buttons.auto.x, this.config.ui.buttons.auto.y, LANG[LANGUAGE.toString()]['autoplay'], { font: "bold " + this.config.ui.buttons.auto.text_size + "px Arial", fill: "#ffffff" });
    this.textAuto.alpha = 0;
    this.textInfo = this.add.text(this.config.ui.buttons.paytable.x, this.config.ui.buttons.paytable.y, LANG[LANGUAGE.toString()]['paytable'], { font: "bold " + this.config.ui.buttons.paytable.text_size + "px Arial", fill: "#ffffff" });
    this.textInfo.alpha = 0;
    this.textSettings = this.add.text(this.config.ui.buttons.settings.x, this.config.ui.buttons.settings.y, LANG[LANGUAGE.toString()]['settings'], { font: "bold " + this.config.ui.buttons.settings.text_size + "px Arial", fill: "#ffffff" });
    this.textSettings.alpha = 1;
    this.settingsmenu = this.add.group();
    this.settingsmenubuttons = this.add.group();
    this.settings_fullscreen_button = this.settingsmenubuttons.create(this.cameras.main.centerX, 340, 'btn_opt_normal').setInteractive();
    this.settings_lang1_button = this.settingsmenubuttons.create(this.cameras.main.centerX + 100, 320, 'en-flag').setInteractive();
    this.settings_lang2_button = this.settingsmenubuttons.create(this.cameras.main.centerX + 200, 320, 'de-flag').setInteractive();
    this.settings_lang3_button = this.settingsmenubuttons.create(this.cameras.main.centerX + 300, 320, 'es-flag').setInteractive();
    this.settings_fullscreen_button.on('pointerdown', () => this.PressFullScreen());
    this.settings_lang1_button.on('pointerdown', () => this.PressLang('en'));
    this.settings_lang2_button.on('pointerdown', () => this.PressLang('de'));
    this.settings_lang3_button.on('pointerdown', () => this.PressLang('es'));
    //add bg image for settings
    //add any additional buttons needed for settings
    this.settingsbg_width = 430;
    this.settingsbg_height = 440;
    //subtitles for settings
    this.settings_title1 = this.add.text(0, 30, 'TEST', { font: "bold 38px Arial", fill: "#ffffff" });
    this.settings_title2 = this.add.text(0, 240, 'TEST2', { font: "bold 38px Arial", fill: "#ffffff" });
    //this.settings_close_button = this.settingsmenubuttons.add(this.add.button(this.settingsmenu.width +148, +477, 'ContinueButton', this.PressSettings, this, 0, 1, 2));
    // this.settingsmenubuttons.add(
    this.settings_close_button = this.add.image(500, 1000, 'plusbtn', 0).setInteractive();
    //this.settings_close_button.on('pointerover', () => { console.log('pointerover');});
    this.settings_close_button.on('pointerdown', () => this.PressSettings());
    this.settingsmenu.add(this.settings_title1);
    this.settingsmenu.add(this.settings_title2);
    this.settingsmenu.toggleVisible();
    //this.settingsmenubuttons.killAndHide(this.settingsmenubuttons);
    this.settingsmenubuttons.toggleVisible();

    //MUSIC
    this.settings_music_button = this.add.sprite(900, this.config.ui.buttons.spin.y, 'btn_spin').setInteractive({ pixelPerfect: true });
    this.settings_sfx_button = this.add.sprite(950, this.config.ui.buttons.spin.y, 'btn_spin').setInteractive({ pixelPerfect: true });
    this.settings_sfx_button.setScale(0.35);
    this.settings_music_button.setScale(0.35);
    this.settings_sfx_button.on('pointerdown', () => this.PressSFX());
    this.settings_music_button.on('pointerdown', () => this.PressMusic());
    this.WheelStartSFX = this.sound.add('sfx_wheel_start');
    this.WheelStopSFX = this.sound.add('sfx_wheel_stop');
    this.WinNormalSFX = this.sound.add('sfx_win_normal');
    this.WinJackpotSFX = this.sound.add('sfx_win_jackpot');
    this.MusicBG = this.sound.add('music_bg');
    if (MUSIC === true) {
      this.MusicBG.play('', 0, 1, true);
    }


  }

  update() {

  };

  PressLang(lang) {
    LANGUAGE = lang;
    this.UpdateLanguage();
  }
  UpdateLanguage() {
    // if (DEBUGMODE === true) {
    //   console.log('update language | new language: ' + LANGUAGE);
    //}
    // this.textAuto.text = LANG[LANGUAGE.toString()]['autoplay'];
    // this.textSettings.text = LANG[LANGUAGE.toString()]['settings'];
    // this.textInfo.text = LANG[LANGUAGE.toString()]['paytable'];
    // if (this.config.ui.text.nb_lines_text) {
    //     this.textLine.text = LANG[LANGUAGE.toString()]['lines'];
    // }
    // if (this.config.ui.text.message) {
    //     this.ValueMessage.text = LANG[LANGUAGE.toString()]['welcome'];
    // }
    if (this.config.settings) {
      this.settings_title1.text = LANG[LANGUAGE.toString()]['settings_title_1'];
      this.settings_title2.text = LANG[LANGUAGE.toString()]['settings_title_2'];
      // this.settings_opt_label1.text = LANG[LANGUAGE.toString()]['settings_opt_label_1'];
      // this.settings_opt_label2.text = LANG[LANGUAGE.toString()]['settings_opt_label_2'];
      // this.settings_opt_label3.text = LANG[LANGUAGE.toString()]['settings_opt_label_3'];
      // this.helpmenu_title1.text = LANG[LANGUAGE.toString()]['helpmenu_title'];

      // if (this.config.payout_menu) {
      // for (var c in this.faktorlables.children) {
      // this.faktorlables.children[c].kill();
      // }
      // this.UpdatePayouts();
      // }
      // if (this.config.ui.text.message) {
      // this.ValueMessage.text = '';
      // }
      console.log('language' + LANGUAGE);
      //$.jStorage.set("opt_language", LANGUAGE);

    }
  }
  PressFullScreen() {
    if (this.config.settings) {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
        //this.settings_fullscreen_button.loadTexture('btn_opt_normal');
      }
      else {
        //this.scale.startFullScreen();
        this.scale.toggleFullscreen();
        // this.settings_fullscreen_button.loadTexture('btn_opt_activ');
      }
    }
  }
  PressSFX() {
    if (SFX === true) {
      SFX = false;

    }
    else {
      SFX = true;

    }
    // $.jStorage.set(GAME_NAME + "_opt_sfx", SFX);
  };

  PressMusic() {
    if (MUSIC === true) {
      MUSIC = false;
      this.MusicBG.stop();
    }
    else {
      MUSIC = true;
      this.MusicBG.play('', 0, 1, true);

    }
    // $.jStorage.set(GAME_NAME + "_opt_music", MUSIC);
  };

  PressSettings() {
    // this.dimBackground();
    if (!this.play && !this.settings && !this.settings_delay && !this.help && !this.help_delay) {
      console.log('settings on');
      this.settingsbg.setVisible(true);
      this.settingsbg.setActive(true);
      this.settings_delay = true;
      this.settings_ani = this.tweens.add
        ({
          targets: this.settingsmenu,
          y: this.cameras.main.centerY - 250,
          x: this.cameras.main.centerX - 250,
          ease: 'Linear',
          duration: 300
        });
      this.settings_ani2 = this.tweens.add({
        targets: this.settingsbg,
        y: this.cameras.main.centerY,
        x: this.cameras.main.centerX,
        ease: 'Linear',
        duration: 300
      });
      this.settings_ani.on('complete', function() {
        console.log(this.settingsmenu.getChildren());
        this.settingsmenu.toggleVisible();
        this.settingsmenu.getChildren()[1].setActive(true);
        this.settingsmenubuttons.toggleVisible();
        // this.settingsmenubuttons.setVisible(true);
        // this.settingsmenubuttons.setActive(true);
        this.settings_delay = false;
        this.settings = true;
      }, this);
    }
    if (this.settings == true && !this.settings_delay) {
      console.log('settings off');
      this.settings_delay = true;
      this.settings_ani2 = this.tweens.add({
        targets: this.settingsbg,
        y: this.cameras.main.centerY - 800,
        x: this.cameras.main.centerX,
        ease: 'Linear',
        duration: 300
      });
      this.settings_ani2.on('start', function() {
        this.settingsmenu.toggleVisible();
        this.settingsmenubuttons.toggleVisible();
        // this.settingsmenubuttons.setVisible(true);
        // this.settingsmenubuttons.setActive(true);
        this.settings = true;
      }, this);
      this.settings_ani2.on('complete', function() {
        this.settings_delay = false;
        this.settings = false;
      },
        this);

      //   this.undimBackground();
      //     },this);
    }
  }
}
