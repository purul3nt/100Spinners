import 'phaser';
import { STATE } from '../config/GameController';
import dispatcher from '../genericScripts/EventDispatcher';
export default class SpinAnimation extends Phaser.Tweens.Tween {
  config: any;
  scene: any;
  delay: number;
  delayOffValue: number;
  delayOnValue: number;
  initialSpinSpeed: number;
  finalSpinSpeed: number;
  art: string;
  yStartPos: number;
  yEndPos: number;
  emitter: any;
  bounceDuration: number;
  bounceDistance: number;
  defaultyEndPos: number;

  constructor(config) {
    super(config.scene, config.config, config.game_data)
    this.delayOnValue = 250;
    this.delayOffValue = 0;
    this.initialSpinSpeed = 100;
    this.finalSpinSpeed = 300;
    this.yStartPos = 0;
    this.defaultyEndPos = 1200;
    this.bounceDuration = 100;
    this.bounceDistance = 70;
    this.delay = this.delayOnValue;
    this.art = 'Linear';
    this.scene = config.scene;
    this.emitter = dispatcher.getInstance();
  }

  spinReel(reel, index, lastreel) {
    this["wheel_" + index + "_ani"] = this.scene.tweens.add({
      targets: reel,
      ease: this.art,
      duration: this.initialSpinSpeed,
      y: this.getYendPos(),
      delay: this.delay * index
    });
    if (STATE == 'startPlay') {
      this["wheel_" + index + "_ani"].on('complete', () => { reel.y = this.yStartPos; this.delay = this.delayOffValue; this.spinReel(reel, index, lastreel); }, this);
    }
    else {
      if (index == 0) {
        this.emitter.emit("startFinishingPlay", this.delayOnValue);
        console.log("emitting finishplay")
      }

      this.slowReel(reel, index, lastreel);
      this["wheel_" + index + "_ani"].on('complete', () => { this.delay = this.delayOnValue; }, this);
    }
  }
  getYendPos() {
    if (this.scene.config && this.scene.config.reel.endYpos) {
      this.yEndPos = this.scene.config.reel.endYpos.pos;
    }
    else {
      this.yEndPos = this.defaultyEndPos;
    }
    return this.yEndPos;
  }

  slowReel(reel, index, lastreel) {
    reel.y = this.yStartPos;
    this["wheel_" + index + "_ani"] = this.scene.tweens.add({
      targets: reel,
      ease: this.art,
      duration: this.finalSpinSpeed,
      y: this.getYendPos(),
    });

    this["wheel_" + index + "_ani"].on('complete', () => {
      this.bounceReel(reel, index, lastreel)
    }, this);
  }

  bounceReel(reel, index, lastreel) {
    var tween = this.scene.tweens.add({
      targets: reel,
      ease: this.art,
      duration: this.bounceDuration,
      y: this.getYendPos() + this.bounceDistance,
      yoyo: true
    });
    tween.on('complete', () => {
      if (index == (lastreel - 1)) {
        this.emitter.emit("finishingPlay");
      }
    }, this);
  }
}
