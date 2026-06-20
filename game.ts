import "phaser";
import LoadingScene from "./src/scenes/LoadingScene";
import SplashScene from "./src/scenes/SplashScene";
import SlotScene from "./src/scenes/SlotScene";

const config: Phaser.Types.Core.GameConfig = {
  width: window.innerWidth,
  height: window.innerHeight,
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#17102f",
  scene: [LoadingScene, SplashScene, SlotScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
  },
};

window.addEventListener("load", () => {
  (window as any).__SHOGUN_GAME__ = new Phaser.Game(config);
});
