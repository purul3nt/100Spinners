import 'jquery';
import 'jquery-ajax-native';
import {jQuery, $} from "jquery";
import 'phaser';
import 'jstorage';
import config from './config/config';
import ReelsUI from './scenes/ReelsUI';
import GameScene from './scenes/GameScene';
import BootScene from './scenes/BootScene';
import PreloaderScene from './scenes/PreloaderScene';
import TitleScene from './scenes/TitleScene';
import UIScene from './scenes/UIScene';
class Game extends Phaser.Game {
  constructor() {
    super(config);
    this.scene.add('Game', GameScene);
    this.scene.add('ReelsUI', ReelsUI);
    this.scene.add('Boot', BootScene);
    this.scene.add('Slot_GameLoad', PreloaderScene);

    this.scene.add('Slot_GameError', UIScene);
    this.scene.start('Boot');
  }
}

window.onload = function () {
  window.game = new Game();
  resize();
  window.addEventListener('resize', resize, false);
}

function resize() {
  var canvas = document.querySelector('canvas');
  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;
  var windowRatio = windowWidth / windowHeight;
  var gameRatio = config.width / config.height;
  if (windowRatio < gameRatio) {
    canvas.style.width = windowWidth + 'px';
    canvas.style.height = (windowWidth / gameRatio) + 'px';
  } else {
    canvas.style.width = (windowHeight * gameRatio) + 'px';
    canvas.style.height = windowHeight + 'px';
  }
}
