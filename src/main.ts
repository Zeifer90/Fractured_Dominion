import Phaser from "phaser";
import Config from "./config";
import GameScene from "./scenes/GameScene";
import LeaderSelectScene from "./scenes/LeaderSelectScene";

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  backgroundColor: Config.backgroundColor,
  scene: [LeaderSelectScene, GameScene], // LeaderSelect prima, poi GameScene
  parent: "app",
};

new Phaser.Game(gameConfig);
