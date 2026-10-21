/**
 * A* pathfinding on a 2-D grid rasterized from user-drawn wall segments.
 *
 * Grid cell = 60 world-pixels. Wall segments are "painted" onto the grid with
 * a 1-cell buffer so agents never hug a wall too closely. 8-directional movement
 * (diagonal only allowed when neither side-cell is blocked).
 *
 * After A* the raw waypoint list is simplified with a line-of-sight pass so
 * agents move in straight lines where possible instead of following grid steps.
 */

export const CELL = 60  // world-pixels per grid cell

// World bounds (must match VirtualOfficeGame constants)
const WORLD_W = 8349
const WORLD_H = 4498

export const GRID_W = Math.ceil(WORLD_W / CELL)   // 139
export const GRID_H = Math.ceil(WORLD_H / CELL)   // 75

interface Wall { x1: number; y1: number; x2: number; y2: number }
type Vec2 = { x: number; y: number }

// ── Grid construction ──────────────────────────────────────────────────────

/** Paint one wall segment into the grid (with 2-cell padding). */
function rasterizeWall(grid: Uint8Array, wall: Wall) {
  const { x1, y1, x2, y2 } = wall
  const len   = Math.hypot(x2 - x1, y2 - y1)
  const steps = Math.max(4, Math.ceil(len / (CELL * 0.20)))

  for (let i = 0; i <= steps; i++) {
    const t  = i / steps
    const wx = x1 + (x2 - x1) * t
    const wy = y1 + (y2 - y1) * t
    const cx = Math.floor(wx / CELL)
    const cy = Math.floor(wy / CELL)
    // Mark cell + 2-cell buffer (wider → agents can't squeeze alongside thin walls)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = cx + dx, ny = cy + dy
        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
          grid[ny * GRID_W + nx] = 1
        }
      }
    }
  }
}

/** Build a walkability grid from all user-drawn wall segments. */
export function buildGrid(walls: Wall[]): Uint8Array {
  const grid = new Uint8Array(GRID_W * GRID_H) // 0 = free, 1 = blocked
  for (const w of walls) rasterizeWall(grid, w)
  return grid
}

// ── Binary min-heap ───────────────────────────────────────────────────────

class MinHeap {
  private data: { f: number; idx: number }[] = []

  push(f: number, idx: number) {
    this.data.push({ f, idx })
    this.up(this.data.length - 1)
  }

  pop(): number {
    const top = this.data[0].idx
    const last = this.data.pop()!
    if (this.data.length > 0) { this.data[0] = last; this.down(0) }
    return top
  }

  get size() { return this.data.length }

  private up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.data[p].f <= this.data[i].f) break
      ;[this.data[p], this.data[i]] = [this.data[i], this.data[p]]
      i = p
    }
  }

  private down(i: number) {
    const n = this.data.length
    for (;;) {
      let m = i
      const l = 2 * i + 1, r = l + 1
      if (l < n && this.data[l].f < this.data[m].f) m = l
      if (r < n && this.data[r].f < this.data[m].f) m = r
      if (m === i) break
      ;[this.data[m], this.data[i]] = [this.data[i], this.data[m]]
      i = m
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** World position → nearest non-blocked grid cell index */
function nearestFree(grid: Uint8Array, wx: number, wy: number): number {
  const cx0 = Math.max(0, Math.min(GRID_W - 1, Math.floor(wx / CELL)))
  const cy0 = Math.max(0, Math.min(GRID_H - 1, Math.floor(wy / CELL)))
  if (!grid[cy0 * GRID_W + cx0]) return cy0 * GRID_W + cx0

  // BFS outward until free
  const visited = new Uint8Array(GRID_W * GRID_H)
  const q: number[] = [cy0 * GRID_W + cx0]
  visited[q[0]] = 1
  const dirs4 = [-1, 1, -GRID_W, GRID_W]

  while (q.length) {
    const cur = q.shift()!
    if (!grid[cur]) return cur
    for (const d of dirs4) {
      const nb = cur + d
      if (nb < 0 || nb >= GRID_W * GRID_H || visited[nb]) continue
      const cx = nb % GRID_W, cx2 = cur % GRID_W
      if (Math.abs(cx - cx2) > 1) continue // wrapped row
      visited[nb] = 1
      q.push(nb)
    }
  }
  return cy0 * GRID_W + cx0 // fallback
}

// Exact segment-segment intersection (same math as VirtualOfficeGame.tsx)
function segsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1x = bx - ax, d1y = by - ay
  const d2x = dx - cx, d2y = dy - cy
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-8) return false
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / denom
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / denom
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999
}

