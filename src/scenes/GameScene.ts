import Phaser from "phaser";
import HexGrid from "../map/HexGrid";
import type { HexTile } from "../map/HexGrid";
import Unit from "../units/Unit";
import HUD from "../ui/HUD";
import TurnManager from "../core/TurnManager";
import VictoryManager from "../core/VictoryManager";
//import  config  from "../config"; // Regola il percorso in base alla tua cartella


interface LegendaryChest {
  id: string;
  tile: HexTile;
  item: "sword" | "bow" | "staff";
  guardIds: string[]; 
  openedByFaction: "iron" | "shadow" | null;
  sprite: Phaser.GameObjects.Text; 
}

export default class GameScene extends Phaser.Scene {
  private hexGrid!: HexGrid;
  private units: Unit[] = [];
  private selectedUnit: Unit | null = null;
  private reachableGraphics!: Phaser.GameObjects.Graphics;
  private attackableGraphics!: Phaser.GameObjects.Graphics;
  private hud!: HUD;
  private turnManager!: TurnManager;
  private victoryManager!: VictoryManager;
  private turnText!: Phaser.GameObjects.Text;
  private apText!: Phaser.GameObjects.Text;
  private siegeWarningText!: Phaser.GameObjects.Text;
  private globalStatsText!: Phaser.GameObjects.Text;
  private leaders: { iron: string | null; shadow: string | null } = { iron: null, shadow: null };
  private chests: LegendaryChest[] = [];
  private vaelCooldown: number = 0;
  private isSprintActive: boolean = false;
  private sprintButton!: Phaser.GameObjects.Text; // Il tasto per attivarla
  
  constructor() {
    super({ key: "GameScene" });
  }

  preload() {}

