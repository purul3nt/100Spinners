//game object factory

//create ui
//update ui & textures & active
import 'phaser';
import dataServer from '../Data/Data';
import ed from '../genericScripts/EventDispatcher';
import decodeEntities, { number_format, DECIMAL } from '../genericScripts/HelperFuncts';
export default class UI_Buttons extends Phaser.GameObjects.GameObjectFactory {
  config: any;
  emitter: any;
  ui_buttons: any;
  scene: any;
  fsTotalCoin: any;
  fsCount: any;
  currency: any;
  freeSpinMode: boolean;
  freeSpinCount: number;
  constructor(config) {
    super(config.scene)
    this.scene = config.scene;
    this.emitter = ed.getInstance();
    this.config = config;
    this.freeSpinMode = false; // check whether this can be started at authentication
    this.freeSpinCount = 0;
    this.checkAuthentication();
  }
  checkAuthentication() {
    if (this.config.player_data && this.config.player_data.freespins) {
      this.freeSpinMode = true;
    }
    return this.freeSpinMode;
  }
  freespinCheck(data) {
    if (this.freeSpinMode == false && data.freespins) { //
      this.freeSpinMode = true;
      this.freeSpinCount = 10; //data.freeSpins.total;
      this.scene.ui.toggleFreeSpinUI();
      this.scene.ui.updateFreeSpinText(this.freeSpinCount);
      this.startFSPopup();
    }
    else if (data.freespins && this.freeSpinMode == true) { //
      if (this.freeSpinCount > 0) {
        this.freeSpinCount--;
        this.scene.ui.updateFreeSpinText(this.freeSpinCount);
        this.endFreespinCheck();
      }
      else {
        //IF LAST:
        this.scene.ui.toggleFreeSpinUI();
        this.freeSpinMode = false;
        this.endFSPopup();
      }
    }
    else {
      //no Fs found
      //    console.log("ENDFS")
      this.endFreespinCheck();
    }
  }

  startFSPopup() {
    var popUpButton = this.scene.add.image(500, 500, 'btn_spin').setInteractive({ pixelPerfect: true });
    popUpButton.on('pointerdown', () => { this.endFreespinCheck(); popUpButton.destroy(); }, this);
    popUpButton.setOrigin(0);
  }


  endFSPopup() {
    var popUpButton = this.scene.add.image(500, 500, 'btn_spin').setInteractive({ pixelPerfect: true });
    popUpButton.on('pointerdown', () => { this.endFreespinCheck(); popUpButton.destroy(); }, this);
    popUpButton.setOrigin(0);
  }

  endFreespinCheck() {
    this.emitter.emit("endFS");
  }
  getFreeSpinMode() {
    return this.freeSpinMode;
  }


}
