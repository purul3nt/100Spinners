import 'phaser';

export default class Background extends Phaser.GameObjects.Image {
  background: any;

  constructor(config) {
    super(config.scene, config.x, config.y, config.texture)
    this.background = config.scene.add.image(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY, 'bg').setOrigin(0.5, 0.5);
    config.scene.add.existing(this)
  }

  setBgPortrait() {
    this.background.angle = 90;
    this.centreAsset(this.background);
  }

  setBgLandscape() {
    this.background.angle = 0;
    this.centreAsset(this.background);
  }

  centreAsset(asset) {
    asset.x = this.scene.cameras.main.centerX;
    asset.y = this.scene.cameras.main.centerY;
  }
}
