import { Point3D } from '../types';

interface GridNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: GridNode | null;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PathFinder {
  private width: number;
  private height: number;
  private gridSize: number;
  private obstacles: Obstacle[];

  constructor(
    width: number,
    height: number,
    obstacles: Obstacle[] = [],
    gridSize: number = 50
  ) {
    this.width = width;
    this.height = height;
    this.gridSize = gridSize;
    this.obstacles = obstacles;
  }

  private snapToGrid(point: Point3D): { x: number; y: number } {
    return {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize,
    };
  }

  private isColliding(x: number, y: number): boolean {
    return this.obstacles.some(
      (obs) =>
        x >= obs.x &&
        x <= obs.x + obs.width &&
        y >= obs.y &&
        y <= obs.y + obs.height
    );
  }

  private heuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
    // Euclidean distance
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }

  private getNeighbors(node: GridNode): GridNode[] {
    const neighbors: GridNode[] = [];
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 },  // East
      { x: 0, y: 1 },  // South
      { x: -1, y: 0 }, // West
      { x: 1, y: -1 }, // NE (diagonal)
      { x: 1, y: 1 },  // SE
      { x: -1, y: 1 }, // SW
      { x: -1, y: -1 },// NW
    ];

    for (const dir of directions) {
      const newX = node.x + dir.x * this.gridSize;
      const newY = node.y + dir.y * this.gridSize;

      if (
        newX >= 0 &&
        newX <= this.width &&
        newY >= 0 &&
        newY <= this.height &&
        !this.isColliding(newX, newY)
      ) {
        // Penalty for diagonal moves to prefer orthogonal routes
        const isDiagonal = dir.x !== 0 && dir.y !== 0;
        const penalty = isDiagonal ? 1.4 : 1.0;

        neighbors.push({
          x: newX,
          y: newY,
          g: 0,
          h: 0,
          f: 0,
          parent: node,
        });
      }
    }

    return neighbors;
  }

  private reconstructPath(endNode: GridNode): Point3D[] {
    const path: Point3D[] = [];
    let current: GridNode | null = endNode;

    while (current) {
      path.unshift({ x: current.x, y: current.y, z: 0 });
      current = current.parent;
    }

    return this.simplifyPath(path);
  }

  private simplifyPath(path: Point3D[]): Point3D[] {
    if (path.length <= 2) return path;

    const simplified: Point3D[] = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const next = path[i + 1];

      // Check if points are collinear
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;

      // If not collinear, keep the point
      if (dx1 * dy2 !== dy1 * dx2) {
        simplified.push(curr);
      }
    }

    simplified.push(path[path.length - 1]);
    return simplified;
  }

  findPath(start: Point3D, end: Point3D): Point3D[] {
    const snappedStart = this.snapToGrid(start);
    const snappedEnd = this.snapToGrid(end);

    const openSet: GridNode[] = [];
    const closedSet = new Set<string>();

    const startNode: GridNode = {
      x: snappedStart.x,
      y: snappedStart.y,
      g: 0,
      h: this.heuristic(snappedStart, snappedEnd),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if we reached the goal
      if (current.x === snappedEnd.x && current.y === snappedEnd.y) {
        return this.reconstructPath(current);
      }

      closedSet.add(`${current.x},${current.y}`);

      for (const neighbor of this.getNeighbors(current)) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(key)) continue;

        const tentativeG = current.g + this.heuristic(current, neighbor);

        const existingNode = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);

        if (!existingNode || tentativeG < existingNode.g) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, snappedEnd);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;

          if (!existingNode) {
            openSet.push(neighbor);
          }
        }
      }
    }

    // No path found, return direct line
    return [start, end];
  }
}
