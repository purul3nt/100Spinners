import 'jquery';
var $ = require('jquery');
// import {jQuery, $} from "jquery";
// import 'jquery-ajax-native';
import 'phaser';
import 'jstorage';
import shared from '../config/Shared';
import lang from '../config/language';
var spine: any;
var LANG = lang;
let BETS = shared.BETS;
let BET_POS = shared.BET_POS;
let LINES = shared.LINES;
let LINE_POS = shared.LINE_POS;
let BET = BETS[BET_POS];
let LINE = LINES[LINE_POS];
let LANGUAGE = shared.LANGUAGE;
let game_data = shared.game_data;
//TIme Variables
function time_from_ms(ms) {
  return new Date(ms).toISOString().slice(11, -5);
}
/**
 * Get the user time and time since beggining of session
 */
export var timeString;
export var timeText;
export var sessionStartDate = new Date();
export var sessionTimeText;
export function updateTime() {
  var time = new Date();
  sessionTimeText.text = time_from_ms(time.valueOf() - sessionStartDate.valueOf());
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  let hoursString = hours.toString();
  let minutesString = minutes.toString();
  let secondsString = seconds.toString();

  if (hours < 10) {
    hoursString = "0" + hours;
  }
  if (minutes < 10) {
    minutesString = "0" + minutes;
  }
  if (seconds < 10) {
    secondsString = "0" + seconds;
  }

  timeString = hoursString + ":" + minutesString + ":" + secondsString;
  timeText.text = timeString;
};

//Parameters ( To include in module)
const game_code = "fisherman";
const platform = "desktop";
const casino_token = "calayroche";
const currency = "EUR";
const language = "en";
const play_for_fun = 'play_for_fun';

//DEBUG LOGS
const DEBUGMODE = true;

///API Variables
var player_data = {
  balance: undefined,
  nickname: undefined,
  player_preference: undefined,
  session_token: undefined,
}
var bet_data = {
  balance: undefined,
  bonus: undefined,
  currency: undefined,
  freespin: undefined,
  is_jackpot_win: undefined,
  jackpot_amount: undefined,
  message: undefined,
  session_token: undefined,
  slot_grid: undefined,
  status: undefined,
  win_coin: undefined,
  win_currency: undefined,
  winning_combination: undefined
}
//currency and formatting
const currencyCodeToDisplay = {
  "eur": "€",
  "gbp": "£"
};
const currencyDisplay = currencyCodeToDisplay[currency.toLowerCase()];
//lines
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
//	var hexToRgb = hexToRgb;
var lines_colors = [
  '188AE2',
  '10C469',
  'F9C851',
  '3366CC',
  'DC3912',
  'FF9900',
  '109618',
  '990099',
  '3B3EAC',
  '0099C6',
  'DD4477',
  '66AA00',
  'B82E2E',
  '316395',
  '994499',
  '22AA99',
  'AAAA11',
  '6633CC',
  'E67300',
  '8B0707',
  '329262',
  '5574A6',
  '3B3EAC'
];
var now = new Date();
var GAME_PATH = '';
var GAME_NAME = 'Slot';
var CREDITS = 0;
if (LANGUAGE === null || undefined) { LANGUAGE = 'en'; }
// let BETS = [];
// let BET_POS = 0;
// var BET = BETS[BET_POS];
// let LINE_POS = 0;
// let LINE = LINES[LINE_POS];
var DECIMAL = 2;

export default class GameScene extends Phaser.Scene {
  //private game_data;
  private background;
  private CallEventTimer;
  //functional
  private shadows;
  private walze1_ani_c_3;
  private walze1_ani_c_2;
  private walze_init_ani;
  private walze1_ani_top;
  private walze1_ani_mid;
  private walze1_ani_bott;
  private play = false;
  private is_playing;
  private is_playing_wheel_1 = false;
  private is_playing_wheel_2 = false;
  private is_playing_wheel_3 = false;
  private is_playing_wheel_4 = false;
  private is_playing_wheel_5 = false;
  private help = false;
  private help_delay = false;
  private settings = false;
  private settings_delay = false;
  private autoplay = false;
  private winlines = [];
  private c_win = 0;
  private jpwin = 0;
  private jp_number = 0;
  private coin_ani = false;
  private coin_ani_c = 0;
  private nextCheckLine = 0;
  private config: any = {};
  private winText;
  private winTextValue;
  private sym_width;
  private sym_height;
  private walze1;
  private walze2;
  private walze3;
  private walze4;
  private walze5;
  private walze1_ani;
  private walze2_ani;
  private walze3_ani;
  private walze4_ani;
  private walze5_ani;
  private WheelStartSFX;
  private WheelStopSFX;
  private WinNormalSFX;
  private WinJackpotSFX;
  private wlg;
  private gamebuttons;
  private autobutton;
  private settingsbutton;
  private infobutton;
  private startbutton;
  private lineless;
  private linemore;
  private ValueLine;
  private ValueWin;
  private textLine;
  private betless;
  private betmore;
  private textBet;
  private ValueCoin;
  private textCoin;
  private label_jp;
  private label_credits;
  private label_bet;
  private label_msg;
  private ValueBalance;
  private textBalance;
  private ValueCredits;
  private ValueMessage;
  private ValueBet;
  private jpframe;
  private jpbg_width;
  private jpbg_height;
  private jpbg;
  private jpbg2;
  private jppic;
  private jpframe_title;
  private jpwin_field;
  private helpmenu;
  private helpmenubuttons;
  private helpbg_width;
  private helpbg_height;
  private helpbg;
  private helpbg2;
  private faktorlables;
  private helpmenu_close_button;
  private helpmenu_title1;
  private gameinfomenu;
  private gameinfobutton;
  private gameinfobuttons;
  private gameinfobg_width;
  private gameinfobg_height;
  private gameinfobg;
  private gameinfobg2;
  private gameinfomenu_close_button;
  private gameinfomenu_title1;
  private info_ani;
  private info_ani2;
  private settings_ani;
  private settings_ani2;
  private MusicBG;
  private ressyms;
  private coins;
  private coin;
  private bootScene;
  private reelUIScene;
  constructor() {
    super('Game');
  }

  init(data) {
    //getting api data from initial auth
    game_data = data.key;
    player_data = data.keyp;
    BETS = data.bets;
    BET_POS = data.bet_pos;
    BET = data.bet;
    LINES = data.lines;
    LINE_POS = data.line_pos;
    LINE = LINES[LINE_POS].number;

    console.log("init" + game_data + player_data);
    this.bootScene = this.scene.get('Boot');
    this.reelUIScene = this.scene.get('ReelsUI');
  };

