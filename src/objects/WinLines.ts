
import 'phaser';
import { lines_colors } from '../genericScripts/HelperFuncts';

export default class winLines extends Phaser.GameObjects.GameObject {
  wlg: any;
  config: any;
  winlines: any[];
  sym_width: any;
  sym_height: any;
  portraitConfig: { line_start: number; };

  constructor(config: { scene: any; game_data: any; scenes?: any; }) {
    super(config.scene, config.scenes);
    this.scene = config.scene;
    this.wlg = this.scene.add.group();
    this.config = this.scene.cache.json.get('game_config');
    this.sym_width = this.config.reel.symbol.width;
    this.sym_height = this.config.reel.symbol.height;
    this.portraitConfig = {
      line_start: - 188
    };
    var game_data = config.game_data;
    var sym_begin = this.config.payline.line.start.x;
    var sym_v = this.config.payline.line.start.y;
    var sym_v_steps = this.config.payline.numbers.vertical_steps;
    var h_begin_now = this.config.payline.numbers.start;
    var h_end_now = this.config.payline.numbers.end;
    var sym_pos = 0;
    var winnumber_h = this.config.payline.numbers.height - (this.config.payline.numbers.height_offset_mult * game_data.grid.lines.length);
    var l_data = game_data.grid.lines;

    for (var i = 0; i < game_data.grid.lines.length; i++) {
      this.wlg.add(this.GenerateLines(h_begin_now, h_end_now, sym_begin, sym_v, sym_v_steps, sym_pos, lines_colors[i],
        l_data[i].line[0][1] + 0.5, l_data[i].line[1][1] + 0.5, l_data[i].line[2][1] + 0.5, l_data[i].line[3][1] + 0.5, l_data[i].line[4][1] + 0.5, i, winnumber_h));
      sym_v += sym_v_steps;
      sym_pos++;
    }

    this.wlg.children.each(function(line) {
      line.visible = false;
    }, this);

  }
  GenerateLines(begin_pos: number, end_pos: number, sym_begin: number, sym_v: any, sym_v_steps: number, sym_pos: number, color: string, vpos1: number, vpos2: number, vpos3: number, vpos4: number, vpos5: number, vdif: number, winnumber_h: number) {
    var winl = this.scene.add.graphics({ x: begin_pos, y: sym_v + winnumber_h });
    winl.beginPath();
    winl.lineStyle(10, parseInt('0x' + color), 0.8);
    winl.moveTo(this.sym_width * 0.5 + (sym_begin - begin_pos), this.sym_height * vpos1 - sym_v_steps * sym_pos + vdif - winnumber_h);
    //winl.lineTo(begin_pos, sym_v + winnumber_h);
    winl.lineTo(this.sym_width * 0.5 + (sym_begin - begin_pos), this.sym_height * vpos1 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(this.sym_width * 1.5 + (sym_begin - begin_pos), this.sym_height * vpos2 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(this.sym_width * 2.5 + (sym_begin - begin_pos), this.sym_height * vpos3 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(this.sym_width * 3.5 + (sym_begin - begin_pos), this.sym_height * vpos4 - sym_v_steps * sym_pos + vdif - winnumber_h);
    winl.lineTo(this.sym_width * 4.5 + (sym_begin - begin_pos), this.sym_height * vpos5 - sym_v_steps * sym_pos + vdif - winnumber_h);
    //    winl.lineTo(end_pos, 0);
    winl.strokePath();
    return winl;
  };

  setWinlinesPortrait() {
    this.wlg.children.each(function(line) {
      line.x = this.portraitConfig.line_start;
    }, this);
  }

  setWinlinesLandscape() {
    var start_pos = this.config.payline.numbers.start;
    this.wlg.children.each(function(line) {
      line.x = start_pos;
    }, this);
  }
}
