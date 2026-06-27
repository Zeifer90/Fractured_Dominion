import Phaser from "phaser";
import type { UnitData } from "../units/Unit";
import gameState from "../core/GameState";

export default class HUD {
  private panel: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private attackText: Phaser.GameObjects.Text;
  private defenseText: Phaser.GameObjects.Text;
  private hpBar: Phaser.GameObjects.Graphics;

  // Leader Fazione Ferro (Sinistra)
  private ironPanel: Phaser.GameObjects.Graphics;
  private ironLeaderText: Phaser.GameObjects.Text;
  private ironAbilityBtn: Phaser.GameObjects.Graphics;
  private ironAbilityText: Phaser.GameObjects.Text;
  private ironCooldownText: Phaser.GameObjects.Text;

  // Leader Fazione Ombre (Destra)
  private shadowPanel: Phaser.GameObjects.Graphics;
  private shadowLeaderText: Phaser.GameObjects.Text;
  private shadowAbilityBtn: Phaser.GameObjects.Graphics;
  private shadowAbilityText: Phaser.GameObjects.Text;
  private shadowCooldownText: Phaser.GameObjects.Text;

  private activeFaction: "iron" | "shadow" = "iron";

  constructor(scene: Phaser.Scene) {
    const LEADER_NAMES: Record<string, string> = {
      vael: "⚔️ Vael",
      mira: "🛡️ Mira",
      kael: "🌑 Kael",
      seris: "✨ Seris",
    };

    const ironLeader = gameState.leaders.iron;
    const shadowLeader = gameState.leaders.shadow;
    const ironName = ironLeader ? LEADER_NAMES[ironLeader] ?? ironLeader : "—";
    const shadowName = shadowLeader ? LEADER_NAMES[shadowLeader] ?? shadowLeader : "—";

    // 1. PRIMA DI TUTTO: Crea lo sfondo nero dell'HUD (Depth 1)
    // Creandolo per primo, starà fisicamente sotto tutti gli elementi successivi
    this.panel = scene.add.graphics();
    this.panel.fillStyle(0x000000, 0.7);
    this.panel.fillRect(0, 540, 900, 60);
    this.panel.setDepth(1);

    // --- PANEL LEADER FERRO (IN BASSO A SINISTRA NELL'HUD) ---
    this.ironPanel = scene.add.graphics();
    this.ironPanel.fillStyle(0x1a1a2e, 0.8);
    this.ironPanel.fillRoundedRect(20, 546, 150, 20, 5);
    this.ironPanel.setDepth(2);
    
    this.ironLeaderText = scene.add.text(28, 550, `Ferro: ${ironName}`, {
      fontSize: "10px",
      color: "#4a90d9",
      fontStyle: "bold",
    });
    this.ironLeaderText.setDepth(2);
   
    this.ironAbilityBtn = scene.add.graphics();
    this.ironAbilityBtn.fillStyle(0x111122, 1);
    this.ironAbilityBtn.lineStyle(1, 0x4a90d9, 1);
    this.ironAbilityBtn.fillRoundedRect(20, 570, 150, 20, 5);
    this.ironAbilityBtn.strokeRoundedRect(20, 570, 150, 20, 5);
    this.ironAbilityBtn.setDepth(2);

    this.ironAbilityText = scene.add.text(28, 574, "⚡Abilità", {
      fontSize: "10px",
      color: "#4a90d9",
    });
    this.ironAbilityText.setDepth(2);
    
    this.ironCooldownText = scene.add.text(120, 574, "CD:3", {
      fontSize: "9px",
      color: "#aaaaaa",
    });
    this.ironCooldownText.setDepth(2);


    // --- PANEL LEADER OMBRE (IN BASSO A DESTRA NELL'HUD) ---
    this.shadowPanel = scene.add.graphics();
    this.shadowPanel.fillStyle(0x1a1a2e, 0.8);
    this.shadowPanel.fillRoundedRect(580, 546, 150, 20, 5);
    this.shadowPanel.setDepth(2);
    
    this.shadowLeaderText = scene.add.text(588, 550, `Ombre: ${shadowName}`, {
      fontSize: "10px",
      color: "#d28eff",
      fontStyle: "bold",
    });
    this.shadowLeaderText.setDepth(2);
   
    this.shadowAbilityBtn = scene.add.graphics();
    this.shadowAbilityBtn.fillStyle(0x111122, 1);
    this.shadowAbilityBtn.lineStyle(1, 0xd28eff, 1);
    this.shadowAbilityBtn.fillRoundedRect(580, 570, 150, 20, 5);
    this.shadowAbilityBtn.strokeRoundedRect(580, 570, 150, 20, 5);
    this.shadowAbilityBtn.setDepth(2);

    this.shadowAbilityText = scene.add.text(588, 574, "⚡Abilità", {
      fontSize: "10px",
      color: "#d28eff",
    });
    this.shadowAbilityText.setDepth(2);

    this.shadowCooldownText = scene.add.text(680, 574, "CD:3", {
      fontSize: "9px",
      color: "#aaaaaa",
    });
    this.shadowCooldownText.setDepth(2);


    // --- INFO UNITA SELEZIONATA (AL CENTRO) ---
    this.nameText = scene.add.text(190, 550, "Seleziona un'unità", {
      fontSize: "13px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.nameText.setDepth(2);

    this.attackText = scene.add.text(400, 550, "", {
      fontSize: "12px",
      color: "#e74c3c",
      fontStyle: "bold",
    });
    this.attackText.setDepth(2);

    this.defenseText = scene.add.text(480, 550, "", {
      fontSize: "12px",
      color: "#3498db",
      fontStyle: "bold",
    });
    this.defenseText.setDepth(2);

    // HP Bar & Text
    this.hpBar = scene.add.graphics();
    this.hpBar.setDepth(2);

    this.hpText = scene.add.text(0, 0, "", {
      fontSize: "11px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.hpText.setDepth(10); // Profondità massima per stare sopra la barra colorata degli HP


    // --- BOTTONE FINE TURNO ---
    const btnBg = scene.add.graphics();
    btnBg.fillStyle(0xe74c3c, 1);
    btnBg.fillRoundedRect(750, 554, 130, 32, 6);
    btnBg.setDepth(2);

    const btnText = scene.add.text(815, 570, "Fine Turno", {
      fontSize: "13px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    btnText.setDepth(2);

    // Interattività Bottone
    const btnZone = scene.add.zone(815, 570, 130, 32).setInteractive();
    btnZone.on("pointerdown", () => {
      scene.events.emit("endTurn");
    });
    btnZone.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xc0392b, 1);
      btnBg.fillRoundedRect(750, 554, 130, 32, 6);
    });
    btnZone.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0xe74c3c, 1);
      btnBg.fillRoundedRect(750, 554, 130, 32, 6);
    });

    this.updatePanelAlphas();
  }