  preload() {
    this.add.text(90, 30, "Font", { fontFamily: 'AlexBrush', fill: "#FFFFFF" });
    this.config = this.cache.json.get('game_config');
    this.load.setPath('gctest/')
    //@ts-ignore
    this.load.spine('set1', 'demos.json', ['atlas1.atlas'], true);

  };

  setReelAlpha(line) {

    line.children.entries[3].alpha = 1;
    line.children.entries[4].alpha = 0;
    line.children.entries[5].alpha = 0;
    line.children.entries[6].alpha = 0;
    line.children.entries[7].alpha = 0;
    line.children.entries[8].alpha = 0;
    line.children.entries[0].alpha = 0;
    line.children.entries[1].alpha = 1;
    line.children.entries[2].alpha = 1;
  };

  resetReelAlpha(line) {

    line.children[3].alpha = 1;
    line.children[4].alpha = 1;
    line.children[5].alpha = 1;
    line.children[6].alpha = 1;
    line.children[7].alpha = 1;
    line.children[8].alpha = 1;
    line.children[0].alpha = 1;
    line.children[1].alpha = 1;
    line.children[2].alpha = 1;
  };

  setTokenScale(line) {
    line.children.entries[3].setScale(0.35); //70
    line.children.entries[2].setScale(0.40); // 80
    line.children.entries[1].setScale(0.47); //95
  };

  setTokenAnchor(line, lineNum) {
    var startX3 = -1.20;
    var startX2 = -0.47;
    line.children.entries[3].setOrigin(startX3 + (0.50 * (lineNum - 1)), 1);
    line.children.entries[3].y = this.config.reel.start.y - ((this.config.reel.symbol.height * 2) - 95);
    line.children.entries[2].setOrigin(startX2 + (0.20 * (lineNum - 1)), 1);
    line.children.entries[2].y = this.config.reel.start.y - (this.config.reel.symbol.height - 27);
    line.children.entries[1].y = this.config.reel.start.y;
    line.children.entries[1].setOrigin(0.015, 1);
  };

  PlayWalzeAnim(line, resSymTop, resSymMid, resSymLow) {
    this.shadows.alpha = 0;
    var speed = 800;
    var art = 'Linear';
    if (this.is_playing_wheel_1) {
      var speed = 400;
      this.shadows.alpha = 0;
      this.walze_init_ani = this.tweens.add({
        targets: [line.getChildren()[2], line.getChildren()[1], line.getChildren()[3]],
        scaleY: 0.05,
        ease: art,
        duration: speed,
        alpha: { from: 0, to: 1 },
      });
      this.walze_init_ani.on('complete', function() { this.PlayWalzeAnim(line, resSymTop, resSymMid, resSymLow); console.log('recall') }, this);
    }
    else {
      if (DEBUGMODE === true) {
        console.log('play wheel' + line.toString());
      }
      this.shadows.alpha = 0;
      this.walze1_ani_top = this.tweens.add({
        targets: [line.getChildren()[3]],
        scaleY: 0.32,
        ease: art,
        duration: speed,
        alpha: { from: 0, to: 1 },
        delay: 10 + (resSymTop * 10),
      });
      //this.add.tween(line.children[3].scale).to({ y: 0.65 }, speed, art, true, 10 + (resSymTop * 10), 0, false);
      //this.walze1_ani_mid = this.add.tween(line.children[2].scale).to({ y: 0.80 }, speed, art, true, 250 + ((resSymMid + 1) * 20), 0, false);
      this.walze1_ani_mid = this.tweens.add({
        targets: [line.getChildren()[2]],
        scaleY: 0.40,
        ease: art,
        duration: speed,
        delay: 250 + ((resSymMid + 1) * 20),
      });
      //  this.walze1_ani_bott = this.add.tween(line.children[1].scale).to({ y: 0.95 }, speed, art, true, 800 + ((resSymLow + 1) * 40), 0, false);
      this.walze1_ani_bott = this.tweens.add({
        targets: [line.getChildren()[1]],
        scaleY: 0.47,
        ease: art,
        duration: speed,
        delay: 800 + ((resSymLow + 1) * 40),
      });
      //trigger initial sfx
      // if (SFX === true && resSymTop === 0) {
      //     this.walze1_ani_top.onStart.add(function () { this.WheelStartSFX.play(); }, this);
      // }
      if (line === this.walze5) {

        this.tweens.add({
          targets: this.shadows,
          alpha: { from: 0, to: 0.65 },
          ease: art,
          duration: 5000,
        });
        //  this.add.tween(this.shadows).to({ alpha: 0.65 }, 5000, Phaser.Easing.Linear.None, true, 0, 0, false);
      }

      this.walze1_ani_top.on('start', function() {
        line.getChildren()[3].setFrame('sym_' + this.ressyms[resSymTop] + '.png');
      }, this);

      this.walze1_ani_mid.on('start', function() {
        //line.children[2].frameName = 'sym_' + this.ressyms[resSymMid] + '.png';
        line.getChildren()[2].setFrame('sym_' + this.ressyms[resSymMid] + '.png');
      }, this);
      this.walze1_ani_bott.on('start', function() {
        //  line.children[1].frameName = 'sym_' + this.ressyms[resSymLow] + '.png';
        line.getChildren()[1].setFrame('sym_' + this.ressyms[resSymLow] + '.png');
      }, this);

      // this.walze1_ani_top.onStart.add(function () {
      //     line.children[3].frameName = 'sym_' + this.ressyms[resSymTop] + '.png';
      // }, this);
      // this.walze1_ani_mid.onStart.add(function () {
      //     line.children[2].frameName = 'sym_' + this.ressyms[resSymMid] + '.png';
      // }, this);
      // this.walze1_ani_bott.onStart.add(function () {
      //     line.children[1].frameName = 'sym_' + this.ressyms[resSymLow] + '.png';
      // }, this);

      //call the win function, remove the sfx
      if (line === this.walze5) {
        //  this.walze1_ani_bott.onComplete.add(function () { this.do_win(); }, this);
        this.walze1_ani_bott.on('complete', function() { this.do_win(); }, this);
      }
      // if (line === this.walze5 && SFX === true) {
      //     this.walze1_ani_top.on('start',function () { this.WheelStopSFX.play(); }, this);
      // }
    }
  };

