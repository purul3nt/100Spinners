import 'phaser';
import ed from '../genericScripts/EventDispatcher';
import { fullScreenHandler } from '../genericScripts/HelperFuncts';

export default class MobileController extends Phaser.GameObjects.GameObject {
  emitter: any;
  slotScene: any;
  bootScene: any;
  dimensionsConfig: { dimension_1: number; dimension_2: number; };

  constructor(config) {
    super(config.scene, config.scenes);
    this.slotScene = config.scenes.get('Slot_Scene');
    this.emitter = ed.getInstance();
    this.dimensionsConfig = {
      dimension_1: 1080,
      dimension_2: 1920
    };
    this.slotScene.scale.on('orientationchange', function(orientation) {
      this.setAssetOrientation(this.slotScene.scale.orientation);
    }, this);
  }

  setAssetOrientation(orientation) {
    switch (orientation) {
      case Phaser.Scale.PORTRAIT:
        this.resizeHandler(this.dimensionsConfig.dimension_1, this.dimensionsConfig.dimension_2)
        this.slotScene.background.setBgPortrait();
        this.slotScene.foreground.setFgPortrait();
        this.slotScene.symbols.setSymbolsPortrait();
        this.slotScene.ui.UIPortrait();
        this.slotScene.winLines.setWinlinesPortrait();
        console.log("mobileControllerPortrait")
        break;
      case Phaser.Scale.LANDSCAPE:
        this.resizeHandler(this.dimensionsConfig.dimension_2, this.dimensionsConfig.dimension_1)
        console.log("mobileControllerLandscape")
        this.slotScene.background.setBgLandscape();
        this.slotScene.foreground.setFgLandscape();
        this.slotScene.symbols.setSymbolsLandscape();
        this.slotScene.ui.UILandscape();
        this.slotScene.winLines.setWinlinesLandscape();
        break;
      default:
        console.log("ORIENTATIONOTFOUND");
    }
  }

  resizeHandler(w, h) { //phaser/issues/4971
    this.slotScene.game.scale.setGameSize(w, h);
    this.slotScene.game.scale.displaySize.aspectRatio = w / h;
    this.slotScene.scale.refresh();
  }
}
