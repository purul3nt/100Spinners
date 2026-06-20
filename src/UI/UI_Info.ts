import 'phaser';
import dispatcher from '../genericScripts/EventDispatcher';
import { Scrollbar, Column, Viewport } from 'phaser-ui-tools';

export default class UI_Info extends Phaser.GameObjects.GameObjectFactory {

  emitter: any;
  scene: any;
  config: any;
  width: number;
  scrollbar: any;
  viewport: any;
  column: any;
  constructor(config) {
    super(config.scene)
    this.config = config.scene.cache.json.get('game_config');
    this.scene = config.scene;
    this.emitter = dispatcher.getInstance();
    this.width = 1200
    this.createInfo();
    this.resetInfo();
  }

  createInfo() {
    //game, x, y, width, height
    this.viewport = new Viewport(this.scene, 75, 75, this.width, 260);
    this.column = new Column(this.scene, 28, 28);
    this.viewport.addNode(this.column);
    var dummy_sprite_a = this.scene.add.text(0, 0, this.config.ui.text.game_rule.text, { font: "bold 30px Arial", color: '#000', align: 'center', wordWrap: { width: this.width, useAdvancedWrap: true } });
    var dummy_sprite_b = this.scene.add.image(0, 0, "dummyButton");

    // var dummy_sprite_c = this.scene.add.image(0, 0, "dummyButton");
    this.column.addNode(dummy_sprite_a);
    this.column.addNode(dummy_sprite_b);
    // column.addNode(dummy_sprite_c);

    this.scrollbar = new Scrollbar(
      this.scene,
      this.viewport,
      true,
      true,
      "track",
      "bar",
      { 'duration': 300, 'ease': "Quadratic.Out" }
    );
    Phaser.Display.Align.To.RightCenter(this.scrollbar, this.viewport, this.width, 0);
  }

  resetInfo() {
    this.viewport.setVisible(!this.viewport.visible);
    this.scrollbar.setVisible(!this.scrollbar.visible);
    this.column.setVisible(!this.column.visible);
  }
}
