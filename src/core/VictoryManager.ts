import Phaser from "phaser";

export type FactionId = "iron" | "shadow";

export default class VictoryManager {
  private scene: Phaser.Scene;
  
  // Traccia i turni di assedio subiti da ciascuna fazione
  private homeContestedTurns: Record<FactionId, number> = {
    iron: 0,
    shadow: 0
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Incrementa il contatore se la fazione è in minoranza nella propria base.
   */
  incrementSiegeTurn(faction: FactionId) {
    this.homeContestedTurns[faction]++;
  }

  /**
   * Resetta il contatore se la fazione ha ripulito la propria base.
   */
  resetSiegeTurn(faction: FactionId) {
    this.homeContestedTurns[faction] = 0;
  }

  /**
   * Restituisce i turni correnti di assedio
   */
  getContestedTurns(faction: FactionId): number {
    return this.homeContestedTurns[faction];
  }

  /**
   * Controlla se l'assedio ha raggiunto il limite massimo (2 turni completati)
   * o se si è verificato uno sterminio.
   */
  checkWinConditions(factionThatEnded: FactionId, enemyUnitsCount: number): boolean {
    // 1. ALLKILL: Sterminio immediato
    if (enemyUnitsCount === 0) {
      this.triggerVictory(factionThatEnded, "Sterminio Totale");
      return true;
    }

    // 2. ASSEDIO CRITICO: Se la fazione ha esaurito i suoi 2 turni a disposizione
    if (this.homeContestedTurns[factionThatEnded] >= 2) {
      const winner: FactionId = factionThatEnded === "iron" ? "shadow" : "iron";
      this.triggerVictory(winner, "Occupazione e Controllo del Territorio");
      return true;
    }

    return false;
  }

  private triggerVictory(winnerFaction: FactionId, reason: string) {
    const factionName = winnerFaction === "iron" ? "⚔️ Ordine di Ferro" : "🌑 Conclave delle Ombre";

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    bg.setDepth(100);

    this.scene.add.text(
      this.scene.scale.width / 2, 
      this.scene.scale.height / 2 - 50, 
      `${factionName} vince!`, 
      { fontSize: "32px", color: "#f1c40f", fontStyle: "bold" }
    ).setOrigin(0.5).setDepth(101);

    this.scene.add.text(
      this.scene.scale.width / 2, 
      this.scene.scale.height / 2, 
      `Condizione: ${reason}`, 
      { fontSize: "16px", color: "#ffffff", fontStyle: "italic" }
    ).setOrigin(0.5).setDepth(101);

    const btn = this.scene.add.text(
      this.scene.scale.width / 2, 
      this.scene.scale.height / 2 + 70, 
      " 🔄 NUOVA PARTITA ", 
      { 
        fontSize: "18px", 
        color: "#ffffff", 
        backgroundColor: "#27ae60",
        padding: { x: 20, y: 10 },
        fontStyle: "bold"
      }
    )
    .setOrigin(0.5)
    .setDepth(101)
    .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setBackgroundColor("#2ecc71"));
    btn.on("pointerout", () => btn.setBackgroundColor("#27ae60"));
    btn.on("pointerdown", () => this.scene.scene.start("LeaderSelectScene"));
  }
}