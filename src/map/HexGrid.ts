import Phaser from "phaser";
import Config from "../config";

export type TileType = "plains" | "forest" | "mountain";
export type FactionZone = "iron" | "shadow" | "neutral";

export interface HexTile {
  row: number;
  col: number;
  x: number;
  y: number;
  type: TileType;
  zone: FactionZone;
}

export default class HexGrid {
  private graphics: Phaser.GameObjects.Graphics;
  private highlightGraphics: Phaser.GameObjects.Graphics;
  public tiles: HexTile[] = [];

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.highlightGraphics = scene.add.graphics();
  }

  draw() {
    this.tiles = []; // <--- SVUOTA L'ARRAY QUI!
    const size = Config.tileSize;
    const cols = Config.gridCols;
    const rows = Config.gridRows;
    const offsetX = 100;
    const offsetY = 80;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * (size * 1.75);
        const y = offsetY + row * (size * 1.5) + (col % 2 === 0 ? 0 : size * 0.75);

        const zone = this.getZone(col);
        const type = this.getRandomType();

        const tile: HexTile = { row, col, x, y, type, zone };
        this.tiles.push(tile);

        this.drawHex(x, y, size, zone, type);
      }
    }
  }

  private getZone(col: number): FactionZone {
    if (col < 3) return "iron";
    if (col > 5) return "shadow";
    return "neutral";
  }

  private getRandomType(): TileType {
    const types: TileType[] = ["plains", "plains", "plains", "forest", "mountain"];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getTileColor(zone: FactionZone, type: TileType): number {
    if (type === "forest") return 0x27ae60;
    if (type === "mountain") return 0x7f8c8d;

    // plains — colore basato sulla zona
    if (zone === "iron") return 0x1a5276;
    if (zone === "shadow") return 0x6c3483;
    return 0x2c3e50;
  }

  private drawHex(x: number, y: number, size: number, zone: FactionZone, type: TileType) {
    const points: Phaser.Math.Vector2[] = [];

    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(60 * i - 30);
      points.push(new Phaser.Math.Vector2(
        x + size * Math.cos(angle),
        y + size * Math.sin(angle)
      ));
    }

    const fillColor = this.getTileColor(zone, type);
    const borderColor = zone === "iron" ? 0x4a90d9 : zone === "shadow" ? 0xd28eff : 0x888888;

    this.graphics.lineStyle(2, borderColor, 1);
    this.graphics.fillStyle(fillColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x, points[i].y);
    }

    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();
  }

  highlightTile(x: number, y: number) {
    const size = Config.tileSize;
    const points: Phaser.Math.Vector2[] = [];

    this.highlightGraphics.clear();

    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(60 * i - 30);
      points.push(new Phaser.Math.Vector2(
        x + size * Math.cos(angle),
        y + size * Math.sin(angle)
      ));
    }

    this.highlightGraphics.lineStyle(3, 0xf1c40f, 1);
    this.highlightGraphics.beginPath();
    this.highlightGraphics.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.highlightGraphics.lineTo(points[i].x, points[i].y);
    }

    this.highlightGraphics.closePath();
    this.highlightGraphics.strokePath();
  }

  getTileAt(px: number, py: number): HexTile | null {
    const size = Config.tileSize;
    for (const tile of this.tiles) {
      const dx = px - tile.x;
      const dy = py - tile.y;
      if (Math.sqrt(dx * dx + dy * dy) < size) {
        return tile;
      }
    }
    return null;
  }

  hexDistance(a: HexTile, b: HexTile): number {
  // Converti offset col/row in coordinate cubiche
  const tocube = (tile: HexTile) => {
    const x = tile.col;
    const z = tile.row - (tile.col - (tile.col & 1)) / 2;
    const y = -x - z;
    return { x, y, z };
  };

  const ac = tocube(a);
  const bc = tocube(b);

  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z)
  );
}

}
