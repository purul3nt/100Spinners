
import 'jquery';
var $ = require('jquery');
//import {jQuery, $} from "jquery";
//import 'jquery-ajax-native';
import 'phaser';
import 'jstorage';
import gameController from '../config/GameController';
import dispatcher from '../genericScripts/EventDispatcher';
//import 'require';
//shared.ts
import shared from '../config/Shared';
import dataServer from '../Data/Data';
let BETS = shared.BETS;
let BET_POS = shared.BET_POS;
let LINES = shared.LINES;
let LINE_POS = shared.LINE_POS;
let BET = BETS[BET_POS];
let LINE = LINES[LINE_POS];
let GAME_CODE;


export default class BootScene extends Phaser.Scene {
  emitter: any;
  player_data: any;
  game_data: any;
  gameController: any;
  gameScene: Phaser.Scene;
  currency: any;
  constructor() {
    super('Boot');
  }

  preload() {

  }

  create() {
    //    this.gameScene = this.scene.get('Slot_Scene');
    this.gameController = new gameController({ scene: this, scenes: this.scene });
    this.emitter = dispatcher.getInstance();
    dataServer.authenticateSession();
    this.addListeners();

  }
  addListeners() {
    this.emitter.on('Authenticated', this.assignData, this);
  }
  assignData(authenticateData) {
    this.player_data = authenticateData[0];
    this.game_data = authenticateData[1];
    BETS = authenticateData[2];
    BET_POS = authenticateData[3];
    BET = authenticateData[4];
    LINES = authenticateData[5];
    LINE_POS = authenticateData[6];
    GAME_CODE = authenticateData[7];
    this.fadeCameras();

  }

  fadeCameras() {
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', this.fadeComplete, this);

  }
  fadeComplete() {
    this.CallGame();
  }

  CallGame() {
    //data needs to be passed to the other scenes
    this.scene.start('Slot_GameLoad', {
      key: this.game_data,
      keyp: this.player_data,
      bets: BETS,
      bet_pos: BET_POS,
      bet: BET,
      lines: LINES,
      line_pos: LINE_POS,
      game_code: GAME_CODE
    });
  }
  ErrorGame() {
    this.scene.start('Slot_GameError');
  }

}
