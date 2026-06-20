import 'phaser';
import ed from '../genericScripts/EventDispatcher';
import anims from '../animations/WinAnimation';
export default class winController extends Phaser.GameObjects.GameObject {
  emitter: any;
  slotScene: any;
  bootScene: any;
  linePriority = 0;
  symAnimationsPriority = 0;
  winValuePriority = 0;
  finalWinValuePriority = 1;
  // bigWinPriority = 2; >> to move to separate file
  // freeSpinsPriority = 3; >> to move to separate file
  loopPriority = 4;
  winAnimations: anims;


  constructor(config) {
    super(config.scene, config.scenes);
    this.slotScene = config.scenes.get('Slot_Scene');
    this.emitter = ed.getInstance();
    this.winAnimations = new anims({ config: config, game_data: 0, scenes: config.scenes });
  }

  checkWin(data) {
    var line_data = data.winning_combinations;
    //  console.log("checkWin in winController")
    if (data.win_coin > 0) {
      //    console.log("win found")
      //    console.log(line_data)
      if (this.checkLines(line_data)) {
        this.startWinAnimations(data, 0);
      }
    }
    else {
      this.emitter.emit("endWin");
    }
  }

  startWinAnimations(data, priority) {
    switch (priority) {
      case 0:
        //    console.log("startwinAnimations in winController")
        this.winAnimations.lineAnimations(0, this.slotScene.winLines.wlg, data.winning_combinations);
        //      this.winAnimations.symbolAnimations_DRAFT();
        this.winAnimations.genWinText(data.win_coin);
        break;
      case 1:
        break;
      case 2:
        break;
      default:
        this.emitter.emit("endWin");
    }
  }

  checkLines(line_data) {
    if (line_data.length > 0) {
      return true
    }
    else {
      return false
    };
  }


  //--check whether thre is a win
  //--check what kind of win, and what  priority they have
  //link to anims A
  //link to anims B
  //link to anims C
  //if no win, or end win, emit finishWinCheck


}
