import Phaser from "phaser";

export type UnitType = "warrior" | "archer" | "mage";
export type FactionId = "iron" | "shadow" | "npc";
// Nuovi tipi per gestire gli oggetti leggendari custoditi
export type LegendaryItem = "sword" | "bow" | "staff" | null;

export interface UnitData {
  type: UnitType;
  faction: FactionId;
  hp: number;
  attack: number;
  defense: number;
  moveRange: number;
}

export default class Unit {
  private circle: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private selectionRing: Phaser.GameObjects.Graphics;
  public data: UnitData;
  public x: number;
  public y: number;
  public selected: boolean = false;
  public id: string;
  public currentHp: number;
  
  // Inventario dell'unità (null se non ha oggetti)
  public equippedItem: LegendaryItem = null;

  constructor(scene: Phaser.Scene, x: number, y: number, data: UnitData) {
    this.id = `${data.faction}_${data.type}_${Math.random().toString(36).slice(2, 6)}`;
    this.data = data;
    this.x = x;
    this.y = y;
    this.currentHp = data.hp;

    const color = data.faction === "iron" ? 0x4a90d9 
      : data.faction === "shadow" ? 0xd28eff 
      : 0xc0392b; // rosso per NPC

    const icon = this.getIcon(data.type);

    this.selectionRing = scene.add.graphics();

    this.circle = scene.add.graphics();
    this.circle.fillStyle(color, 1);
    this.circle.lineStyle(2, 0xffffff, 1);
    this.circle.fillCircle(x, y, 18);
    this.circle.strokeCircle(x, y, 18);

    this.label = scene.add.text(x, y, icon, {
      fontSize: "16px",
      color: "#ffffff",
    }).setOrigin(0.5);
  }

  // Getter dinamico per l'attacco totale comprensivo dei bonus degli oggetti
  get attack(): number {
    let baseAttack = this.data.attack;
    if (this.equippedItem === "sword" && this.data.type === "warrior") baseAttack += 8;
    if (this.equippedItem === "bow" && this.data.type === "archer") baseAttack += 6;
    if (this.equippedItem === "staff" && this.data.type === "mage") baseAttack += 5;
    return baseAttack;
  }

  // Controlla se l'unità è idonea a raccogliere un determinato oggetto
  canEquip(item: LegendaryItem): boolean {
    if (item === "sword" && this.data.type === "warrior") return true;
    if (item === "bow" && this.data.type === "archer") return true;
    if (item === "staff" && this.data.type === "mage") return true;
    return false;
  }

  // Equipaggia l'oggetto modificando l'HUD e le icone visive
  equipItem(item: LegendaryItem) {
    this.equippedItem = item;
    this.updateVisualIcon();
  }

  // Aggiorna l'icona dell'unità aggiungendo l'emblema dell'arma leggendaria
  private updateVisualIcon() {
    let baseIcon = this.getIcon(this.data.type);
    if (this.equippedItem === "sword") baseIcon += "✨";
    if (this.equippedItem === "bow") baseIcon += "✨";
    if (this.equippedItem === "staff") baseIcon += "✨";
    this.label.setText(baseIcon);
  }

  select() {
    this.selected = true;
    this.selectionRing.clear();
    this.selectionRing.lineStyle(3, 0xf1c40f, 1);
    this.selectionRing.strokeCircle(this.x, this.y, 24);
  }

  deselect() {
    this.selected = false;
    this.selectionRing.clear();
  }

  moveTo(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.circle.clear();
    const color = this.data.faction === "iron" ? 0x4a90d9 
      : this.data.faction === "shadow" ? 0xd28eff 
      : 0xc0392b;
    this.circle.fillStyle(color, 1);
    this.circle.lineStyle(2, 0xffffff, 1);
    this.circle.fillCircle(x, y, 18);
    this.circle.strokeCircle(x, y, 18);

    this.label.setPosition(x, y);
    this.selectionRing.clear();
    if (this.selected) this.select();
  }

  isAtPosition(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < 20;
  }

  private getIcon(type: UnitType): string {
    if (type === "warrior") return "⚔️";
    if (type === "archer") return "🏹";
    return "🔮"; // Cambiato in sfera di cristallo per distinguere l'icona magica dagli effetti luce degli oggetti
  }

  takeDamage(amount: number) {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  isDead(): boolean {
    return this.currentHp <= 0;
  }

  destroy() {
    this.circle.destroy();
    this.label.destroy();
    this.selectionRing.destroy();
  }
}