/// <reference path="../../node_modules/@types/jquery/index.d.ts"/>

//import 'jquery';
import 'phaser';
//var $ = require('jquery');
//import 'jstorage';
import dataServer from '../Data/Data';
import ed from '../genericScripts/EventDispatcher';
import winController from '../config/WinController';
import spinAnimation from '../animations/SpinAnimation';
import freeSpins from '../objects/FreeSpins';
import '../objects/Symbols';
import Symbols from '../objects/Symbols';
export var STATE: string;

export default class gameController extends Phaser.GameObjects.GameObject {
  emitter: any;
  spinAnimation: spinAnimation;
  symbols: Symbols;
  currentScene: any;
  slotScene: any;
  bootScene: any;
  bet_data: any;
  winController: winController;
  player_data: any;
  delay_data: any;
  freeSpins: freeSpins;

  constructor(config: { scene: any; scenes: any; }) {
    super(config.scene, config.scenes);
    this.bootScene = config.scene;
    this.slotScene = config.scenes.get('Slot_Scene');
    this.emitter = ed.getInstance();
    this.winController = new winController(config);
    this.freeSpins = new freeSpins({ scene: this.slotScene });
    this.placeListeners();
  }
  placeListeners() {
    this.emitter.on('Authenticated', () => { this.changeState('idle'); }, this);
    this.emitter.on('startPlay', () => { this.changeState('startPlay'); }, this);
    this.emitter.on('betReceived', this.assignData, this);
    this.emitter.on('betReceived', () => { this.changeState('betReceived'); }, this);
    this.emitter.on('startFinishingPlay', this.delayData, this);
    this.emitter.on('startFinishingPlay', () => { this.changeState('startFinishingPlay'); }, this);
    this.emitter.on('finishingPlay', () => { this.changeState('startWinCheck'); }, this);
    this.emitter.on('endWin', () => { this.changeState('startFS'); }, this);
    this.emitter.on('endFS', () => { this.changeState('endGame'); }, this);
    this.emitter.on('endFS', () => { this.changeState('idle'); }, this);

  }

  async changeState(state: any) {
    STATE = state;
    console.log("STATE" + " " + STATE)
    switch (STATE) {
      case 'idle':
        break;
      case 'startPlay':
        if (!this.slotScene.sys.game.device.os.desktop && !this.slotScene.game.scale.isFullscreen) {
          this.emitter.emit("pressFullScreen");
        }
        this.buttonHandler();
        this.slotScene.symbols.startSpin(this.slotScene.symbols.reels, this)
        this.slotScene.ui.ui_text.resetWinText();
        dataServer.bet();
        //  this.slotScene.ui.ui_text.updateBalanceTextBeforeBet(dataServer.getBalance() - dataServer.getBetValue());
        break;
      case 'betReceived':
        //triggers slow spin
        break;
      case 'startFinishingPlay':
        this.assignSymbols(this.bet_data, this.delay_data);
        break;
      case 'startWinCheck':
        this.winController.checkWin(this.bet_data);
        break;
      case 'startFS':
        this.freeSpins.freespinCheck(this.bet_data);
        break;
      case 'endGame':
        //  this.slotScene.ui.ui_text.updateBalanceTextFromBet(this.bet_data.balance);
        this.slotScene.ui.ui_text.updateWinText(this.bet_data.win_currency);
        this.buttonHandler();
        if (this.freeSpins.getFreeSpinMode() == true) {
          await Pause(1000)
          this.changeState('startPlay');
        }
        break;
    }
  }

  buttonHandler() {
    if (this.freeSpins.getFreeSpinMode() == false) {
      this.slotScene.ui.buttonAlphaHandler();
    }
  }
  delayData(data) {
    this.delay_data = data;
  }
  assignData(bet_data: any) {
    this.bet_data = bet_data;
  }

  assignSymbols(data, delay) {
    var response = [];
    for (var i = 0; i < data.slot_grid.length; i++) {
      for (var j = 0; j < data.slot_grid[i].length; j++) {
        response.push(data.slot_grid[i][j][1].id);
      }
    }
    console.log("assignSymbols")
    this.slotScene.symbols.assignSymbols(this.slotScene.symbols.reels, this.slotScene, response, delay)
  }
}
const Pause = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
