export type FactionId = "iron" | "shadow" | "npc";

export interface TurnState {
  currentFaction: "iron" | "shadow";
  turnNumber: number;
}

export default class TurnManager {
  private currentFaction: "iron" | "shadow" = "iron";
  private turnNumber: number = 1;
  private actionPoints: Map<string, number> = new Map();
  private readonly MAX_AP = 3;

  getCurrentFaction(): "iron" | "shadow" {
    return this.currentFaction;
  }

  getTurnNumber(): number {
    return this.turnNumber;
  }

  // Inizializza i punti azione per tutte le unità
  initUnits(unitIds: string[]) {
    unitIds.forEach(id => this.actionPoints.set(id, this.MAX_AP));
  }

  getAP(unitId: string): number {
    return this.actionPoints.get(unitId) ?? 0;
  }

  spendAP(unitId: string, amount: number): boolean {
    const current = this.getAP(unitId);
    if (current < amount) return false;
    this.actionPoints.set(unitId, current - amount);
    return true;
  }

  // Aggiunge PA extra a runtime (es. Effetto della Spada Leggendaria su uccisione)
  addAP(unitId: string, amount: number) {
    const current = this.getAP(unitId);
    // Permette l'accumulo dinamico senza sforare il cap massimo prefissato
    this.actionPoints.set(unitId, Math.min(this.MAX_AP, current + amount));
  }

  canMove(unitId: string): boolean {
    return this.getAP(unitId) >= 1;
  }

  canAttack(unitId: string): boolean {
    return this.getAP(unitId) >= 2;
  }

  endTurn(): "iron" | "shadow" {
    this.currentFaction = this.currentFaction === "iron" ? "shadow" : "iron";
    if (this.currentFaction === "iron") this.turnNumber++;
    
    // Resetta gli AP al valore massimo per tutte le unità all'inizio del nuovo ciclo
    this.actionPoints.forEach((_, id) => {
      this.actionPoints.set(id, this.MAX_AP);
    });
    return this.currentFaction;
  }
}