  create() {
    //SHARED TS
    // @ts-ignore
    this.add.spine(400, 600, 'set1.spineboy', 'idle', true);
    //this.add.spine(300, 10, 'spineani', 'animation', true);
    const game_code = "fisherman";
    const platform = "desktop";
    const casino_token = "calayroche";
    const currency = "EUR";
    const language = "en";
    const play_for_fun = 'play_for_fun';
    var error_url_parameters = false;
    if (game_code === undefined || platform === undefined || casino_token === undefined || currency === undefined) {
      error_url_parameters = true;
    }

    function getURLParameter(sParam) {
      var sPageURL = window.location.search.substring(1);
      var sURLVariables = sPageURL.split('&');
      for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
          return sParameterName[1];
        }
      }
    }

    //END SHARED
    console.log(Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id));
    //this.background = this.add.sprite(0, 0, 'bg').setOrigin(0);
    this.shadows = this.add.sprite(0, 0, 'shadows').setOrigin(0);
    this.shadows.alpha = 0.55;
    this.sym_width = this.config.reel.symbol.width;
    this.sym_height = this.config.reel.symbol.height;
    var start_pos_x = this.config.reel.start.x;
    var start_pos_y = this.config.reel.start.y;
    this.walze1 = this.add.group();
    var ypos = start_pos_y;
    if (this.ressyms) {
      console.log('refresh BONUS wheel 1');
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze1.add(c);
      }
      this.setReelAlpha(this.walze1);
      this.setTokenScale(this.walze1);
      this.setTokenAnchor(this.walze1, 1);
      this.walze1.children[1].frameName = 'sym_' + this.ressyms[2] + '.png';
      this.walze1.children[2].frameName = 'sym_' + this.ressyms[1] + '.png';
      this.walze1.children[3].frameName = 'sym_' + this.ressyms[0] + '.png';
    }
    else {
      for (var i = 0; i < 9; i++) {

        var c = this.add.sprite(start_pos_x, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze1.add(c);

      }
      console.log("TEST" + this.walze1.children.entries[0].alpha);
      this.setReelAlpha(this.walze1);
      this.setTokenScale(this.walze1);
      this.setTokenAnchor(this.walze1, 1);
    }
    this.walze2 = this.add.group();
    ypos = start_pos_y;
    if (this.ressyms) {
      console.log('refresh BONUS wheel 2');
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x + this.sym_width, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze2.add(c);
      }
      this.setReelAlpha(this.walze2);
      this.setTokenScale(this.walze2);
      this.setTokenAnchor(this.walze2, 2);
      this.walze2.children[1].frameName = 'sym_' + this.ressyms[5] + '.png';
      this.walze2.children[2].frameName = 'sym_' + this.ressyms[4] + '.png';
      this.walze2.children[3].frameName = 'sym_' + this.ressyms[3] + '.png';
    }
    else {
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x + this.sym_width, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze2.add(c);
      }
      this.setReelAlpha(this.walze2);
      this.setTokenScale(this.walze2);
      this.setTokenAnchor(this.walze2, 2);
    }
    this.walze3 = this.add.group();
    ypos = start_pos_y;
    if (this.ressyms) {
      console.log('refresh BONUS wheel 3');
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x + this.sym_width * 2, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze3.add(c);
      }
      this.setReelAlpha(this.walze3);
      this.setTokenScale(this.walze3);
      this.setTokenAnchor(this.walze3, 3);
      this.walze3.children[1].frameName = 'sym_' + this.ressyms[8] + '.png';
      this.walze3.children[2].frameName = 'sym_' + this.ressyms[7] + '.png';
      this.walze3.children[3].frameName = 'sym_' + this.ressyms[6] + '.png';
    }
    else {
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x + this.sym_width * 2, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze3.add(c);
      }
      this.setReelAlpha(this.walze3);
      this.setTokenScale(this.walze3);
      this.setTokenAnchor(this.walze3, 3);
    }
    this.walze4 = this.add.group();
    ypos = start_pos_y;
    if (this.ressyms) {
      console.log('refresh BONUS wheel 4');
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x + this.sym_width * 3, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze4.add(c);
      }
      this.setReelAlpha(this.walze4);
      this.setTokenScale(this.walze4);
      this.setTokenAnchor(this.walze4, 4);
      this.walze4.children[1].frameName = 'sym_' + this.ressyms[11] + '.png';
      this.walze4.children[2].frameName = 'sym_' + this.ressyms[10] + '.png';
      this.walze4.children[3].frameName = 'sym_' + this.ressyms[9] + '.png';
    }
    else {
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x + this.sym_width * 3, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze4.add(c);
      }
      this.setReelAlpha(this.walze4);
      this.setTokenScale(this.walze4);
      this.setTokenAnchor(this.walze4, 4);
    }
    this.walze5 = this.add.group();
    ypos = start_pos_y;
    if (this.ressyms) {
      console.log('refresh BONUS wheel 5');
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x + this.sym_width * 4, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze5.add(c);
      }
      this.setReelAlpha(this.walze5);
      this.setTokenScale(this.walze5);
      this.setTokenAnchor(this.walze5, 5);
      this.walze5.children[1].frameName = 'sym_' + this.ressyms[14] + '.png';
      this.walze5.children[2].frameName = 'sym_' + this.ressyms[13] + '.png';
      this.walze5.children[3].frameName = 'sym_' + this.ressyms[12] + '.png';
    }
    else {
      for (var i = 0; i < 9; i++) {
        var c = this.add.sprite(start_pos_x + this.sym_width * 4, ypos, 'symbols', 'sym_' + Phaser.Math.Between(game_data.grid.symbols[0].id, game_data.grid.symbols[game_data.grid.symbols.length - 4].id) + '.png');
        ypos -= this.sym_height;
        this.walze5.add(c);
      }
      this.setReelAlpha(this.walze5);
      this.setTokenScale(this.walze5);
      this.setTokenAnchor(this.walze5, 5);
    }
    this.add.sprite(0, 0, 'screen').setOrigin(0)﻿;

    ///win lines
    this.wlg = this.add.group();
    var btn_winl = [];
    var btn_winl_r = [];
    var sym_begin = this.config.payline.line.start.x;
    var sym_v = this.config.payline.line.start.y;
    var sym_v_steps = this.config.payline.numbers.vertical_steps;
    var h_begin_now = this.config.payline.numbers.start;
    var h_end_now = this.config.payline.numbers.end;
    var sym_pos = 0;
    var winnumber_h = this.config.payline.numbers.height - (this.config.payline.numbers.height_offset_mult * game_data.grid.lines.length);
    this.winlines = [];
    for (i = 0; i < game_data.grid.lines.length; i++) {

      this.winlines[i] = this.wlg.add(this.GenerateLines(h_begin_now, h_end_now, sym_begin, sym_v, sym_v_steps, sym_pos, lines_colors[i], game_data.grid.lines[i].line[0][1] + 0.5, game_data.grid.lines[i].line[1][1] + 0.5, game_data.grid.lines[i].line[2][1] + 0.5, game_data.grid.lines[i].line[3][1] + 0.5, game_data.grid.lines[i].line[4][1] + 0.5, i, winnumber_h));
      sym_v += sym_v_steps;
      sym_pos++;
    }

    for (i = 0; i < game_data.grid.lines.length; i++) {
      this.wlg.children.entries[i].visible = false;
    }

    var startypos = this.config.payline.line.start.y + winnumber_h;
    var startxpos = this.config.payline.numbers.start;
    var startxpos2 = this.config.payline.numbers.end + this.config.payline.numbers.start;
    //for loop for each line
    for (var pos = 0; pos < game_data.grid.lines.length; pos++) {
      var colorFill = hexToRgb('#' + lines_colors[pos]);
      //var wl = this.textures.createCanvas('canvas',40, 40);
      var textColor = "#ffffff";
      var alphaFill = 1;
      if (!this.config.payline.numbers.style.colorbg) {
        alphaFill = 0.3;
      }
      var circleColor = "rgba(" + colorFill.r + "," + colorFill.g + "," + colorFill.b + "," + alphaFill + ")";
      var wl;
      switch (this.config.payline.numbers.style.type) {
        case "round":
          wl = new Phaser.Geom.Circle(20, 20, 20);

          break;
        case "square":
          wl.ctx.beginPath();
          wl.ctx.rect(0, 0, 43, 43);
          wl.fill(colorFill.r, colorFill.g, colorFill.b, alphaFill);
          break;
      }
      btn_winl[pos] = this.add.sprite(startxpos, startypos, wl);
      btn_winl[pos].setOrigin(0.5, 0.5);
      btn_winl_r[pos] = this.add.sprite(startxpos2, startypos, wl);
      btn_winl_r[pos].setOrigin(0.5, 0.5);
      var label_l = this.add.text(startxpos, startypos + 5, (pos + 1).toString(), { font: "bold 26px Arial", fill: textColor });
      label_l.setOrigin(0.5, 0.5);
      var label_r = this.add.text(startxpos2, startypos + 5, (pos + 1).toString(), { font: "bold 26px Arial", fill: textColor });
      label_r.setOrigin(0.5, 0.5);
      btn_winl[pos].setInteractive;
      btn_winl_r[pos].setInteractive;
      // btn_winl[pos].on('pointerover',function () { this.winline.visible = true; }, { winline: winlines[pos] });
      // btn_winl_r[pos].on('pointerover',function () { this.winline.visible = true; }, { winline: winlines[pos] });
      // btn_winl[pos].on('pointerout',function () { this.winline.visible = false; }, { winline: winlines[pos] });
      // btn_winl_r[pos].on('pointerout', function () { this.winline.visible = false; }, { winline: winlines[pos] });
      startypos += this.config.payline.numbers.vertical_steps;
    }
    this.gamebuttons = this.add.group();
    this.autobutton = this.add.sprite(this.config.ui.buttons.auto.x, this.config.ui.buttons.auto.y, 'autobtn').setInteractive({ pixelPerfect: true });
    this.autobutton.on('pointerdown', this.PressAutoplay, this, 0, 1, 2);
    this.autobutton.setOrigin(0.5);


    this.startbutton = this.add.sprite(this.config.ui.buttons.spin.x, this.config.ui.buttons.spin.y, 'btn_spin').setInteractive({ pixelPerfect: true });
    this.startbutton.on('pointerdown', this.PressPlay, this, 0, 1, 2);
    this.startbutton.setOrigin(0);

    this.lineless = this.add.sprite(this.config.ui.buttons.line_minus.x, this.config.ui.buttons.line_minus.y, 'btn_less').setInteractive({ pixelPerfect: true });
    this.lineless.on('pointerdown', this.PressLineLess, this, 0, 1, 2);
    this.lineless.setOrigin(0);

    this.linemore = this.add.sprite(this.config.ui.buttons.line_plus.x, this.config.ui.buttons.line_plus.y, 'btn_more').setInteractive({ pixelPerfect: true });
    this.linemore.on('pointerdown', this.PressLineMore, this, 0, 1, 2);
    this.linemore.setOrigin(0);
    //removed .number i.e. LINES[LINE_POS].number
    this.ValueLine = this.add.text(this.config.ui.text.nb_lines.x, this.config.ui.text.nb_lines.y, this.number_format(LINES[LINE_POS].number, 0, ',', ''), { font: "bold " + this.config.ui.text.nb_lines.font_size + "px Arial", fill: "#ffffff" });
    this.ValueLine.setOrigin(0.5);
    if (this.config.ui.text.nb_lines_text) {
      this.textLine = this.add.text(this.config.ui.text.nb_lines_text.x, this.config.ui.text.nb_lines_text.y, LANG[LANGUAGE.toString()]['lines'], { font: "bold " + this.config.ui.text.balance_text.font_size + "px Arial", fill: "#ffffff" });
    }

    this.betless = this.add.sprite(this.config.ui.buttons.bet_amount_minus.x, this.config.ui.buttons.bet_amount_minus.y, 'btn_less').setInteractive({ pixelPerfect: true });
    this.betless.on('pointerdown', this.PressBetLess, this, 0, 1, 2);
    this.betless.setOrigin(0);

    this.betmore = this.add.sprite(this.config.ui.buttons.bet_amount_plus.x, this.config.ui.buttons.bet_amount_plus.y, 'btn_more').setInteractive({ pixelPerfect: true });
    this.betmore.on('pointerdown', this.PressBetMore, this, 0, 1, 2);
    this.betmore.setOrigin(0);

    this.ValueCoin = this.add.text(this.config.ui.text.coin_value.x, this.config.ui.text.coin_value.y, this.number_format(BETS[BET_POS], DECIMAL, ',', ''), { font: "bold " + this.config.ui.text.coin_value.font_size + "px Arial", fill: "#ffffff" });
    this.ValueCoin.setOrigin(0.5, 0);
    this.ValueWin = this.add.text(this.config.ui.text.win_value_text.x, this.config.ui.text.win_value_text.y, this.number_format(bet_data.win_currency, 0, ',', ''), { font: "bold " + this.config.ui.text.win_value_text.font_size + "px Arial", fill: "#ffffff" });
    //this.gamebuttons.setAll('inputEnabled', true); --  done with set interactive
    //     this.gamebuttons.setAll('input.useHandCursor', true);
    //     this.gamebuttons.setAll('input.pixelPerfectOver', true);
    //     this.gamebuttons.setAll('input.pixelPerfectClick', true);

    this.ValueBalance = this.add.text(this.config.ui.text.balance_currency.x, this.config.ui.text.balance_currency.y, this.number_format(player_data.balance, DECIMAL, ',', ''), { font: "bold " + this.config.ui.text.balance_currency.font_size + 'px AlexBrush', fill: "#ffffff" });
    if (this.config.ui.text.balance_coin) {
      this.ValueCredits = this.add.text(this.config.ui.text.balance_coin.x, this.config.ui.text.balance_coin.y, this.number_format(player_data.balance / BETS[BET_POS], 0, ',', ''), { font: "bold " + this.config.ui.text.balance_coin.font_size + "px Arial", fill: "#ffffff" });
      //   this.ValueCredits.setOrigin = (0.5, 0);
    }
    if (this.config.ui.text.message) {
      this.ValueMessage = this.add.text(this.config.ui.text.message.x, this.config.ui.text.message.y, LANG[LANGUAGE.toString()]['welcome'], { font: "bold " + this.config.ui.text.message.font_size + "px Arial", fill: "#ffffff" });
    }
    //this.ValueBalance.setOrigin = (0.5, 0);
    if (this.config.ui.text.bet_total_value) {
      this.ValueBet = this.add.text(this.config.ui.text.bet_total_value.x, this.config.ui.text.bet_total_value.y, this.number_format(BETS[BET_POS] * Number(LINES[LINE_POS].number), DECIMAL, ',', '') + currencyDisplay, { font: "bold " + this.config.ui.text.bet_total_value.font_size + "px Arial", fill: "#ffffff" });
      this.ValueBet.setOrigin(0.5, 0);
    }
    timeText = this.add.text(1480, 1050, timeString, { fill: "#000000" });
    sessionTimeText = this.add.text(0, 1050, "00:00:00", { fill: "#000000" });
    // var timer = this.time.addEvent();
    var timer = this.time.addEvent({ delay: 1000, callback: updateTime, callbackScope: this, timeScale: 1.0, startAt: 0 });;
    // timer.repeat(1 * Phaser.Timer.SECOND, 7200, updateTime, this);
    // timer.start();
    this.winText = this.add.text(800, 460, LANG[LANGUAGE.toString()]['msg_totalwin'], { font: "bold " + "100px Arial", fill: "#FFFFFF" });
    this.winText.setOrigin(0.5);
    this.winText.stroke = '#000000';
    this.winText.strokeThickness = 8;
    this.winTextValue = this.add.text(800, 620, this.number_format(this.c_win, DECIMAL, ',', ''), { font: "bold " + "88px Arial", fill: "#FFFFFF" });
    this.winTextValue.setOrigin(0.5);
    this.winTextValue.stroke = '#000000';
    this.winTextValue.strokeThickness = 8;
    this.winText.visible = false;
    this.winTextValue.visible = false;

    //payout
    // if (this.config.payout_menu) {
    //     this.helpmenu = this.add.group();
    //     this.helpmenubuttons = this.add.group();
    //     this.helpbg_width = 1450;
    //     this.helpbg_height = 750;
    //     var helpbg = this.createCanvas('helpbg',this.helpbg_width, this.helpbg_height);
    //     helpbg.ctx.beginPath();
    //     helpbg.ctx.rect(0, 0, this.helpbg_width, this.helpbg_height);
    //     helpbg.ctx.fillStyle = '#4c2b08';
    //     helpbg.ctx.fill();
    //     this.helpbg = this.game.add.sprite(this.game.width - this.helpbg_width, 160, helpbg);
    //     var helpbg2 = this.game.add.bitmapData(this.helpbg_width - 3, this.helpbg_height - 6);
    //     helpbg2.ctx.beginPath();
    //     helpbg2.ctx.rect(0, 0, this.helpbg_width, this.helpbg_height);
    //     helpbg2.ctx.fillStyle = '#734615';
    //     helpbg2.ctx.fill();
    //     this.helpbg2 = this.game.add.sprite(this.game.width - this.helpbg_width + 3, 163, helpbg2);
    //     this.helpmenu.add(this.helpbg);
    //     this.helpmenu.add(this.helpbg2);

    //close button and pixel perfect
    //  this.helpmenu_close_button = this.helpmenu.add(this.game.add.button(this.config.ui.buttons.close_payline.x, this.config.ui.buttons.close_payline.y, 'btn_close', this.PressInfo, this, 0, 1, 2));
    //  this.helpmenubuttons.setAll('inputEnabled', true);
    // this.helpmenubuttons.setAll('input.useHandCursor', true);
    // this.helpmenubuttons.setAll('input.pixelPerfectOver', true);
    // this.helpmenubuttons.setAll('input.pixelPerfectClick', true);
    // //title
    // this.helpmenu_title1 = this.add.text(this.helpbg.x + this.helpbg.width / 2, this.helpbg.y + 30, LANG[LANGUAGE.toString()]['helpmenu_title'], { font: "bold 38px Arial", fill: "#ffffff" });
    // this.helpmenu_title1.setOrigin(0.5);
    // this.helpmenu.add(this.helpmenu_title1);
    // var ybegin = this.helpbg.y + 100;
    // var xbegin = this.helpbg.x + 40;
    // var ypos = ybegin;
    // var xpos = xbegin;

    //symbol payouts
    // 		this.faktorlables = this.add.group();
    //     var nbSymbolPayout = 0;
    //     var previousSymbolId = -1;
    //     for (var i = 0; i < game_data.grid.payouts.length; i++) {
    //         if (previousSymbolId !== game_data.grid.payouts[i].symbols[0].id) {
    //             if (nbSymbolPayout > 0 && nbSymbolPayout % 4 == 0) {
    //                 ypos += 140;
    //                 xpos = xbegin;
    //             }
    //             nbSymbolPayout++;
    //             var sSprite = this.helpmenu.create(xpos, ypos, 'symbols', 'sym_' + game_data.grid.payouts[i].symbols[0].id + '.png');
    //             sSprite.scale.setTo(0.5);
    //             var bg = this.game.add.bitmapData(201, c.height);
    //             bg.ctx.beginPath();
    //             bg.ctx.rect(0, 0, 201, c.height);
    //             bg.ctx.fillStyle = '#4c2b08';
    //             bg.ctx.fill();
    //             var bgSprite = this.game.add.sprite(c.x + c.width + 10, c.y, bg);
    //             this.helpmenu.add(bgSprite);
    //             xpos += 345;
    //         }
    //         previousSymbolId = game_data.grid.payouts[i].symbols[0].id;
    //     }
    //     this.helpmenu.add(this.faktorlables);
    //     var ybegin = this.helpbg.y + 580;
    //     var xbegin = this.helpbg.x + 117;
    //     var ypos = ybegin;
    //     var xpos = xbegin;
    //     for (var i = 0; i < game_data.grid.lines.length; i++) {
    //         var wlHelpLine = this.GenerateHelpWinline(i);
    //         if (i > 0 && i % 10 == 0) {
    //             ypos += 80;
    //             xpos = xbegin;
    //         }
    //         wlHelpLine.x = xpos;
    //         wlHelpLine.y = ypos;
    //         this.helpmenu.add(wlHelpLine);
    //         xpos += 116;
    //     }
    //     this.helpmenu.add(this.helpmenubuttons);
    //     this.helpmenu.x = this.game.width;
    // }

    //endpayout
  };

  incrementLine(i) {
    if (i < bet_data.winning_combination.length) {
      this.wlg.children.entries[bet_data.winning_combination[i][1].number - 1].visible = true;
      this.wlg.children.entries[bet_data.winning_combination[i][1].number - 1].alpha = 0;

      var tween = this.tweens.add({
        targets: this.wlg.children.entries[bet_data.winning_combination[i][1].number - 1],
        alpha: { from: 0, to: 1 },
        ease: 'Linear',       // 'Cubic', 'Elastic', 'Bounce', 'Back'
        duration: 770,
        yoyo: true
      });

      tween.on('complete', function() { i++; this.incrementLine(i); }, this);

    }
  }

  //-------------------CONTINUE FROM HERE___________________
  // SlotGame.prototype.UpdatePayouts = function () {
  // var ybegin = this.helpbg.y + 90;
  // var xbegin = this.helpbg.x + 40 - 345;
  // var ypos = JSON.parse(JSON.stringify(ybegin));
  // var ydelta = JSON.parse(JSON.stringify(ybegin));
  // var xpos = JSON.parse(JSON.stringify(xbegin));
  // var t;
  // var nbSymbolPayout = 0;
  // var previousSymbolId = -1;
  // for (var i = 0; i < game_data.grid.payouts.length; i++) {
  // if (previousSymbolId !== game_data.grid.payouts[i].symbols[0].id) {
  // if (nbSymbolPayout > 0 && nbSymbolPayout % 4 == 0) {
  // ypos += 140;
  // xpos = JSON.parse(JSON.stringify(xbegin));
  // }
  // ydelta = JSON.parse(JSON.stringify(ypos));
  // xpos += 345;
  // nbSymbolPayout++;
  // }
  // t = this.game.add.text(xpos + 120, ydelta + 10, game_data.grid.payouts[i].length + ' = ' + LANG[LANGUAGE.toString()]['coin'] + ' x' + game_data.grid.payouts[i].pay_multiplier, { font: "bold 20px Arial", fill: "#ffffff" });
  // this.faktorlables.add(t);
  // ydelta = 16 + t.y;
  // previousSymbolId = game_data.grid.payouts[i].symbols[0].id;
  // }
  // };
  PressAutoplay() {
    if (this.autoplay === true) {
      console.log("autoplay OFF");
      this.autoplay = false;
      this.autobutton.tint = this.config.ui.buttons.auto.tint_off;
    }
    else {
      console.log("autoplay ON");
      this.autoplay = true;
      this.autobutton.tint = this.config.ui.buttons.auto.tint_on;
    }
    if (this.autoplay === true) {
      this.InitPlay();
    }
  };
  // SlotGame.prototype.PressInfo = function () {
  // if (!this.play && !this.settings && !this.settings_delay && !this.help && !this.help_delay) {
  // this.help_delay = true;
  // this.info_ani = this.add.tween(this.helpmenu).to({ x: 0 }, 300, Phaser.Easing.Linear.None, true, 500);
  // this.info_ani.onComplete.add(function () {
  // this.help_delay = false;
  // this.help = true;
  // }, this);
  // }
  // if (this.help == true && !this.help_delay) {
  // this.help_delay = true;
  // this.info_ani2 = this.add.tween(this.helpmenu).to({ x: this.game.width }, 300, Phaser.Easing.Linear.None, true, 500);
  // this.info_ani2.onComplete.add(function () {
  // this.help_delay = false;
  // this.help = false;
  // }, this);
  // }
  // };
  // SlotGame.prototype.ShowGameInfo = function () {
  // if (!this.play && !this.settings && !this.settings_delay && !this.help && !this.help_delay) {
  // this.game.scale.stopFullScreen();
  // this.settings_fullscreen_button.loadTexture('btn_opt_normal');
  // this.help_delay = true;
  // overlay(this.config.ui.text.game_rule.html);
  // this.help_delay = false;
  // this.help = false;
  // }
  // if (this.help == true && !this.help_delay) {
  // this.game.scale.stopFullScreen();
  // this.settings_fullscreen_button.loadTexture('btn_opt_normal');
  // this.help_delay = true;
  // overlay(this.config.ui.text.game_rule.html);
  // this.help_delay = false;
  // this.help = false;
  // }
  // };

  PressBetLess() {
    if (DEBUGMODE === true) {
      console.log('count bet pos: ' + BETS.length);
      console.log('bet old pos: ' + BET_POS);
      console.log('bet old: ' + BET);
    }
    if (BET_POS > 0) {
      BET_POS--;
      BET = BETS[BET_POS];
      if (DEBUGMODE === true) {
        console.log('bet new pos: ' + BET_POS);
        console.log('bet new: ' + BET);
      }
      this.ValueCoin.text = this.number_format(BET, DECIMAL, ',', '');
      this.ValueBet.text = this.number_format(BETS[BET_POS] * LINES[LINE_POS].number, DECIMAL, ',', '') + currencyDisplay;
      this.updateCREDITS();
    }
  };
  PressBetMore() {
    if (DEBUGMODE === true) {
      console.log('count bet pos: ' + BETS.length);
      console.log('bet old pos: ' + BET_POS);
      console.log('bet old: ' + BET);
    }
    if (BET_POS < BETS.length - 1) {
      BET_POS++;
      BET = BETS[BET_POS];
      if (DEBUGMODE === true) {
        console.log('bet new pos: ' + BET_POS);
        console.log('bet new: ' + BET);
      }
      this.ValueCoin.text = this.number_format(BET, DECIMAL, ',', '');
      this.ValueBet.text = this.number_format(BETS[BET_POS] * LINES[LINE_POS].number, DECIMAL, ',', '') + currencyDisplay;
      this.updateCREDITS();
    }
  };
  PressLineLess() {
    if (DEBUGMODE === true) {
      console.log('count Line pos: ' + LINES.length);
      console.log('Line old pos: ' + LINE_POS);
      console.log('Line old: ' + LINE);
    }
    if (LINE_POS > 0) {
      LINE_POS--;
      LINE = LINES[LINE_POS].number;
      if (DEBUGMODE === true) {
        console.log('Line new pos: ' + LINE_POS);
        console.log('Line new: ' + LINE);
      }
      this.ValueLine.text = this.number_format(LINE, 0, ',', '');
      this.ValueBet.text = this.number_format(BETS[BET_POS] * LINES[LINE_POS].number, DECIMAL, ',', '') + currencyDisplay;
    }
  };
  PressLineMore() {
    if (DEBUGMODE === true) {
      console.log('count Line pos: ' + LINES.length);
      console.log('Line old pos: ' + LINE_POS);
      console.log('Line old: ' + LINE);
    }
    if (LINE_POS < LINES.length - 1) {
      LINE_POS++;
      LINE = LINES[LINE_POS].number;
      if (DEBUGMODE === true) {
        console.log('Line new pos: ' + LINE_POS);
        console.log('Line new: ' + LINE);
      }
      this.ValueLine.text = this.number_format(LINE, 0, ',', '');
      this.ValueBet.text = this.number_format(BETS[BET_POS] * LINES[LINE_POS].number, DECIMAL, ',', '') + currencyDisplay;
    }
  };
  PressPlay() {
    if (!this.play && !this.help && !this.settings) {
      console.log("Bet requested !");
      this.InitPlay();
      this.startbutton.tint = '0xcccccc';
    }
    else if (this.play && this.autoplay) {
      this.PressAutoplay();
    }
  };
  InitPlay() {
    this.events.emit('playON');
    this.play = true;
    // for (var i = 0; i < game_data.grid.lines.length; i++) {
    //     this.winlines[i].visible = false;
    // }
    this.jpwin = 0;
    this.jp_number = 0;
    this.nextCheckLine = 0;
    this.walze1.y = 0;
    //testing

    this.walze2.y = 0;
    this.walze3.y = 0;
    this.walze4.y = 0;
    this.walze5.y = 0;
    this.PlayWalze();
    if (this.config.ui.text.message) {
      this.ValueMessage.text = LANG[LANGUAGE.toString()]['msg_play'];
    }
    this.ressyms = [];
    var that = this;
    var bootScene = this.scene.get('Boot');
    player_data.balance -= BETS[BET_POS] * LINES[LINE_POS].number;
    console.log('initplay balance' + player_data.balance);
    console.log('LINES[LINE_POS].number' + LINES[LINE_POS].number);
    that.updateCREDITS();
    $.ajax({
      contentType: 'application/json',
      dataType: 'json',
      type: 'POST',
      data: JSON.stringify({
        'game_code': game_code,
        'session_token': player_data.session_token,
        'amount': LINES[LINE_POS].number,
        'type': 'bet',
        'currency': 'EUR',
        'coin_value': BETS[BET_POS],
        'lines_played': LINES[LINE_POS].number,
      }),
      url: 'https://backend.wonderlandgaming.com/casino/slots/bet',
      async: false,
      success: function(data) {
        if (//bootScene.
          //		GameScene.ts:1109 Uncaught TypeError: this.isValidStatus is not a function
          that.isValidStatus(data.status)) {
          bet_data.balance = data.balance;
          bet_data.bonus = data.bonus;
          bet_data.currency = data.currency;
          bet_data.freespin = data.freebet;
          bet_data.is_jackpot_win = data.is_jackpot_win;
          bet_data.jackpot_amount = data.jackpot_amount;
          bet_data.message = data.message;
          bet_data.session_token = data.session_token;
          bet_data.slot_grid = data.slot_grid;
          bet_data.status = data.status;
          bet_data.win_coin = data.win_coin;
          bet_data.win_currency = data.win_currency;
          bet_data.winning_combination = data.winning_combination;
          for (var i = 0; i < bet_data.slot_grid.length; i++) {
            for (var j = 0; j < bet_data.slot_grid[i].length; j++) {
              that.ressyms.push(bet_data.slot_grid[i][j][1].id);
            }
          }
        }
        // else {
        //     createModal(data.message);
        //     showMessageModal();
        // }
        that.StopWalze();
        console.log('StopWalze + balance ' + bet_data.balance);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        //                  createModal(errorThrown, true);
        //                    showMessageModal();
      }
    });
  };
  isValidStatus(status) {
    return status === 0 || (status >= 200 && status < 300);
  };

  GenerateLines(begin_pos, end_pos, sym_begin, sym_v, sym_v_steps, sym_pos, color, vpos1, vpos2, vpos3, vpos4, vpos5, vdif, winnumber_h) {
    var winl = this.add.graphics({ x: begin_pos, y: sym_v + winnumber_h });
    winl.beginPath();
    winl.lineStyle(10, parseInt('0x' + color), 0.8);
    winl.moveTo(begin_pos, 0);
    //winl.lineTo(begin_pos, sym_v + winnumber_h);
    winl.lineTo(this.sym_width * 0.5 + (sym_begin - begin_pos), this.sym_height * vpos1 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(this.sym_width * 1.5 + (sym_begin - begin_pos), this.sym_height * vpos2 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(this.sym_width * 2.5 + (sym_begin - begin_pos), this.sym_height * vpos3 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(this.sym_width * 3.5 + (sym_begin - begin_pos), this.sym_height * vpos4 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(this.sym_width * 4.5 + (sym_begin - begin_pos), this.sym_height * vpos5 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(end_pos, 0);
    winl.strokePath();
    return winl;
  };
  PlayWalze() {
    this.is_playing_wheel_1 = true;
    this.is_playing_wheel_2 = true;
    this.is_playing_wheel_3 = true;
    this.is_playing_wheel_4 = true;
    this.is_playing_wheel_5 = true;
    this.PlayWalzeAnim(this.walze1, 0, 1, 2);
    this.PlayWalzeAnim(this.walze2, 3, 4, 5);
    this.PlayWalzeAnim(this.walze3, 6, 7, 8);
    this.PlayWalzeAnim(this.walze4, 9, 10, 11);
    this.PlayWalzeAnim(this.walze5, 12, 13, 14);
  };
  StopWalze() {
    this.is_playing_wheel_1 = false;
    this.is_playing_wheel_2 = false;
    this.is_playing_wheel_3 = false;
    this.is_playing_wheel_4 = false;
    this.is_playing_wheel_5 = false;
  };

  do_win() {
    if (bet_data.win_coin > 0) {
      this.toggleInput();
      this.c_win += bet_data.win_currency;
      for (var i = 0; i < bet_data.winning_combination.length; i++) {
        //to check reference to this.winlines
        console.log('do_win winlines' + this.winlines[bet_data.winning_combination[i][1].number - 1].visible + this.winlines[bet_data.winning_combination[i][1].number - 1]);
        //  this.winlines[bet_data.winning_combination[i][1].number - 1].visible = true;
        this.wlg.children.entries[bet_data.winning_combination[i][1].number - 1].visible = true;
        if (this.config.ui.text.message) {
          this.ValueMessage.text = LANG[LANGUAGE.toString()]['msg_win'] + ' ' + this.number_format(bet_data.win_currency, DECIMAL, ',', '');
        }
      }
      //this.incrementLine(0);
      this.CallEventTimer = this.time.addEvent({
        delay: 3000,
        callback: this.remove_win,
        callbackScope: this
      });
    }
    this.initFinishGame();
  };
  remove_win() {
    this.toggleInput();
    if (bet_data.win_coin > 0) {
      for (var i = 0; i < bet_data.winning_combination.length; i++) {
        this.wlg.children.entries[bet_data.winning_combination[i][1].number - 1].visible = false;
      }
      console.log('remove_win');

    }

  };
  toggleInput() {
    if (!this.startbutton.input.enabled) {
      this.startbutton.input.enabled = true;
    }
    else {
      this.startbutton.input.enabled = false;
    }
  };

  initFinishGame() {
    var waitTime = 100;
    if (this.c_win > 0) {
      waitTime = waitTime * 1;
      // this.winTextValue.text = this.number_format(this.c_win, DECIMAL, ',', '');
      // this.winText.alpha = 0.1;
      // this.winTextValue.alpha = 0.1;
      // this.winText.scale.x = 1;
      // this.winTextValue.scale.x = 1;
      // this.winText.scale.y = 1;
      // this.winTextValue.scale.y = 1;
      // this.winText.visible = true;
      // this.winTextValue.visible = true;
      // // this.game.add.tween(this.winText).to({ alpha: 1 }, 2000, "Linear", true);
      // this.game.add.tween(this.winTextValue).to({ alpha: 1 }, 2000, "Linear", true);
      // this.game.add.tween(this.winText.scale).to({ x: 2, y: 2 }, 2000, Phaser.Easing.Bounce.Out, true);
      // this.game.add.tween(this.winTextValue.scale).to({ x: 2, y: 2 }, 2000, Phaser.Easing.Bounce.Out, true);
      if (this.config.ui.text.message) {
        this.ValueMessage.text = LANG[LANGUAGE.toString()]['msg_totalwin'] + ' ' + this.number_format(this.c_win, DECIMAL, ',', '');
      }
      this.c_win = 0;
    }
    else {
      if (this.config.ui.text.message) {
        this.ValueMessage.text = LANG[LANGUAGE.toString()]['msg_nowins'];
      }
    }
    //https://rexrainbow.github.io/phaser3-rex-notes/docs/site/timer/
    ///----previously 1 second delay to finishgame
    // this.time.delayedCall({
    // 	delay: waitTime,
    // 	callback: this.FinishGame,
    // 	callbackScope: this
    // });

    this.FinishGame();
  };
  FinishGame() {
    this.events.emit('playOFF');
    console.log("Finishgame ***");
    this.winText.visible = false;
    this.winTextValue.visible = false;
    player_data.balance = bet_data.balance;
    this.updateCREDITS();
    if (this.autoplay === true) {
      this.InitPlay();
    }
    else {
      this.play = false;
      this.startbutton.tint = '0xffffff';
    }
  };
  updateCREDITS() {
    if (this.config.ui.text.balance_coin) {
      this.ValueCredits.text = this.number_format(player_data.balance / BETS[BET_POS], 0, ',', '');
    }
    this.ValueBalance.text = this.number_format(player_data.balance, DECIMAL, ',', '');
    //  this.ValueWin.text = this.number_format(bet_data.win_currency, DECIMAL, ',', '');
    this.ValueWin.text = this.number_format(bet_data.win_currency, DECIMAL, ',', '');
  };
  number_format(number, decimals, decPoint, thousandsSep) {
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number;
    var prec = !isFinite(+decimals) ? 0 : Math.abs(decimals);
    var sep = (typeof thousandsSep === 'undefined') ? ',' : thousandsSep;
    var dec = (typeof decPoint === 'undefined') ? '.' : decPoint;
    var toFixedFix = function(n, prec) {
      var k = Math.pow(10, prec);
      return '' + (Math.floor(n * k) / k).toFixed(prec);
    };
    var s = (prec ? toFixedFix(n, prec) : '' + Math.floor(n)).split('.');
    if (s[0].length > 3) {
      s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
      s[1] = s[1] || '';
      s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
  }


  update() {
    // if (this.config.settings) {
    //     if (this.game.scale.isFullScreen) {
    //         this.settings_fullscreen_button.loadTexture('btn_opt_activ');
    //     }
    //     else {
    //         this.settings_fullscreen_button.loadTexture('btn_opt_normal');
    //     }
    // }

  };
}
