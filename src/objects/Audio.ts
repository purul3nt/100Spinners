import 'phaser';

// *                          .
//  *                          |\
//  *                         _j    .___,
//  *                        (_j    |---|
//  *                              _|   |
//  *                     .____.  (_j  _|
//  *                     |.--.| .    (_J
//  *                     |l__j|  .
//  *                     |+ oo| .
//  *                     l____j
export default class Audio extends Phaser.Sound.BaseSound {
  MusicBG: any;
  scene: any;
  musicMode: boolean;

  constructor(config) {
    super(config.scene, config)
    this.scene = config.scene;
    config.scene.add.existing(this);
    this.musicMode = true;
  }

  playBackgroundMusic() {
    if (this.musicMode == true) {
      this.MusicBG = this.scene.sound.add('music_bg');
      this.MusicBG.play();
      this.fade(this.MusicBG, 0, 0.2);
    }
  }

  toggleBackgroundMusic() {
    console.log(this.MusicBG)
    if (this.MusicBG.isPlaying == true) {
      this.MusicBG.stop();
    }
    else { this.playBackgroundMusic(); }
  }

  toggleAllMusic() {
    this.musicMode = !this.musicMode;
    this.toggleBackgroundMusic();
  }

  fade(target, startVol, endVol) {
    this.scene.tweens.add({
      targets: target,
      volume: {
        getStart: function() {
          return startVol;
        },
        getEnd: function() {
          return endVol;
        }
      },
      duration: 6000,
      ease: 'Linear'
    });
  }

}
