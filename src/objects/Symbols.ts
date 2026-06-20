import 'phaser';
import spinAnimation from '../animations/SpinAnimation';
import { getRand } from '../genericScripts/HelperFuncts';

export default class Symbols extends Phaser.GameObjects.Group {
  config: any;
  sym_width: any;
  sym_height: any;
  start_pos_x: any;
  start_pos_y: any;
  spinAnimation: spinAnimation;
  emitter: any;
  config_default: any;
  reels: any;
  rowsVisible: number;
  rowTop: number;
  rowMid: number;
  rowBott: number;
  private reelsTotal: number;
  private rowsTotal: number;
  portraitConfig: any;

  constructor(config) {
    super(config.scene, config.game_data)
    this.reelsTotal = 5;
    this.rowsTotal = 9;
    this.rowsVisible = 3;
    this.rowTop = 7;
    this.rowMid = 6;
    this.rowBott = 5;
    this.scene = config.scene;
    this.config_default = config;
    this.reels = this.scene.add.container(0, 0);
    this.createSymbols(config.game_data);
    this.spinAnimation = new spinAnimation({ config: this, game_data: 0, scene: config.scene });
    this.portraitConfig = {
      sym_start: - 272,
      sym_margin: -70
    };

  }

  createSymbols(game_data) {
    this.config = this.config_default.scene.cache.json.get('game_config');
    this.sym_width = this.config.reel.symbol.width;
    this.sym_height = this.config.reel.symbol.height;
    this.start_pos_x = this.config.reel.start.x;
    this.start_pos_y = this.config.reel.start.y;
    var grid = game_data.grid.symbols;
    for (var i = 0; i < this.reelsTotal; i++) {
      var ypos = this.start_pos_y;
      this["wheel" + i] = this.scene.add.container(0, 0);
      this.reels.add(this["wheel" + i]);
      for (var j = 0; j < this.rowsTotal; j++) {
        var sym = this.scene.add.sprite(this.start_pos_x + (this.sym_width * i), ypos, 'symbols', 'sym_' + getRand(grid[0].id, grid[grid.length - 1].id) + '.png');
        sym.setOrigin(0.5, 0.5)
        ypos -= this.sym_height;
        this["wheel" + i].add(sym);
      }
    }
  }

  startSpin(reels, scene) {
    for (var i = 0; i < this.reelsTotal; i++) {
      var reel = reels.getAt(i);
      this.spinAnimation.spinReel(reel, i, this.reelsTotal);
    }
  }
  async assignSymbols(reels, scene, response, delay) {
    //  console.log(response)
    const Pause = (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
    for (var i = 0; i < this.reelsTotal; i++) {
      var index = i * this.rowsVisible;
      reels.getAt(i).getAt(this.rowTop).setFrame('sym_' + response[index] + '.png');
      reels.getAt(i).getAt(this.rowMid).setFrame('sym_' + response[index + 1] + '.png');
      reels.getAt(i).getAt(this.rowBott).setFrame('sym_' + response[index + 2] + '.png');
      this.randomiseOtherSymbols(reels.getAt(i), Math.max(...response), Math.min(...response))
      await Pause(delay - 100)
    }
  }

  randomiseOtherSymbols(reel, min, max) {
    reel.getAt(this.reelsTotal - 1).setFrame('sym_' + getRand(min, max) + '.png');
    for (var i = 0; i < this.rowBott; i++) {
      reel.getAt(i).setFrame('sym_' + getRand(min, max) + '.png');
    }
  }

  setSymbolsPortrait() {
    for (var i = 0; i < this.reelsTotal; i++) {
      this.reels.getAt(i).x = this.portraitConfig.sym_start + (this.portraitConfig.sym_margin * i)
    }
  }

  setSymbolsLandscape() {
    var start_pos = 0
    for (var i = 0; i < this.reelsTotal; i++) {
      this.reels.getAt(i).x = start_pos
    }
  }
}
