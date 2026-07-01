import Phaser from "phaser";
import Config from "./config";
import GameScene from "./scenes/GameScene";
import LeaderSelectScene from "./scenes/LeaderSelectScene";
import RulesScene from "./scenes/RulesScene";

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  backgroundColor: Config.backgroundColor,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LeaderSelectScene, RulesScene, GameScene], // LeaderSelect, poi Rules, poi GameScene
  parent: "app",
};

new Phaser.Game(gameConfig);
