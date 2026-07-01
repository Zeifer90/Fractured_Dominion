import Phaser from "phaser";
import Config from "../config";

export default class RulesScene extends Phaser.Scene {
  private leadersData: any;

  constructor() {
    super({ key: "RulesScene" });
  }

  init(data: any) {
    this.leadersData = data;
  }

  create() {
    this.cameras.main.setBackgroundColor(Config.backgroundColor);

    const panelX = this.scale.width / 2;
    const panelY = this.scale.height / 2;
    const panelWidth = 540;
    const panelHeight = 400;

    // Pannello di sfondo
    const panel = this.add.graphics();
    panel.fillStyle(0x1a2238, 1);
    panel.lineStyle(3, 0xf1c40f, 1);
    panel.fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 12);
    panel.strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 12);

    this.add.text(panelX, panelY - panelHeight / 2 + 30, "⚔️ REGOLE DEL GIOCO ⚔️", {
      fontSize: "24px",
      color: "#f1c40f",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const rules = [
      "• Gioco Tattico a Turni: Ogni fazione gioca il proprio turno alternandosi.",
      "• Punti Azione (PA): Muovere costa 1 PA. Attaccare costa 2 PA.",
      "• Colori sulla Griglia (quando selezioni un'unità):",
      "  - Caselle Gialle: Movimenti disponibili.",
      "  - Caselle Rosse: Nemici che puoi attaccare.",
      "• Tesori Leggendari: Elimina le guardie neutrali NPC per equipaggiare i tesori",
      "  (spada per Guerriero, arco per Arciere, bastone per Mago).",
      "• Condizioni di Vittoria:",
      "  - Sterminio di tutte le unità nemiche.",
      "  - Assedio della base nemica (mantieni un'unità sulla loro base per 2 turni)."
    ];

    let startY = panelY - panelHeight / 2 + 80;
    rules.forEach((rule, index) => {
      this.add.text(panelX - panelWidth / 2 + 30, startY + (index * 24), rule, {
        fontSize: "13px",
        color: "#ffffff",
        wordWrap: { width: panelWidth - 60 }
      });
    });

    // Pulsante "Comincia la Partita"
    const btnWidth = 240;
    const btnHeight = 44;
    const btnX = panelX;
    const btnY = panelY + panelHeight / 2 - 40;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x27ae60, 1);
    btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);

    this.add.text(btnX, btnY, "COMINCIA LA PARTITA", {
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const clickZone = this.add.zone(btnX, btnY, btnWidth, btnHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    clickZone.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0x2ecc71, 1);
      btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);
    });

    clickZone.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0x27ae60, 1);
      btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 8);
    });

    clickZone.on("pointerdown", () => {
      this.scene.start("GameScene", this.leadersData);
    });
  }
}