  create() {
    const data = this.scene.settings.data as any;
    if (data && data.leaders) {
      this.leaders = data.leaders;
    }
    
    // Rimozione definitiva del segnaposto L
    this.hexGrid = new HexGrid(this);
    this.hexGrid.draw();

    this.reachableGraphics = this.add.graphics();
    this.attackableGraphics = this.add.graphics();
    this.hud = new HUD(this);
    this.turnManager = new TurnManager();
    
    // SAFETY FIX: Inizializziamo il VictoryManager QUI per evitare che updateTurnIndicator provi a leggerlo a vuoto
    this.victoryManager = new VictoryManager(this);

    this.spawnStartingUnits();
    this.spawnNPCs(); 

    this.turnManager.initUnits(this.units.map(u => u.id));

    this.turnText = this.add.text(10, 10, "", { // Spostato a X: 10
      fontSize: "14px", // Leggermente più piccolo per stare comodo nell'intercapedine
      color: "#ffffff",
      fontStyle: "bold",
      backgroundColor: "#000000",
      padding: { x: 6, y: 5 },
    });

    this.apText = this.add.text(10, 45, "", { // Spostato a X: 10 e Y: 45
      fontSize: "12px",
      color: "#f1c40f",
      backgroundColor: "#000000",
      padding: { x: 6, y: 4 },
    });

    // Testo UI allarme assedio posizionato in alto al centro
    this.siegeWarningText = this.add.text(this.scale.width / 2, 20, "", {
      fontSize: "16px",
      color: "#f1c40f",
      fontStyle: "bold",
      backgroundColor: "#7f1d1d",
      padding: { x: 15, y: 8 },
      stroke: "#000000",
      strokeThickness: 4
    })
    .setOrigin(0.5, 0)
    .setDepth(120) // Alzato leggermente per stare sopra i background generici
    .setVisible(false);

    this.updateTurnIndicator();

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const tile = this.hexGrid.getTileAt(pointer.x, pointer.y);
      if (tile) this.hexGrid.highlightTile(tile.x, tile.y);
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y);
    });

    this.events.on("endTurn", () => {
      this.handleEndTurn();
    });

    
    // ==========================================
    // PANNELLO STATO PARTITA GLOBALE (BLOCCO 2)
    // ==========================================
    const panelW = 160; // Più largo per evitare tagli sul testo lungo
    const panelH = 210; // Più alto per contenere comodamente tutte le righe del Conclave
    const marginRight = 15;
    const statsContainer = this.add.container(this.scale.width - panelW - marginRight, 40);
    statsContainer.setDepth(150); 
    statsContainer.setScrollFactor(0);

    const statsBg = this.add.graphics();
    statsBg.fillStyle(0x111625, 0.85); 
    statsBg.lineStyle(1, 0x4a5568, 1);
    statsBg.fillRoundedRect(0, 0, panelW, panelH, 6); 
    statsBg.strokeRoundedRect(0, 0, panelW, panelH, 6);
    statsContainer.add(statsBg);

    this.globalStatsText = this.add.text(12, 12, "", {
      fontSize: "11px",
      color: "#f8fafc",
      fontStyle: "bold",
      lineSpacing: 3, // Spaziatura ottimizzata
      wordWrap : {width : panelW - 8} //forza a capo e superi la larghezza
    });
    statsContainer.add(this.globalStatsText);

    this.updateGlobalStatsPanel();

    // ==========================================
    // ABILITÀ ATTIVA LEADER: VAEL (BLOCCO 3) - UI MINIMALE
    // ==========================================
    this.sprintButton = this.add.text(5, 75, "⚡ SPRINT", {
      fontSize: "11px",
      color: "#ffffff",
      backgroundColor: "#27ae60", // Verde Smeraldo (Disponibile)
      padding: { x: 4, y: 3 },
      fontStyle: "bold"
    })
    .setOrigin(0, 0) // Forza l'ancoraggio a sinistra contro il bordo dello schermo
    .setDepth(150)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

    this.sprintButton.on("pointerover", () => {
      if (this.vaelCooldown === 0 && !this.isSprintActive) this.sprintButton.setBackgroundColor("#2ecc71"); // Verde più chiaro al passaggio del mouse
    });

    this.sprintButton.on("pointerout", () => {
      if (this.vaelCooldown === 0 && !this.isSprintActive) this.sprintButton.setBackgroundColor("#27ae60"); // Ritorna al verde base
    });

    this.sprintButton.on("pointerdown", () => {
      this.useVaelAbility();
    });

    // Forza l'allineamento e lo stato visivo istantaneo all'avvio
    this.updateSprintButtonUI();
  }

  private updateTurnIndicator() {
    const faction = this.turnManager.getCurrentFaction();
    const factionName = faction === "iron" ? "⚔️ Ordine di Ferro" : "🌑 Conclave delle Ombre";
    const color = faction === "iron" ? "#4a90d9" : "#d28eff";
    this.turnText.setText(`Turno ${this.turnManager.getTurnNumber()} — ${factionName}`);
    this.turnText.setColor(color);
    
    const leaderId = faction === "iron" ? this.leaders.iron : this.leaders.shadow;
    this.hud.setLeader(faction, leaderId);
    this.hud.setCooldown(3); 
    this.updateSprintButtonUI();
  }

  private updateAPIndicator(unit: Unit | null) {
    if (!unit) {
      this.apText.setText("");
      return;
    }
    const ap = this.turnManager.getAP(unit.id);
    this.apText.setText(`PA: ${ap}/3  |  Movimento: ${ap >= 1 ? "✅" : "❌"}  Attacco: ${ap >= 2 ? "✅" : "❌"}`);
  }

  //Gestore passaggio dei turni (Fazione Iron e Shadow)
  private handleEndTurn() {
    if (this.selectedUnit) {
      this.selectedUnit.deselect();
      this.selectedUnit = null;
      this.reachableGraphics.clear();
      this.attackableGraphics.clear();
      this.hud.update(null, 0);
    }

    // Memorizziamo chi ha appena FINITO il suo turno di gioco
    const factionThatJustEnded = this.turnManager.getCurrentFaction() as "iron" | "shadow";

    // 1. Calcoliamo la situazione nella base di chi ha appena FINITO il turno
    let alliesInEndedBase = 0;
    let enemiesInEndedBase = 0;

    this.units.forEach(unit => {
      let tile = this.hexGrid.getTileAt(unit.x, unit.y);
      
      if (!tile) {
        let minDst = 99999;
        this.hexGrid.tiles.forEach(t => {
          const dst = Phaser.Math.Distance.Between(unit.x, unit.y, t.x, t.y);
          if (dst < minDst && dst < 55) { 
            minDst = dst;
            tile = t;
          }
        });
      }

      if (tile) {
        // Un ALLEATO difende la patria se si trova in QUALSIASI casella della propria zona
        const isAllyDefending = unit.data.faction === factionThatJustEnded && tile.zone === factionThatJustEnded;
        
        // Escludiamo gli NPC anche dal verdetto di fine turno
        const enemyFactionId = factionThatJustEnded === "iron" ? "shadow" : "iron";
        const isEnemyInvading = unit.data.faction === enemyFactionId && tile.zone === factionThatJustEnded && tile.type === "plains";

        if (isAllyDefending) {
          alliesInEndedBase++;
        } else if (isEnemyInvading) {
          enemiesInEndedBase++;
        }
      }
    });

    // Se finisce il turno in minoranza numerica (maggioranza stretta degli invasori), prende una sanzione
    if (enemiesInEndedBase > alliesInEndedBase && enemiesInEndedBase > 0) {
      this.victoryManager.incrementSiegeTurn(factionThatJustEnded);
    } else {
      this.victoryManager.resetSiegeTurn(factionThatJustEnded);
    }
    this.updateGlobalStatsPanel();
    // Cambiamo ufficialmente il turno nel TurnManager
    this.turnManager.endTurn();
    // --- NUOVO: Riduciamo il Cooldown delle abilità degli eroi  per chi INIZIA il turno ---
    if (this.turnManager.getCurrentFaction() === "iron") {
      this.updateAbilityCooldowns();
    } else {
      // Se invece tocca allo Shadow, nascondiamo o aggiornamo semplicemente il bottone
      this.updateSprintButtonUI();
    }

    // Chi INIZIA adesso il turno
    const nextFaction = this.turnManager.getCurrentFaction() as "iron" | "shadow";
    const enemyFaction = nextFaction === "iron" ? "shadow" : "iron";

    const enemyUnitsCount = this.units.filter(u => u.data.faction === enemyFaction).length;

    // 2. VERIFICA CONDIZIONI VITTORIA
    if (this.victoryManager.checkWinConditions(factionThatJustEnded, enemyUnitsCount)) {
      return;
    }

    // 3. AGGIORNAMENTO DELLA UI DI ASSEDIO PER IL GIOCATORE SUCCESSIVO
    this.updateSiegeUI();

    this.updateTurnIndicator();
    this.apText.setText("");
 }

  
 //gestione assedio UI
 private updateSiegeUI() {
  const currentFaction = this.turnManager.getCurrentFaction() as "iron" | "shadow";
  
  let alliesInBase = 0;
  let enemiesInBase = 0;

  //console.log(`--- VERIFICA ASSEDIO IN TEMPO REALE (${currentFaction.toUpperCase()}) ---`);

  this.units.forEach(unit => {
    let tile = this.hexGrid.getTileAt(unit.x, unit.y);
    
    // Rilevamento di sicurezza a 55px per esagoni da 42px
    if (!tile) {
      let minDst = 99999;
      this.hexGrid.tiles.forEach(t => {
        const dst = Phaser.Math.Distance.Between(unit.x, unit.y, t.x, t.y);
        if (dst < minDst && dst < 55) { 
          minDst = dst;
          tile = t;
        }
      });
    }

    if (tile) {
      // Un ALLEATO difende la patria se si trova in QUALSIASI casella della propria zona
      const isAllyDefending = unit.data.faction === currentFaction && tile.zone === currentFaction;
      
      // IL FILTRO LEAD DESIGNER: Il nemico deve essere strettamente l'ALTRA fazione giocante, escludendo 'npc'
      const enemyFactionId = currentFaction === "iron" ? "shadow" : "iron";
      const isEnemyInvading = unit.data.faction === enemyFactionId && tile.zone === currentFaction && tile.type === "plains";

      if (isAllyDefending) {
        alliesInBase++;
        //console.log(`[DIFENSORE] ${unit.data.faction.toUpperCase()} protegge la zona su R:${tile.row} C:${tile.col} (${tile.type})`);
      } else if (isEnemyInvading) {
        enemiesInBase++;
        //console.log(`[INVASORE] ${unit.data.faction.toUpperCase()} occupa le Pianure vitali su R:${tile.row} C:${tile.col}`);
      }
    }
  });

  console.log(`BILANCIO DIFESA -> Alleati a presidio: ${alliesInBase} | Invasori sulle Pianure: ${enemiesInBase}`);

  // Maggioranza stretta degli invasori per far scattare l'allarme
  const isCurrentlyOverrun = enemiesInBase > alliesInBase && enemiesInBase > 0;
  const currentFactionTurns = this.victoryManager.getContestedTurns(currentFaction);
  const factionName = currentFaction === "iron" ? "ORDINE DI FERRO" : "CONCLAVE DELLE OMBRE";

  if (isCurrentlyOverrun) {
    if (currentFactionTurns === 0) {
      this.siegeWarningText.setText(`⚠️ ATTENZIONE: Base ${factionName} sotto assedio! Turni: 1/2 ⚠️`);
      this.siegeWarningText.setBackgroundColor("#d97706");
      this.siegeWarningText.setVisible(true);
    } else {
      this.siegeWarningText.setText(`🚨 ULTIMA SPIAGGIA: Base ${factionName} sotto assedio! Turni: 2/2 🚨`);
      this.siegeWarningText.setBackgroundColor("#7f1d1d");
      this.siegeWarningText.setVisible(true);
    }
  } else {
    this.siegeWarningText.setVisible(false);
  }
  this.updateGlobalStatsPanel();
}

  

  private handleClick(px: number, py: number) {
    const currentFaction = this.turnManager.getCurrentFaction();
    const clickedUnit = this.units.find(u => u.isAtPosition(px, py));
    const clickedTile = this.hexGrid.getTileAt(px, py);

    if (clickedTile && !clickedUnit) {
      const chest = this.chests.find(c => c.tile === clickedTile);
      if (chest && this.selectedUnit && this.selectedUnit.data.faction === currentFaction) {
        const attackerTile = this.hexGrid.tiles.find(t => Math.abs(t.x - this.selectedUnit!.x) < 5 && Math.abs(t.y - this.selectedUnit!.y) < 5);
        if (attackerTile && this.hexGrid.hexDistance(attackerTile, chest.tile) === 1) {
          this.handleChestInteraction(chest, this.selectedUnit);
          return;
        }
      }
    }

    if (clickedUnit) {
      if (
        this.selectedUnit &&
        clickedUnit.data.faction !== currentFaction &&
        this.turnManager.canAttack(this.selectedUnit.id) &&
        this.isTargetable(this.selectedUnit, clickedUnit)
      ) {
        this.handleAttack(this.selectedUnit, clickedUnit);
        return;
      }
      if (clickedUnit.data.faction !== currentFaction) return;
      if (this.selectedUnit) this.selectedUnit.deselect();
      this.selectedUnit = clickedUnit;
      clickedUnit.select();

      // =======================================================
      // INIEZIONE ABILITÀ ATTIVA: SPRINT DI VAEL (PORTFOLIO EFFECT)
      // =======================================================
      if (clickedUnit.data.faction === "iron" && this.isSprintActive) {
        
        // Chiamata pulita al TurnManager usando il metodo nativo dell'architettura
        this.turnManager.addAP(clickedUnit.id, 1);

        // 2. Consuma lo stato e lancia il cooldown di 3 turni
        this.isSprintActive = false;
        this.vaelCooldown = 3;
        this.updateSprintButtonUI();

        // 3. Spettacolare Testo Fluttuante per sbalordire il recruiter
        const sprintFloatingText = this.add.text(clickedUnit.x, clickedUnit.y - 20, "⚡ SPRINT +1 PA!", {
          fontSize: "14px",
          color: "#f1c40f",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
          targets: sprintFloatingText,
          y: sprintFloatingText.y - 40,
          alpha: 0,
          duration: 1200,
          onComplete: () => sprintFloatingText.destroy()
        });
        // Forza l'HUD a leggere i nuovi AP appena iniettati
        this.updateAPIndicator(clickedUnit);
      }
      // =======================================================

      this.showReachableTiles(clickedUnit);
      this.showAttackableTiles(clickedUnit);
      
      // Mappatura dinamica dell'attacco alla selezione
      const displayData = { 
        ...clickedUnit.data, 
        attack: clickedUnit.attack 
      };
      this.hud.update(displayData, clickedUnit.currentHp);
      this.updateAPIndicator(clickedUnit);
      return;
    }

    if (this.selectedUnit) {
      if (clickedTile && this.isTileReachable(clickedTile, this.selectedUnit)) {
        if (!this.turnManager.canMove(this.selectedUnit.id)) return;
        this.turnManager.spendAP(this.selectedUnit.id, 1);
        this.selectedUnit.moveTo(clickedTile.x, clickedTile.y);
        this.updateSiegeUI();//ok qui?
        this.updateAPIndicator(this.selectedUnit);
        this.showReachableTiles(this.selectedUnit);
        this.showAttackableTiles(this.selectedUnit);
        return;
      }
      this.selectedUnit.deselect();
      this.selectedUnit = null;
      this.reachableGraphics.clear();
      this.attackableGraphics.clear();
      this.hud.update(null, 0);
      this.apText.setText("");
    }
  }

  private handleChestInteraction(chest: LegendaryChest, unit: Unit) {
    chest.guardIds = chest.guardIds.filter(id => this.units.some(u => u.id === id));

    if (chest.guardIds.length > 0) {
      this.showFloatingText(chest.tile.x, chest.tile.y, "🔒 Custodito da Guardie!", "#e74c3c");
      return;
    }

    if (chest.openedByFaction !== null) {
      this.showFloatingText(chest.tile.x, chest.tile.y, "Già Sbloccato", "#aaaaaa");
      return;
    }

    if (!unit.canEquip(chest.item)) {
      this.showFloatingText(chest.tile.x, chest.tile.y, "Classe Inadatta!", "#f39c12");
      return;
    }

    chest.openedByFaction = unit.data.faction as "iron" | "shadow";
    unit.equipItem(chest.item);
    chest.sprite.setText("🔓");
    

    // Forza il ricalcolo dell'attacco subito dopo l'apertura del forziere
    const displayData = { 
      ...unit.data, 
      attack: unit.attack 
    };
    this.hud.update(displayData, unit.currentHp);

    const itemName = chest.item === "sword" ? "Spada Leggendaria" : chest.item === "bow" ? "Arco Leggendario" : "Staffa Leggendaria";
    this.showFloatingText(unit.x, unit.y, `Ottenuto: ${itemName}! ✨`, "#2ecc71");
  }

  private showFloatingText(x: number, y: number, msg: string, hexColor: string) {
    const txt = this.add.text(x, y - 30, msg, { fontSize: "14px", color: hexColor, fontStyle: "bold" }).setOrigin(0.5);
    this.tweens.add({ targets: txt, y: y - 60, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
  }

  private showReachableTiles(unit: Unit) {
    this.reachableGraphics.clear();
    if (!this.turnManager.canMove(unit.id)) return;

    const reachable = this.getReachableTiles(unit);
    reachable.forEach(tile => {
      this.reachableGraphics.lineStyle(2, 0xf1c40f, 0.8);
      this.reachableGraphics.fillStyle(0xf1c40f, 0.2);

      const points: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = Phaser.Math.DegToRad(60 * i - 30);
        points.push(new Phaser.Math.Vector2(tile.x + 48 * Math.cos(angle), tile.y + 48 * Math.sin(angle)));
      }

      this.reachableGraphics.beginPath();
      this.reachableGraphics.moveTo(points[0].x, points[0].y);
      points.forEach(p => this.reachableGraphics.lineTo(p.x, p.y));
      this.reachableGraphics.closePath();
      this.reachableGraphics.fillPath();
      this.reachableGraphics.strokePath();
    });
  }

  private getReachableTiles(unit: Unit): HexTile[] {
    const unitTile = this.hexGrid.tiles.find(t => Math.abs(t.x - unit.x) < 5 && Math.abs(t.y - unit.y) < 5);
    if (!unitTile) return [];
    return this.hexGrid.tiles.filter(tile => {
      const dist = this.hexGrid.hexDistance(unitTile, tile);
      return dist > 0 && dist <= unit.data.moveRange;
    });
  }

  private isTileReachable(tile: HexTile, unit: Unit): boolean {
    return this.getReachableTiles(unit).includes(tile);
  }

  private spawnStartingUnits() {
    const ironTiles = this.hexGrid.tiles.filter(t => t.zone === "iron");
    const shadowTiles = this.hexGrid.tiles.filter(t => t.zone === "shadow");

    this.units.push(new Unit(this, ironTiles[0].x, ironTiles[0].y, this.applyLeaderBonusesOnSpawn({
      type: "warrior", faction: "iron", hp: 100, attack: 20, defense: 15, moveRange: 2
    })));
    this.units.push(new Unit(this, ironTiles[3].x, ironTiles[3].y, this.applyLeaderBonusesOnSpawn({
      type: "archer", faction: "iron", hp: 80, attack: 25, defense: 10, moveRange: 2
    })));
    this.units.push(new Unit(this, ironTiles[6].x, ironTiles[6].y, this.applyLeaderBonusesOnSpawn({
      type: "mage", faction: "iron", hp: 60, attack: 35, defense: 5, moveRange: 1
    })));

    this.units.push(new Unit(this, shadowTiles[0].x, shadowTiles[0].y, this.applyLeaderBonusesOnSpawn({
      type: "warrior", faction: "shadow", hp: 100, attack: 20, defense: 15, moveRange: 2
    })));
    this.units.push(new Unit(this, shadowTiles[3].x, shadowTiles[3].y, this.applyLeaderBonusesOnSpawn({
      type: "archer", faction: "shadow", hp: 80, attack: 25, defense: 10, moveRange: 2
    })));
    this.units.push(new Unit(this, shadowTiles[6].x, shadowTiles[6].y, this.applyLeaderBonusesOnSpawn({
      type: "mage", faction: "shadow", hp: 60, attack: 35, defense: 5, moveRange: 1
    })));
  }

  private applyLeaderBonusesOnSpawn(base: { type: "warrior" | "archer" | "mage"; faction: "iron" | "shadow"; hp: number; attack: number; defense: number; moveRange: number; }): typeof base {
    const data = { ...base };
    if (data.faction === "iron" && this.leaders.iron === "vael" && data.type === "warrior") {
      data.moveRange += 1;
    }
    if (data.faction === "shadow" && this.leaders.shadow === "seris" && (data.type === "archer" || data.type === "mage")) {
      data.attack += 1;
    }
    return data;
  }

  private spawnNPCs() {
    const neutralTiles = this.hexGrid.tiles.filter(t => t.zone === "neutral");

    const chestPositions = [neutralTiles[2], neutralTiles[10], neutralTiles[18]];
    const items: ("sword" | "bow" | "staff")[] = ["sword", "bow", "staff"];

    chestPositions.forEach((tile, i) => {
      const chestText = this.add.text(tile.x, tile.y, "📦", { fontSize: "20px" }).setOrigin(0.5);
      
      const chest: LegendaryChest = {
        id: `chest_${i}`,
        tile: tile,
        item: items[i],
        guardIds: [],
        openedByFaction: null,
        sprite: chestText
      };

      const adjacentTiles = this.hexGrid.tiles.filter(t => this.hexGrid.hexDistance(tile, t) === 1);
      const guardsToSpawn = Math.min(2, adjacentTiles.length);

      for (let g = 0; g < guardsToSpawn; g++) {
        const guardTile = adjacentTiles[g];
        const npcGuard = new Unit(this, guardTile.x, guardTile.y, {
          type: g === 0 ? "warrior" : "archer",
          faction: "npc",
          hp: 65,
          attack: 16,
          defense: 9,
          moveRange: 0,
        });

        this.units.push(npcGuard);
        chest.guardIds.push(npcGuard.id); 
      }

      this.chests.push(chest);
    });
  }

  private isTargetable(attacker: Unit, target: Unit): boolean {
    const targetTile = this.hexGrid.tiles.find(t => Math.abs(t.x - target.x) < 5 && Math.abs(t.y - target.y) < 5);
    if (!targetTile) return false;
    return this.getAttackableTiles(attacker).includes(targetTile);
  }

  private isLineOfSightClear(attackerTile: HexTile, targetTile: HexTile): boolean {
    const dist = this.hexGrid.hexDistance(attackerTile, targetTile);
    if (dist <= 1) return true;

    const intermediateTiles = this.hexGrid.tiles.filter(t => 
      this.hexGrid.hexDistance(attackerTile, t) === 1 && 
      this.hexGrid.hexDistance(t, targetTile) === 1
    );
    return !intermediateTiles.some(t => t.type === "forest" || t.type === "mountain");
  }

  private getAttackableTiles(unit: Unit): HexTile[] {
    const unitTile = this.hexGrid.tiles.find(t => Math.abs(t.x - unit.x) < 5 && Math.abs(t.y - unit.y) < 5);
    if (!unitTile) return [];

    return this.hexGrid.tiles.filter(tile => {
      let dist = this.hexGrid.hexDistance(unitTile, tile);
      if (dist === 0) return false;

      let maxRange = 2;
      if (unit.data.type === "archer" && unit.equippedItem === "bow") {
        maxRange = 3;
      }

      if (unit.data.type === "warrior") return dist === 1;
      
      if (unit.data.type === "archer") {
        if (dist > maxRange) return false;
        return this.isLineOfSightClear(unitTile, tile);
      }

      if (unit.data.type === "mage") return dist <= maxRange;
      return false;
    });
  }

  private showAttackableTiles(unit: Unit) {
    this.attackableGraphics.clear();
    if (!this.turnManager.canAttack(unit.id)) return;

    const attackable = this.getAttackableTiles(unit);
    attackable.forEach(tile => {
      const size = 48;
      const points: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = Phaser.Math.DegToRad(60 * i - 30);
        points.push(new Phaser.Math.Vector2(tile.x + size * Math.cos(angle), tile.y + size * Math.sin(angle)));
      }

      this.attackableGraphics.fillStyle(0xe74c3c, 0.15);
      this.attackableGraphics.beginPath();
      this.attackableGraphics.moveTo(points[0].x, points[0].y);
      points.forEach(p => this.attackableGraphics.lineTo(p.x, p.y));
      this.attackableGraphics.closePath();
      this.attackableGraphics.fillPath();

      this.attackableGraphics.lineStyle(2, 0xe74c3c, 0.8);
      for (let i = 0; i < 6; i++) {
        this.drawDottedLine(this.attackableGraphics, points[i].x, points[i].y, points[(i + 1) % 6].x, points[(i + 1) % 6].y, 4, 4);
      }
    });
  }

  private drawDottedLine(graphics: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, dotLength = 4, gapLength = 4) {
    const dx = x2 - x1; const dy = y2 - y1; const len = Math.sqrt(dx * dx + dy * dy);
    const normalX = dx / len; const normalY = dy / len;
    let progress = 0;
    while (progress < len) {
      const drawLen = Math.min(dotLength, len - progress);
      const startX = x1 + normalX * progress; const startY = y1 + normalY * progress;
      graphics.lineBetween(startX, startY, startX + normalX * drawLen, startY + normalY * drawLen);
      progress += dotLength + gapLength;
    }
  }

  private getDamage(attacker: Unit, target: Unit, dist: number, targetTile: HexTile): number {
    let targetDefense = target.data.defense;
    const isRanged = dist > 1;

    let ignoreCover = false;
    if (attacker.data.type === "mage" && attacker.equippedItem === "staff") {
      ignoreCover = true;
    }

    if (targetTile.type === "forest" && isRanged) {
      if (attacker.data.type !== "mage" && !ignoreCover) targetDefense += 2;
    }

    if (targetTile.type === "mountain" && isRanged) {
      if (ignoreCover) targetDefense += 1; 
      else targetDefense += 3;
    }

    if (targetTile.type === "forest" && target.data.faction === "iron" && this.leaders.iron === "mira") {
      targetDefense += 2;
    }

    const randomBonus = Math.floor(Math.random() * 4);
    let baseDamage = attacker.attack - targetDefense + randomBonus;

    if (dist >= 2) baseDamage -= 1;

    if (attacker.data.type === "archer" && attacker.equippedItem === "bow" && targetTile.type === "mountain") {
      baseDamage -= 1;
    }

    if (attacker.data.type === "mage" && targetTile.type === "mountain") baseDamage -= 1;

    if (attacker.data.faction === "shadow" && this.leaders.shadow === "kael" && Math.random() < 0.2) {
      baseDamage += 1;
    }

    return Math.max(1, baseDamage);
  }

  private handleAttack(attacker: Unit, target: Unit) {
    const attackerTile = this.hexGrid.tiles.find(t => Math.abs(t.x - attacker.x) < 5 && Math.abs(t.y - attacker.y) < 5);
    const targetTile = this.hexGrid.tiles.find(t => Math.abs(t.x - target.x) < 5 && Math.abs(t.y - target.y) < 5);
    if (!attackerTile || !targetTile) return;

    const dist = this.hexGrid.hexDistance(attackerTile, targetTile);
    const damage = this.getDamage(attacker, target, dist, targetTile);

    target.takeDamage(damage);
    this.showFloatingText(target.x, target.y, `-${damage}`, "#e74c3c");

    this.turnManager.spendAP(attacker.id, 2);
    this.updateAPIndicator(attacker);

    if (target.isDead()) {
      this.handleUnitDeath(target);
      
      if (attacker.data.type === "warrior" && attacker.equippedItem === "sword") {
        this.turnManager.addAP(attacker.id, 1);
        this.showFloatingText(attacker.x, attacker.y, "+1 PA Furia! ⚔️", "#f1c40f");
      }
    } else if (target.data.faction === "npc") {
      const targetAttackable = this.getAttackableTiles(target);
      if (targetAttackable.includes(attackerTile)) {
        const counterDamage = this.getDamage(target, attacker, dist, attackerTile);
        attacker.takeDamage(counterDamage);
        this.showFloatingText(attacker.x, attacker.y, `-${counterDamage}`, "#e67e22");

        if (attacker.isDead()) {
          this.handleUnitDeath(attacker);
          this.selectedUnit = null;
          this.reachableGraphics.clear();
          this.attackableGraphics.clear();
          this.hud.update(null, 0);
          this.apText.setText("");
          return;
        }
      }
    }

    // Aggiornamento dell'HUD post-attacco corretto con i dati dinamici dell'attaccante
    const displayData = { 
      ...attacker.data, 
      attack: attacker.attack 
    };
    this.hud.update(displayData, attacker.currentHp);
    
    attacker.deselect();
    this.selectedUnit = null;
    this.reachableGraphics.clear();
    this.attackableGraphics.clear();
  }

 private handleUnitDeath(unit: Unit) 
 {
    // 1. Distrugge la grafica dell'unità ed elimina i testi associati
    unit.destroy();
    
    // 2. Rimuove l'unità dalla lista globale delle unità attive
    this.units = this.units.filter(u => u.id !== unit.id);
    this.updateSiegeUI();
  }

  /* private showVictory(factionName: string) {
    this.add.graphics().fillStyle(0x000000, 0.85).fillRect(200, 200, 500, 150).setDepth(20);
    this.add.text(450, 265, `${factionName} vince!`, { fontSize: "26px", color: "#f1c40f", fontStyle: "bold" }).setOrigin(0.5).setDepth(21);
    this.add.text(450, 320, "Ricarica la pagina per rigiocare", { fontSize: "14px", color: "#ffffff" }).setOrigin(0.5).setDepth(21);
  } */


    //salva lo stato corrente per quanto riguarda l'assedio tra fazioni (da passare poi al pannello apposito da mostrare a UI)
  private getGlobalSiegeStatus() {
    let ironAllies = 0;
    let ironEnemies = 0;
    let shadowAllies = 0;
    let shadowEnemies = 0;

    this.units.forEach(unit => {
      let tile = this.hexGrid.getTileAt(unit.x, unit.y);
      
      
      // Tolleranza geometrica ottimizzata a 55px (55 * 55 = 3025)
      if (!tile) {
        let minDstSq = 3025; // 55 al quadrato: evita calcoli di radici quadrate inutili

        this.hexGrid.tiles.forEach(t => {
          // Calcolo manuale della distanza al quadrato (X^2 + Y^2)
          const dx = unit.x - t.x;
          const dy = unit.y - t.y;
          const dstSq = (dx * dx) + (dy * dy);

          // Se è più vicino del limite e del record precedente, lo salva
          if (dstSq < minDstSq) { 
            minDstSq = dstSq;
            tile = t;
          }
        });
      }


      if (tile) {
        // Conteggio asimmetrico per la zona IRON (colonne < 3)
        if (tile.zone === "iron") {
          if (unit.data.faction === "iron") {
            ironAllies++;
          } else if (unit.data.faction === "shadow") { // Esclude rigidamente gli NPC
            if (tile.type === "plains") ironEnemies++;
          }
        }
        
        // Conteggio asimmetrico per la zona SHADOW (colonne > 5)
        if (tile.zone === "shadow") {
          if (unit.data.faction === "shadow") {
            shadowAllies++;
          } else if (unit.data.faction === "iron") { // Esclude rigidamente gli NPC
            if (tile.type === "plains") shadowEnemies++;
          }
        }
      }
    });

    return {
      iron: { allies: ironAllies, enemies: ironEnemies },
      shadow: { allies: shadowAllies, enemies: shadowEnemies }
    };
  }

  //metodo di aggiornamento dei pannello UI controllo stato assedio 
  private updateGlobalStatsPanel() {
    if (!this.globalStatsText) return;

    const siegeTurnsIron = this.victoryManager.getContestedTurns("iron");
    const siegeTurnsShadow = this.victoryManager.getContestedTurns("shadow");
    const presence = this.getGlobalSiegeStatus();

    this.globalStatsText.setText(
      `🏆 STATO DELLA DOMINAZIONE\n` +
      `---------------------\n` +
      `⚔️ ORDINE DI FERRO (Sinistra)\n` +
      `  • ${presence.iron.allies} Dif. / ${presence.iron.enemies} Inv.\n` +
      `  • Assedio: ${siegeTurnsIron}/2 Turni\n\n` +
      `🌑 CONCLAVE OMBRE (Destra)\n` +
      `  • ${presence.shadow.allies} Dif. / ${presence.shadow.enemies} Inv.\n` +
      `  • Assedio: ${siegeTurnsShadow}/2 Turni`
    );
  }

  //GESTIONE ABILITA EROI
  //ORDINE DI FERRO 
  //Vael
  private useVaelAbility() {
    // 1. Controllo fazione (solo Iron può usarla)
    if (this.turnManager.getCurrentFaction() !== "iron") return;
    
    // 2. Controllo Cooldown
    if (this.vaelCooldown > 0) return;

    // 3. Attivazione dello stato
    this.isSprintActive = true;
    
    // Sincronizziamo lo stile UI minimale anche al momento del clic immediato
    this.updateSprintButtonUI();
    
    console.log("[LEADER SKILL] Vael attiva Sprint. La prossima unità Iron selezionata avrà +1 PA!");
  }

  // Da chiamare dentro il tuo `handleEndTurn()` per gestire il timer del Cooldown
  private updateAbilityCooldowns() 
  {
    if (this.vaelCooldown > 0) {
      this.vaelCooldown--;
    }
    
    // Resetta lo stato se scatta il turno dello Shadow senza che sia stato usato
    if (this.turnManager.getCurrentFaction() !== "iron") {
      this.isSprintActive = false;
    }

    this.updateSprintButtonUI();
  }

  private updateSprintButtonUI() {
    if (!this.sprintButton) return;

    // 1. Nascondi se non è il turno dell'Iron
    if (this.turnManager.getCurrentFaction() !== "iron") {
      this.sprintButton.setVisible(false);
      return;
    }

    this.sprintButton.setVisible(true);

    // POSIZIONAMENTO CRITICO UI: Schiacciato al bordo sinistro (X: 5), sotto i testi di Turno e AP
    this.sprintButton.setX(5); 
    this.sprintButton.setY(75); 
    this.sprintButton.setOrigin(0, 0); // Forza l'allineamento a sinistra per evitare overflow a specchio

    // STILE MINIMALISTA (Font mini, padding ridotto al minimo per non fare spessore)
    const minimalStyle = {
      fontSize: '11px',
      fontStyle: 'bold',
      padding: { x: 4, y: 3 }
    };

    if (this.vaelCooldown > 0) {
      // STATO: COOLDOWN (Es: "⏳ 2") -> Larghezza stimata: ~30px
      this.sprintButton.setText(`⏳ ${this.vaelCooldown}`);
      this.sprintButton.setBackgroundColor("#34495e"); // Grigio scuro/Inattivo
      this.sprintButton.setStyle({ ...minimalStyle, fill: '#7f8c8d' });
      
    } else if (this.isSprintActive) {
      // STATO: ATTIVO/IN ATTESA (Es: "⚡ [ON]") -> Larghezza stimata: ~50px
      this.sprintButton.setText("⚡ [ON]");
      this.sprintButton.setBackgroundColor("#d35400"); // Arancione Fuoco/Attivo
      this.sprintButton.setStyle({ ...minimalStyle, fill: '#ffffff' });

    } else {
      // STATO: PRONTO ALL'USO (Es: "⚡ SPRINT") -> Larghezza stimata: ~60px
      this.sprintButton.setText("⚡ SPRINT");
      this.sprintButton.setBackgroundColor("#27ae60"); // Verde Smeraldo / Disponibile
      this.sprintButton.setStyle({ ...minimalStyle, fill: '#ffffff' });
    }
  }
}