  private updatePanelAlphas() {
    const ironActive = this.activeFaction === "iron";
    
    this.ironPanel.setAlpha(ironActive ? 1.0 : 0.65);
    this.ironLeaderText.setAlpha(ironActive ? 1.0 : 0.65);
    this.ironAbilityBtn.setAlpha(ironActive ? 1.0 : 0.65);
    this.ironAbilityText.setAlpha(ironActive ? 1.0 : 0.65);
    this.ironCooldownText.setAlpha(ironActive ? 1.0 : 0.65);

    this.shadowPanel.setAlpha(!ironActive ? 1.0 : 0.65);
    this.shadowLeaderText.setAlpha(!ironActive ? 1.0 : 0.65);
    this.shadowAbilityBtn.setAlpha(!ironActive ? 1.0 : 0.65);
    this.shadowAbilityText.setAlpha(!ironActive ? 1.0 : 0.65);
    this.shadowCooldownText.setAlpha(!ironActive ? 1.0 : 0.65);
  }

  update(unit: UnitData | null, currentHp: number) {
    this.hpBar.clear();
    if (!unit) {
      this.nameText.setText("Seleziona un'unità");
      this.hpText.setText("");
      this.attackText.setText("");
      this.defenseText.setText("");
      return;
    }
    const faction = unit.faction === "iron" ? "⚔️ Ordine di Ferro" : "🌑 Conclave delle Ombre";
    const unitName = this.getUnitName(unit.type);
    this.nameText.setText(`${faction}\n${unitName}`);
    this.attackText.setText(`ATK: ${unit.attack}`);
    this.defenseText.setText(`DEF: ${unit.defense}`);

    // Configurazione Barra HP centralizzata nello spazio vuoto
    const barX = 400;
    const barY = 574;
    const barWidth = 150;
    const barHeight = 14;
    const hpPercent = currentHp / unit.hp;

    // Sfondo barra HP
    this.hpBar.fillStyle(0x333333, 1);
    this.hpBar.fillRect(barX, barY, barWidth, barHeight);

    // Riempimento barra HP
    const barColor = hpPercent > 0.5 ? 0x2ecc71 : hpPercent > 0.25 ? 0xf39c12 : 0xe74c3c;
    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    // Bordo barra HP
    this.hpBar.lineStyle(1, 0xffffff, 0.5);
    this.hpBar.strokeRect(barX, barY, barWidth, barHeight);

    // Testo HP centrato perfettamente
    this.hpText.setText(`${currentHp} / ${unit.hp}`);
    this.hpText.setPosition(
      barX + barWidth / 2 - this.hpText.width / 2,
      barY + 1
    );
  }

  private getUnitName(type: string): string {
    if (type === "warrior") return "Guerriero";
    if (type === "archer") return "Arciere";
    return "Mago";
  }

  setLeader(faction: "iron" | "shadow", leaderId: string | null) {
    this.activeFaction = faction;

    const names: Record<string, string> = {
      vael: "⚔️ Vael",
      mira: "🛡️ Mira",
      kael: "🌑 Kael",
      seris: "✨ Seris",
    };

    const leaderName = leaderId ? names[leaderId] ?? leaderId : "—";

    if (faction === "iron") {
      this.ironLeaderText.setText(`Ferro: ${leaderName}`);
    } else {
      this.shadowLeaderText.setText(`Ombre: ${leaderName}`);
    }

    this.updatePanelAlphas();
  }

  setCooldown(current: number) {
    const activeText = this.activeFaction === "iron" ? this.ironCooldownText : this.shadowCooldownText;
    if (current <= 0) {
      activeText.setText("PRONTA").setColor("#2ecc71");
    } else {
      activeText.setText(`CD: ${current}`).setColor("#aaaaaa");
    }
  }
}