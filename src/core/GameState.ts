export type FactionId = "iron" | "shadow";

export type LeaderId =
  | "vael"   // Iron — Assalto Coordinato
  | "mira"   // Iron — Linea Spezzata
  | "kael"   // Shadow — Velo d'Ombra
  | "seris"; // Shadow — Eco dell’Anima

export interface SelectedLeaders {
  iron: LeaderId | null;
  shadow: LeaderId | null;
}

class GameState {
  leaders: SelectedLeaders = { iron: null, shadow: null };

  reset() {
    this.leaders = { iron: null, shadow: null };
  }

  setLeader(faction: FactionId, leader: LeaderId) {
    this.leaders[faction] = leader;
  }

  isReady() {
    return this.leaders.iron !== null && this.leaders.shadow !== null;
  }
}

// Singleton semplice
const gameState = new GameState();
export default gameState;
