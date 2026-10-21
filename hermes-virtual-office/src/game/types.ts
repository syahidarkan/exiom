// ============================================================
// Exiom Virtual Office — Game Navigation & Interaction Types
// ============================================================

export type ZoneType =
  | 'wall'       // Impassable collision
  | 'floor'      // Walkable (explicit, optional)
  | 'door'       // Room transition waypoint
  | 'sit'        // Chair / sofa / sun lounger
  | 'pray'       // Sajadah — triggers pray animation
  | 'swim'       // Pool water — triggers swim animation
  | 'shoot'      // Green screen / studio — triggers filming
  | 'wudu'       // Wudu station — triggers wudu animation
  | 'eat'        // Dining table — triggers eat animation
  | 'bar'        // Bar counter — order/serve drink
  | 'whiteboard' // Whiteboard — triggers write animation
  | 'reception'  // Reception desk
  | 'work';      // Generic workstation (sit + type)

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type AnimSet =
  | 'sit_work'
  | 'sit_upright'
  | 'sit_recline'
  | 'sit_boss'
  | 'pray_standing'
  | 'swim_freestyle'
  | 'shoot_camera'
  | 'wudu_wash'
  | 'eat_table'
  | 'bar_serve'
  | 'bar_drink'
  | 'whiteboard_write'
  | 'reception_desk';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Zone {
  id: string;
  type: ZoneType;
  room: string;
  /** Naming convention string for matching Figma annotation layers */
  figmaLayer: string;
  /** Bounding box in game-world coordinates (px) */
  bounds: Rect;
  /** Where the character stands when interacting (for sit/pray/swim/etc) */
  standPosition?: Vec2;
  /** Where the character's anchor snaps when sitting */
  sitPosition?: Vec2;
  facingDirection?: Direction;
  label: string;
  animSet?: AnimSet;
  /** For door zones: the room ID this door leads to */
  connectsTo?: string;
  /** Extra metadata */
  meta?: Record<string, unknown>;
}

export interface Room {
  id: string;
  name: string;
  figmaNodeId: string;
  /** Room bounding box in game-world coordinates (px) */
  gameBounds: Rect;
  /** Path to the room's background image asset */
  bgAsset: string;
  /** Agent / character normally stationed here (maps to 9-agent IDs) */
  resident?: string;
}

export interface MapData {
  version: string;
  meta: {
    mapName: string;
    figmaFileKey: string;
    /** Add to figmaX/Y to get game coords: gameX = figmaX + canvasOffset.x */
    canvasOffset: Vec2;
    totalSize: { w: number; h: number };
  };
  rooms: Room[];
  zones: Zone[];
}

export type CharState =
  | 'idle'
  | 'walking'
  | 'sitting'
  | 'praying'
  | 'swimming'
  | 'shooting'
  | 'eating'
  | 'wudu'
  | 'serving'
  | 'writing';

export interface CharacterSnapshot {
  x: number;
  y: number;
  state: CharState;
  facing: Direction;
  lockedZoneId: string | null;
}