/**
 * Check line-of-sight using BOTH the grid (for coarse blocking) AND exact
 * wall segments (to catch thin walls the grid may have missed).
 */
function hasLOS(
  grid: Uint8Array, walls: Wall[],
  ax: number, ay: number, bx: number, by: number,
): boolean {
  // Grid check — fine
  const len = Math.hypot(bx - ax, by - ay)
  const steps = Math.max(4, Math.ceil(len / (CELL * 0.20)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const cx = Math.floor((ax + (bx - ax) * t) / CELL)
    const cy = Math.floor((ay + (by - ay) * t) / CELL)
    if (cx < 0 || cx >= GRID_W || cy < 0 || cy >= GRID_H) return false
    if (grid[cy * GRID_W + cx]) return false
  }
  // Exact wall segment check — fine-grained
  for (const w of walls) {
    if (segsIntersect(ax, ay, bx, by, w.x1, w.y1, w.x2, w.y2)) return false
  }
  return true
}

/** String-pulling: remove unnecessary waypoints when LOS is clear. */
function smoothPath(grid: Uint8Array, walls: Wall[], pts: Vec2[]): Vec2[] {
  if (pts.length <= 2) return pts
  const out: Vec2[] = [pts[0]]
  let i = 0
  while (i < pts.length - 1) {
    let j = pts.length - 1
    while (j > i + 1 && !hasLOS(grid, walls, pts[i].x, pts[i].y, pts[j].x, pts[j].y)) j--
    out.push(pts[j])
    i = j
  }
  return out
}

// ── A* ────────────────────────────────────────────────────────────────────

const DIRS = [
  // dx, dy, cost×CELL
  [-1,  0, 1],   [1,  0, 1],   [0, -1, 1],   [0,  1, 1],
  [-1, -1, 1.41],[-1,  1, 1.41],[1, -1, 1.41],[1,  1, 1.41],
] as const

/**
 * Find the shortest path (in world coordinates) from (sx,sy) to (ex,ey)
 * that does not cross any blocked grid cell.
 *
 * Returns an array of waypoints (world coords). If no path exists, returns
 * [{ x: ex, y: ey }] so agents still try to move toward the destination.
 */
export function findPath(
  grid: Uint8Array,
  sx: number, sy: number,
  ex: number, ey: number,
  walls: Wall[] = [],
): Vec2[] {
  const si = nearestFree(grid, sx, sy)
  const ei = nearestFree(grid, ex, ey)

  if (si === ei) return [{ x: ex, y: ey }]

  const INF = 1e9
  const g   = new Float32Array(GRID_W * GRID_H).fill(INF)
  const par = new Int32Array(GRID_W * GRID_H).fill(-1)
  const vis = new Uint8Array(GRID_W * GRID_H)

  const ecx = ei % GRID_W, ecy = Math.floor(ei / GRID_W)
  const h = (idx: number) => {
    const cx = idx % GRID_W, cy = Math.floor(idx / GRID_W)
    return Math.hypot(cx - ecx, cy - ecy) * CELL
  }

  g[si] = 0
  const heap = new MinHeap()
  heap.push(h(si), si)

  while (heap.size > 0) {
    const cur = heap.pop()
    if (vis[cur]) continue
    vis[cur] = 1
    if (cur === ei) break

    const cx = cur % GRID_W, cy = Math.floor(cur / GRID_W)

    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue
      const ni = ny * GRID_W + nx
      if (grid[ni] || vis[ni]) continue
      // Diagonal: both side-cells must be free
      if (dx !== 0 && dy !== 0) {
        if (grid[cy * GRID_W + nx] || grid[ny * GRID_W + cx]) continue
      }
      const ng = g[cur] + cost * CELL
      if (ng < g[ni]) {
        g[ni] = ng; par[ni] = cur
        heap.push(ng + h(ni), ni)
      }
    }
  }

  if (g[ei] === INF) return [{ x: ex, y: ey }] // no path

  // Reconstruct
  const raw: Vec2[] = []
  let cur = ei
  while (cur !== si && cur !== -1) {
    const cx = cur % GRID_W, cy = Math.floor(cur / GRID_W)
    raw.unshift({ x: (cx + 0.5) * CELL, y: (cy + 0.5) * CELL })
    cur = par[cur]
  }
  raw.push({ x: ex, y: ey })

  return smoothPath(grid, walls, raw)
}
