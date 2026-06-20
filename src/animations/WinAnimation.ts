import 'phaser';
import { STATE } from '../config/GameController';
import dispatcher from '../genericScripts/EventDispatcher';
export default class WinAnimation extends Phaser.Tweens.Tween {
  config: any;
  scene: any;
  art: string;
  emitter: any;
  bet_data: any;
  lineAnimationSpeed: number;
  lineTween: any;
  slotScene: any;
  winText: any;
  winTextChild: any;
  globalAnimationDuration: number;
  smbwThreshold: number;
  smbwAnimationDuration: number;
  winDisplayDuration: number;
  winIncrementDuration: number;

  constructor(config) {
    super(config.scenes, config.config, config.game_data)
    this.lineAnimationSpeed = 1000;
    this.globalAnimationDuration = 2500;
    this.winIncrementDuration = 500;
    this.winDisplayDuration = this.globalAnimationDuration - this.winIncrementDuration;
    this.smbwAnimationDuration = 3500;
    this.smbwThreshold = 1000;//smbw win_coin here
    this.art = 'Linear';
    this.scene = config.scene;
    this.slotScene = config.scenes.get('Slot_Scene');
    this.emitter = dispatcher.getInstance();
    this.bet_data = config.bet_data;
    this.winText = this.slotScene.add.group();
  }

  lineAnimations(i, winlines, data) {
    //  console.log(data)
    if (i < data.length) {
      winlines.children.entries[data[i].payline.number - 1].visible = true;
      winlines.children.entries[data[i].payline.number - 1].alpha = 0;
      this.lineTween = this.slotScene.tweens.add({
        targets: winlines.children.entries[data[i].payline.number - 1],
        alpha: 1,
        ease: this.art,
        duration: this.getDuration(data),
        yoyo: true
      });
      //    console.log("get duration data line" + this.getDuration(data))
      this.lineTween.on('complete', () => {
        winlines.children.entries[data[i].payline.number - 1].visible = false;
        i++;
        this.lineAnimations(i, winlines, data);
      }, this);
    }
  }
  getDuration(data) {
    var yoyo_modifier = 2;
    var totalActualDuration = data.length * this.lineAnimationSpeed;
    if (totalActualDuration > this.globalAnimationDuration) {
      return (this.globalAnimationDuration / data.length) / yoyo_modifier
    }
    else {
      return (this.lineAnimationSpeed / yoyo_modifier)
    }
  }
  symbolAnimations_DRAFT() {
    console.log("symbolAnimations_DRAFT")
    var anim = this.slotScene.add.spine(400, 600, 'set1.spineboy', 'idle', false);
    anim.on('complete', () => { anim.destroy(); }, this)
  }

  genWinText(win_coin) {
    //  if (win_coin < this.smbwThreshold) {
    var threshold = 10
    var win_amount
    if (win_coin < threshold) { win_amount = 0; var speed = this.winIncrementDuration / win_coin; }
    else {
      win_amount = win_coin - threshold;
      var speed = this.winIncrementDuration / threshold;
    }
    var step = 1;
    this.numberAnimations(win_amount, win_coin, speed, step, threshold)
    //    }
    //    else {
    //      console.log("SMBW")
    //    }
  };

  numberAnimations(win_amount, total_win, speed, step, threshold) {
    var centerPoint = this.getCenterPoint();
    if (win_amount <= total_win) {
      if (win_amount == 0 || win_amount == (parseInt(total_win) - threshold)) {
        for (var i = 0; i < total_win.toString().length; i++) {
          var winTextChild = this.slotScene.add.sprite(((this.slotScene.cameras.main.centerX) - ((total_win.toString().length - 1) * 80)) + (i * 160), centerPoint, "smbw", '0.png');
          winTextChild.alpha = 1;
          winTextChild.setOrigin(0.5);
          this.winText.add(winTextChild);
        }
      }
      for (var i = 0; i < win_amount.toString().length; i++) {
        var chr = win_amount.toString().substring(i, i + 1)
        if (this.winText.children.entries[i] !== undefined) {
          this.winText.children.entries[i].alpha = 1;
          this.winText.children.entries[i].setFrame(chr + ".png");
        }
      }
      this.slotScene.time.addEvent({ delay: speed, callback: () => { win_amount = win_amount + step; this.numberAnimations(win_amount, total_win, speed, step, threshold) }, callbackScope: this, timeScale: 1.0, startAt: 0 });;
    }
    else {
      this.slotScene.time.addEvent({ delay: this.winDisplayDuration, callback: () => { this.finishWin(); }, callbackScope: this, timeScale: 1.0, startAt: 0 });;
    }
  }

  finishWin() {
    this.emitter.emit("endWin");
    this.removeWin();
  }
  removeWin() {
    this.winText.clear(true, true);;
  }

  getCenterPoint() {
    if (this.slotScene.scale.orientation == Phaser.Scale.PORTRAIT) {
      return this.slotScene.cameras.main.height * 0.3;
    }
    else {
      return this.slotScene.cameras.main.height * 0.5;
    }
  }
}
