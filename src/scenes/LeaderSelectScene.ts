import Phaser from "phaser";
import gameState, { type LeaderId } from "../core/GameState";
import Config from "../config";

interface LeaderCard {
  faction: "iron" | "shadow";
  leaderId: LeaderId;
  bg: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  w: number;
  h: number;
  colorHex: string;
  titleText: Phaser.GameObjects.Text;
  subText: Phaser.GameObjects.Text;
}

export default class LeaderSelectScene extends Phaser.Scene {
  private startBtnZone!: Phaser.GameObjects.Zone;
  private startBtnBg!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private cards: LeaderCard[] = [];

  constructor() {
    super({ key: "LeaderSelectScene" });
  }

  create() {
    this.cards = [];
    gameState.reset();

    this.cameras.main.setBackgroundColor(Config.backgroundColor);

    this.add.text(450, 60, "Seleziona i Leader", {
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Colonna sinistra — Ordine di Ferro
    this.add.text(200, 120, "⚔️ Ordine di Ferro", {
      fontSize: "18px",
      color: "#4a90d9",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.makeLeaderCard(120, 160, 160, 100, "Vael", "Aggressione / Mobilità", "#4a90d9", "iron", "vael", () => {
      this.selectLeader("iron", "vael");
    });

    this.makeLeaderCard(120, 280, 160, 100, "Mira", "Difesa / Controllo", "#4a90d9", "iron", "mira", () => {
      this.selectLeader("iron", "mira");
    });

    // Colonna destra — Conclave delle Ombre
    this.add.text(700, 120, "🌑 Conclave delle Ombre", {
      fontSize: "18px",
      color: "#d28eff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.makeLeaderCard(620, 160, 160, 100, "Kael", "Stealth / Caos", "#d28eff", "shadow", "kael", () => {
      this.selectLeader("shadow", "kael");
    });

    this.makeLeaderCard(620, 280, 160, 100, "Seris", "Clone / Burst", "#d28eff", "shadow", "seris", () => {
      this.selectLeader("shadow", "seris");
    });

    // Info stato
    this.infoText = this.add.text(450, 420, "Scegli un leader per entrambe le fazioni", {
      fontSize: "14px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Pulsante Inizia (disabilitato finché non pronti)
    this.startBtnBg = this.add.graphics();
    this.drawStartBtn(false);

    this.add.text(450, 505, "Inizia", {
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.startBtnZone = this.add.zone(450, 500, 180, 40).setInteractive();
    this.startBtnZone.on("pointerdown", () => {
      if (gameState.isReady()) {
        this.scene.start("RulesScene", { leaders: gameState.leaders });
      }
    });
    this.startBtnZone.on("pointerover", () => this.hoverStartBtn(true));
    this.startBtnZone.on("pointerout", () => this.hoverStartBtn(false));
  }

  private makeLeaderCard(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    subtitle: string,
    colorHex: string,
    faction: "iron" | "shadow",
    leaderId: LeaderId,
    onClick: () => void
  ) {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillRoundedRect(x, y, w, h, 8);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(colorHex).color, 0.7);
    bg.strokeRoundedRect(x, y, w, h, 8);

    const titleText = this.add.text(x + w / 2, y + 20, title, {
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5, 0);

    const subText = this.add.text(x + w / 2, y + 48, subtitle, {
      fontSize: "12px",
      color: "#dddddd",
    }).setOrigin(0.5, 0);

    const cardInfo: LeaderCard = {
      faction,
      leaderId,
      bg,
      x,
      y,
      w,
      h,
      colorHex,
      titleText,
      subText,
    };
    this.cards.push(cardInfo);

    const hit = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive();
    hit.on("pointerdown", () => {
      onClick();
      this.flashSelection(bg);
    });

    hit.on("pointerover", () => {
      const isSelected = gameState.leaders[faction] === leaderId;
      if (!isSelected) {
        bg.clear();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(x, y, w, h, 8);
        bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(colorHex).color, 1);
        bg.strokeRoundedRect(x, y, w, h, 8);
        subText.setColor("#ffffff");
      }
    });

    hit.on("pointerout", () => {
      const isSelected = gameState.leaders[faction] === leaderId;
      if (!isSelected) {
        bg.clear();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(x, y, w, h, 8);
        bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(colorHex).color, 0.7);
        bg.strokeRoundedRect(x, y, w, h, 8);
        subText.setColor("#dddddd");
      }
    });
  }

  private flashSelection(bg: Phaser.GameObjects.Graphics) {
    this.tweens.add({
      targets: bg,
      alpha: { from: 1, to: 0.4 },
      yoyo: true,
      duration: 120,
      repeat: 1,
    });
  }

  private selectLeader(faction: "iron" | "shadow", leader: LeaderId) {
    gameState.setLeader(faction, leader);
    const iron = gameState.leaders.iron ? `Iron: ${gameState.leaders.iron}` : "Iron: —";
    const shadow = gameState.leaders.shadow ? `Shadow: ${gameState.leaders.shadow}` : "Shadow: —";
    this.infoText.setText(`${iron}  |  ${shadow}`);

    this.updateCardVisuals();
    this.drawStartBtn(gameState.isReady());
  }

  private updateCardVisuals() {
    this.cards.forEach(card => {
      const isSelected = gameState.leaders[card.faction] === card.leaderId;
      card.bg.clear();
      
      if (isSelected) {
        card.bg.fillStyle(0x1a1a2e, 0.9);
        card.bg.fillRoundedRect(card.x, card.y, card.w, card.h, 8);
        card.bg.lineStyle(3, 0xf1c40f, 1); // Gold yellow border
        card.bg.strokeRoundedRect(card.x, card.y, card.w, card.h, 8);
        card.titleText.setColor("#f1c40f");
        card.subText.setColor("#ffffff");
      } else {
        card.bg.fillStyle(0x000000, 0.5);
        card.bg.fillRoundedRect(card.x, card.y, card.w, card.h, 8);
        card.bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(card.colorHex).color, 0.7);
        card.bg.strokeRoundedRect(card.x, card.y, card.w, card.h, 8);
        card.titleText.setColor("#ffffff");
        card.subText.setColor("#dddddd");
      }
    });
  }

  private drawStartBtn(enabled: boolean) {
    this.startBtnBg.clear();
    this.startBtnBg.fillStyle(enabled ? 0x27ae60 : 0x555555, 1);
    this.startBtnBg.fillRoundedRect(360, 480, 180, 40, 8);
  }

  private hoverStartBtn(hover: boolean) {
    if (!gameState.isReady()) return;
    this.startBtnBg.clear();
    this.startBtnBg.fillStyle(hover ? 0x1e8449 : 0x27ae60, 1);
    this.startBtnBg.fillRoundedRect(360, 480, 180, 40, 8);
  }
}
