import 'phaser';

export default class foreground extends Phaser.GameObjects.Image {
  logo: any;
  foreground: any;

  constructor(config) {
    super(config.scene, config.x, config.y, config.texture)
    this.foreground = config.scene.add.image(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY, 'mask').setOrigin(0.5, 0.5);
    this.foreground.alpha = 0.9;
    this.logo = config.scene.add.image(this.scene.cameras.main.centerX, 150, 'logo').setOrigin(0.5, 0.5).setScale(1.5);
    config.scene.add.existing(this)
  }

  setFgPortrait() {
    this.foreground.setTexture('mask_port');
    this.centreAsset(this.foreground);
    this.logo.x = this.scene.cameras.main.centerX;
    this.logo.setScale(1.2);
  }

  setFgLandscape() {
    this.foreground.setTexture('mask')
    this.centreAsset(this.foreground);
    this.logo.x = this.scene.cameras.main.centerX;
    this.logo.setScale(1.5);
  }
  centreAsset(asset) {
    asset.x = this.scene.cameras.main.centerX;
    asset.y = this.scene.cameras.main.centerY;
  }
}
