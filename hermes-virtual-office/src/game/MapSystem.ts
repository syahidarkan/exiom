/**
 * Exiom Virtual Office — Navigation & Interaction Engine
 *
 * Implements:
 *  - bisaJalan(x, y)    → collision check (wall zones)
 *  - cekInteraksi(x, y) → finds nearest interactive zone
 *  - Character          → state machine (idle/walk/sit/pray/swim/…)
 */

import type {
  Zone, Room, MapData, Rect, Vec2,
  ZoneType, Direction, AnimSet, CharState, CharacterSnapshot,
} from './types';

// ─────────────────────────────────────────────
// GEOMETRY HELPERS
// ─────────────────────────────────────────────

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function expandRect(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

function rectCenter(r: Rect): Vec2 {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dxdyToDirection(dx: number, dy: number): Direction {
  if (dx > 0 && dy < 0) return 'NE';
  if (dx > 0 && dy > 0) return 'SE';
  if (dx < 0 && dy > 0) return 'SW';
  if (dx < 0 && dy < 0) return 'NW';
  if (dx > 0) return 'E';
  if (dx < 0) return 'W';
  return dy < 0 ? 'N' : 'S';
}

// ─────────────────────────────────────────────
// SPATIAL INDEX (grid-bucket for fast lookup)
// ─────────────────────────────────────────────

class SpatialIndex {
  private cells = new Map<string, Zone[]>();

  constructor(private cellSize = 256) {}

  private cellsForRect(r: Rect): string[] {
    const cs = this.cellSize;
    const x1 = Math.floor(r.x / cs);
    const y1 = Math.floor(r.y / cs);
    const x2 = Math.floor((r.x + r.w) / cs);
    const y2 = Math.floor((r.y + r.h) / cs);
    const keys: string[] = [];
    for (let cx = x1; cx <= x2; cx++)
      for (let cy = y1; cy <= y2; cy++)
        keys.push(`${cx},${cy}`);
    return keys;
  }

  insert(zone: Zone): void {
    for (const key of this.cellsForRect(zone.bounds)) {
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key)!.push(zone);
    }
  }

  /** Returns candidate zones whose cells overlap with point + radius. */
  query(px: number, py: number, radius = 0): Zone[] {
    const searchRect: Rect = { x: px - radius, y: py - radius, w: radius * 2, h: radius * 2 };
    const seen = new Set<string>();
    const results: Zone[] = [];
    for (const key of this.cellsForRect(searchRect)) {
      for (const z of this.cells.get(key) ?? []) {
        if (!seen.has(z.id)) {
          seen.add(z.id);
          results.push(z);
        }
      }
    }
    return results;
  }
}

// ─────────────────────────────────────────────
// MAP SYSTEM — main navigation + interaction API
// ─────────────────────────────────────────────

const WALKABLE_TYPES: Set<ZoneType> = new Set(['floor', 'door', 'sit', 'pray', 'swim', 'wudu', 'eat', 'bar', 'whiteboard', 'reception', 'shoot', 'work']);
const INTERACTIVE_TYPES: Set<ZoneType> = new Set(['sit', 'pray', 'swim', 'wudu', 'eat', 'bar', 'whiteboard', 'reception', 'shoot', 'work', 'door']);

export class MapSystem {
  readonly rooms: Map<string, Room> = new Map();
  private wallIndex = new SpatialIndex(256);
  private interactIndex = new SpatialIndex(512);
  private allZones: Zone[] = [];

  constructor(data: MapData) {
    for (const r of data.rooms) this.rooms.set(r.id, r);
    for (const z of data.zones) {
      this.allZones.push(z);
      if (z.type === 'wall') this.wallIndex.insert(z);
      else if (INTERACTIVE_TYPES.has(z.type)) this.interactIndex.insert(z);
    }
  }

  // ── PUBLIC API ──────────────────────────────

  /**
   * bisaJalan — returns true when (px, py) is not blocked by a wall zone.
   * Accounts for character half-width (charRadius) for body collision.
   */
  bisaJalan(px: number, py: number, charRadius = 12): boolean {
    const candidates = this.wallIndex.query(px, py, charRadius + 8);
    for (const z of candidates) {
      if (pointInRect(px, py, expandRect(z.bounds, charRadius))) return false;
    }
    return true;
  }

  /**
   * cekInteraksi — returns the nearest interactive zone within `radius` px,
   * or null if nothing is close enough.
   */
  cekInteraksi(px: number, py: number, radius = 64): Zone | null {
    const candidates = this.interactIndex.query(px, py, radius);
    let nearest: Zone | null = null;
    let nearestDist = Infinity;

    for (const z of candidates) {
      if (!pointInRect(px, py, expandRect(z.bounds, radius))) continue;
      const d = dist({ x: px, y: py }, rectCenter(z.bounds));
      if (d < nearestDist) { nearestDist = d; nearest = z; }
    }
    return nearest;
  }

  /** Returns the room that contains point (px, py), or null. */
  roomAt(px: number, py: number): Room | null {
    for (const r of this.rooms.values()) {
      if (pointInRect(px, py, r.gameBounds)) return r;
    }
    return null;
  }

  /** All zones of a given room. */
  zonesInRoom(roomId: string): Zone[] {
    return this.allZones.filter(z => z.room === roomId);
  }

  /** Find the door zone of a room by destination. */
  doorTo(fromRoom: string, toRoom: string): Zone | undefined {
    return this.allZones.find(z => z.room === fromRoom && z.type === 'door' && z.connectsTo === toRoom);
  }
}

// ─────────────────────────────────────────────
// CHARACTER — state machine
// ─────────────────────────────────────────────

const CHAR_SPEED_PPS = 400; // game-world pixels per second

export class Character {
  x: number;
  y: number;
  state: CharState = 'idle';
  facing: Direction = 'SE';
  lockedZone: Zone | null = null;
  animSet: AnimSet | null = null;
  animFrame = 0;
  private animTimer = 0;
  private _onStateChange?: (snap: CharacterSnapshot) => void;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  onStateChange(cb: (snap: CharacterSnapshot) => void): void {
    this._onStateChange = cb;
  }

  /** Call each frame. dx/dy are -1/0/1 normalised movement inputs. */
  update(dt: number, dx: number, dy: number, map: MapSystem): void {
    if (this.lockedZone) {
      // Advance anim timer while locked
      this.animTimer += dt;
      if (this.animTimer >= 150) { this.animTimer = 0; this.animFrame++; }
      return;
    }

    if (dx === 0 && dy === 0) {
      if (this.state === 'walking') this._setState('idle');
      return;
    }

    // Normalise diagonal movement; dt is in ms
    const speed = CHAR_SPEED_PPS * (dt / 1000);
    const len = Math.hypot(dx, dy);
    const nx = this.x + (dx / len) * speed;
    const ny = this.y + (dy / len) * speed;

    if (map.bisaJalan(nx, ny)) {
      this.x = nx;
      this.y = ny;
      this.facing = dxdyToDirection(dx, dy);
      this._setState('walking');
    }
  }

  /**
   * interact — triggered when the player presses the interact key (E / Space).
   * If already locked, exits the interaction. Otherwise locks to the nearest zone.
   */
  interact(map: MapSystem): Zone | null {
    if (this.lockedZone) {
      this._exitInteraction();
      return null;
    }

    const zone = map.cekInteraksi(this.x, this.y);
    if (!zone) return null;

    this.lockedZone = zone;
    this.animFrame = 0;
    this.animTimer = 0;
    this.animSet = zone.animSet ?? null;

    switch (zone.type) {
      case 'sit':
      case 'work': {
        const pos = zone.sitPosition ?? zone.standPosition;
        if (pos) { this.x = pos.x; this.y = pos.y; }
        this.facing = zone.facingDirection ?? 'NW';
        this._setState(zone.type === 'work' ? 'sitting' : 'sitting');
        break;
      }
      case 'pray': {
        const pos = zone.standPosition;
        if (pos) { this.x = pos.x; this.y = pos.y; }
        this.facing = zone.facingDirection ?? 'NW';
        this._setState('praying');
        break;
      }
      case 'swim': {
        const pos = zone.standPosition;
        if (pos) { this.x = pos.x; this.y = pos.y; }
        this._setState('swimming');
        break;
      }
      case 'shoot': {
        const pos = zone.standPosition;
        if (pos) { this.x = pos.x; this.y = pos.y; }
        this.facing = zone.facingDirection ?? 'NE';
        this._setState('shooting');
        break;
      }
      case 'wudu': {
        const pos = zone.standPosition;
        if (pos) { this.x = pos.x; this.y = pos.y; }
        this.facing = zone.facingDirection ?? 'NW';
        this._setState('wudu');
        break;
      }
      case 'eat': {
        const pos = zone.sitPosition ?? zone.standPosition;
        if (pos) { this.x = pos.x; this.y = pos.y; }
        this.facing = zone.facingDirection ?? 'NW';
        this._setState('eating');
        break;
      }
      case 'bar': {
        const pos = zone.standPosition;
        if (pos) { this.x = pos.x; this.y = pos.y; }
        this.facing = zone.facingDirection ?? 'NW';
        this._setState('serving');
        break;
      }
      case 'whiteboard':
      case 'reception': {
        const pos = zone.standPosition;
        if (pos) { this.x = pos.x; this.y = pos.y; }
        this.facing = zone.facingDirection ?? 'NE';
        this._setState('writing');
        break;
      }
    }

    return zone;
  }

  snapshot(): CharacterSnapshot {
    return {
      x: this.x, y: this.y,
      state: this.state, facing: this.facing,
      lockedZoneId: this.lockedZone?.id ?? null,
    };
  }

  private _exitInteraction(): void {
    this.lockedZone = null;
    this.animSet = null;
    this.animFrame = 0;
    this._setState('idle');
  }

  private _setState(s: CharState): void {
    if (this.state === s) return;
    this.state = s;
    this._onStateChange?.(this.snapshot());
  }
}

// ─────────────────────────────────────────────
// FACTORY — load map-data.json and return ready system
// ─────────────────────────────────────────────

export async function loadMapSystem(jsonPath = '/game/map-data.json'): Promise<MapSystem> {
  const res = await fetch(jsonPath);
  if (!res.ok) throw new Error(`MapSystem: failed to load ${jsonPath} (${res.status})`);
  const data: MapData = await res.json();
  return new MapSystem(data);
}
