import 'jquery';
var $ = require('jquery');
// import {jQuery, $} from "jquery";
//import 'jquery-ajax-native';
import 'phaser';
/// <reference path="../plugins/spine_plugin.d.ts"/>
import 'jstorage';
import shared from '../config/Shared';
var game_data;
var player_data;
let BETS = shared.BETS;
let BET_POS = shared.BET_POS;
let LINES = shared.LINES;
let LINE_POS = shared.LINE_POS;
let BET = BETS[BET_POS];
let GAME_CODE;
const LOADER_COLORS = {
  ink: '#211E1C',
  parchment: '#C1B39E',
  peach: '#D8AF8E',
  bronze: '#8C6B53',
};

export default class PreloaderScene extends Phaser.Scene {
  timedEvent: Phaser.Time.TimerEvent;
  config: any;
  constructor() {
    super('Slot_GameLoad');
  }

  private readyCount: number;

  init(data) {
    game_data = data.key;
    player_data = data.keyp;
    BETS = data.bets;
    BET_POS = data.bet_pos;
    BET = data.bet;
    LINES = data.lines;
    LINE_POS = data.line_pos;
    GAME_CODE = data.game_code;
    this.readyCount = 0;
  }

  preload() {
    this.timedEvent = this.time.delayedCall(2000, this.ready, [], this);
    var progressBar = this.add.graphics();
    var progressBox = this.add.graphics();

    progressBox.fillStyle(0xA4A4A4, 0.8);
    // progressBox.fillRect(this.sys.game.config.width - 200, this.cameras.main.height + 100, 400, 50);

    var width = this.cameras.main.width;
    var height = this.cameras.main.height;
    var loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: 'bold 22px monospace',
        fill: LOADER_COLORS.peach,
        stroke: LOADER_COLORS.ink,
        strokeThickness: 5
      }
    });
    loadingText.setOrigin(0.5, 0.5);

    var percentText = this.make.text({
      x: width / 2,
      y: height / 2 - 5,
      text: '0%',
      style: {
        font: '18px monospace',
        fill: LOADER_COLORS.parchment,
        stroke: LOADER_COLORS.ink,
        strokeThickness: 4
      }
    });
    percentText.setOrigin(0.5, 0.5);

    var assetText = this.make.text({
      x: width / 2,
      y: height / 2 + 50,
      text: '',
      style: {
        font: '16px monospace',
        fill: LOADER_COLORS.parchment,
        stroke: LOADER_COLORS.ink,
        strokeThickness: 4
      }
    });

    assetText.setOrigin(0.5, 0.5);

    this.load.on('progress', function(value) {
      //percentText.setText(parseInt(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0x8C6B53, 1);
      //  progressBar.fillRect(this.cameras.main.width / 2 - 190 , this.cameras.main.height / 2 + 110, 380 * value, 30);
    });

    this.load.on('fileprogress', function(file) {
      assetText.setText('Loading asset: ' + file.key);
    });

    this.load.on('complete', function() {
      //progressBar.destroy();
      //progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
      this.ready();
    }.bind(this));
    //this.load.image('bullet', 'assets/level/bulletDark2_outline.png');
    this.load.image('preloader', 'src/assets/' + GAME_CODE + '/preloader.png');
    this.load.json('game_config', 'src/assets/' + GAME_CODE + '/config.json');
    this.config = this.game.cache.json.get('game_config');
    this.loadAssets();
  }

  loadAssets() {
    this.load.image('bg', 'src/assets/' + GAME_CODE + '/bg.png');
    this.load.image('logo', 'src/assets/' + GAME_CODE + '/logo.png');
    this.load.image('mask', 'src/assets/' + GAME_CODE + '/mask.png');
    this.load.image('mask_port', 'src/assets/' + GAME_CODE + '/mask_port.png');
    this.load.image('autobtn', 'src/assets/' + GAME_CODE + '/AutoplayButton.png');
    this.load.image('maxbtn', 'src/assets/' + GAME_CODE + '/MaxBetButton.png');
    this.load.image('minusbtn', 'src/assets/' + GAME_CODE + '/minus.png');
    this.load.image('plusbtn', 'src/assets/' + GAME_CODE + '/plus.png');
    this.load.multiatlas('symbols', 'src/assets/' + GAME_CODE + '/symbols6.json', 'src/assets/' + GAME_CODE + '/');
    this.load.multiatlas('smbw', 'src/assets/' + GAME_CODE + '/smbw.json', 'src/assets/' + GAME_CODE + '/');
    this.load.audio('sfx_win_jackpot', ['src/assets/' + GAME_CODE + '/audio/win_jackpot.mp3', 'src/assets/' + GAME_CODE + '/audio/win_jackpot.ogg']);
    this.load.audio('sfx_win_normal', ['src/assets/' + GAME_CODE + '/audio/win_normal.mp3', 'src/assets/' + GAME_CODE + '/audio/win_normal.ogg']);
    this.load.audio('sfx_wheel_start', ['src/assets/' + GAME_CODE + '/audio/wheel_start.mp3', 'src/assets/' + GAME_CODE + '/audio/wheel_start.ogg']);
    this.load.audio('sfx_wheel_stop', ['src/assets/' + GAME_CODE + '/audio/wheel_stop.mp3', 'src/assets/' + GAME_CODE + '/audio/wheel_stop.ogg']);
    this.load.audio('music_bg', ['src/assets/' + GAME_CODE + '/audio/bg.mp3', 'src/assets/' + GAME_CODE + '/audio/bg.ogg']);
    this.load.spritesheet('btn_opt_activ', 'src/assets/' + GAME_CODE + '/btn_opt_activ.png', { frameWidth: 26, frameHeight: 26 });
    this.load.spritesheet('btn_opt_normal', 'src/assets/' + GAME_CODE + '/btn_opt_normal.png', { frameWidth: 26, frameHeight: 26 });
    this.load.spritesheet('en-flag', 'src/assets/' + GAME_CODE + '/en-flag.png', { frameWidth: 66, frameHeight: 35 });
    this.load.spritesheet('es-flag', 'src/assets/' + GAME_CODE + '/es-flag.png', { frameWidth: 66, frameHeight: 35 });
    this.load.spritesheet('de-flag', 'src/assets/' + GAME_CODE + '/de-flag.png', { frameWidth: 66, frameHeight: 35 });
    this.load.image('btn_spin', 'src/assets/' + GAME_CODE + '/buttonspin.png');
    this.load.spritesheet('btn_close', 'src/assets/' + GAME_CODE + '/buttonclose.png', { frameWidth: 40, frameHeight: 40 });
    this.load.image('btn_less', 'src/assets/' + GAME_CODE + '/buttonminus.png');
    this.load.image('btn_more', 'src/assets/' + GAME_CODE + '/buttonplus.png');
    this.load.image("dummyButton", 'src/assets/' + GAME_CODE + '/scrollbar/sprite.png');
    this.load.image("track", 'src/assets/' + GAME_CODE + '/scrollbar/track.png');
    this.load.spritesheet('bar', 'src/assets/' + GAME_CODE + '/scrollbar/bar.png', { frameWidth: 22, frameHeight: 44 });
    this.load.image("track", 'src/assets/' + GAME_CODE + '/scrollbar/track.png');
    //    this.load.image("btn_info", 'src/assets/' + GAME_CODE + '/menu/info.png');
    //    this.load.image("btn_pt", 'src/assets/' + GAME_CODE + '/menu/pt.png');
    //  this.load.image("btn_settings", 'src/assets/' + GAME_CODE + '/menu/settings.png');
    this.load.image("btn_sound", 'src/assets/' + GAME_CODE + '/menu/sound.png');
    this.load.image("popup", 'src/assets/' + GAME_CODE + '/menu/popup.png');
    this.load.setPath('gctest/')
    //@ts-ignore
    //  this.load.spine('set1', 'demos.json', ['atlas1.atlas'], true);
    //@ts-ignore
    //  this.load.spine('set2', 'goblin_hp2.json', ['goblin_hp2.atlas'], true);
    //working webgl 3.8.72
    //@ts-ignore
    //  this.load.spine('set3', 'hero-pro.json', ['hero-pro.atlas'], true);
    //working canvas 3.8.72
    //@ts-ignore
    //    this.load.spine('set4', 'spineboy-ess.json', ['spineboy-ess.atlas'], true);
    //spine-ts Canvas does not support color tinting, mesh attachments and clipping. Only the alpha channel from tint colors is applied. Experimental support for mesh attachments can be enabled by setting spine.canvas.SkeletonRenderer.useTriangleRendering to true. Note that this method is slow and may lead to artifacts on some browsers.
  };

  create() {
    this.load.spritesheet('btn_squarewd', 'src/assets/' + GAME_CODE + '/buttonsquarewide.png', { frameWidth: this.cache.json.get('game_config').ui.buttons.auto.size.x, frameHeight: this.cache.json.get('game_config').ui.buttons.auto.size.y });
    // if (typeof(this.cache.json.get('game_config').ui.buttons.gameinfo) != "undefined") {
    this.load.spritesheet('btngameinfo', 'src/assets/' + GAME_CODE + '/buttoninfo.png', { frameWidth: this.cache.json.get('game_config').ui.buttons.gameinfo.size.x, frameHeight: this.cache.json.get('game_config').ui.buttons.gameinfo.size.y });
    this.add.sprite(this.cameras.main.width / 2 - 20, this.cameras.main.height / 2 - 200, 'preloader');
  }

  ready() {
    this.readyCount++;
    if (this.readyCount === 2) //&& this.scene.current !== 'Slot_bonus'
    {
      this.scene.start('Slot_Scene', {
        key: game_data, keyp: player_data, bets: BETS,
        bet_pos: BET_POS,
        bet: BET,
        lines: LINES,
        line_pos: LINE_POS,
      });
    }
  }
}
