import type { Node } from "@/types/node";
import type { Edge } from "@/types/edge";

export interface PathResult {
  path: Node[];
  totalDistance: number;
  totalTime: number;
}

type WeightKey = "distance" | "time";

export function findShortestPath(
  nodes: Node[],
  edges: Edge[],
  originId: number,
  destinationId: number,
  by: WeightKey = "distance"
): PathResult | null {
  if (originId === destinationId) {
    const node = nodes.find((n) => n.id === originId);
    if (!node) return null;
    return { path: [node], totalDistance: 0, totalTime: 0 };
  }

  const nodeMap = new Map<number, Node>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  if (!nodeMap.has(originId) || !nodeMap.has(destinationId)) return null;

  // Build adjacency list (directional: origin → destination)
  const adjacency = new Map<number, { to: number; distance: number; time: number }[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.origin)) {
      adjacency.set(edge.origin, []);
    }
    adjacency.get(edge.origin)!.push({
      to: edge.destination,
      distance: edge.distance,
      time: edge.time,
    });
  }

  // Dijkstra's algorithm
  const dist = new Map<number, number>();
  const prev = new Map<number, number | null>();
  const distanceAcc = new Map<number, number>();
  const timeAcc = new Map<number, number>();
  const visited = new Set<number>();

  for (const node of nodes) {
    dist.set(node.id, Infinity);
    prev.set(node.id, null);
    distanceAcc.set(node.id, 0);
    timeAcc.set(node.id, 0);
  }
  dist.set(originId, 0);

  while (true) {
    // Find unvisited node with smallest distance
    let current: number | null = null;
    let minDist = Infinity;
    for (const [nodeId, d] of dist) {
      if (!visited.has(nodeId) && d < minDist) {
        minDist = d;
        current = nodeId;
      }
    }

    if (current === null) break;
    if (current === destinationId) break;

    visited.add(current);

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) continue;

      const weight = neighbor[by];
      const newDist = dist.get(current)! + weight;

      if (newDist < dist.get(neighbor.to)!) {
        dist.set(neighbor.to, newDist);
        prev.set(neighbor.to, current);
        distanceAcc.set(neighbor.to, distanceAcc.get(current)! + neighbor.distance);
        timeAcc.set(neighbor.to, timeAcc.get(current)! + neighbor.time);
      }
    }
  }

  if (dist.get(destinationId) === Infinity) return null;

  // Reconstruct path
  const path: Node[] = [];
  let current: number | null = destinationId;
  while (current !== null) {
    path.unshift(nodeMap.get(current)!);
    current = prev.get(current) ?? null;
  }

  return {
    path,
    totalDistance: distanceAcc.get(destinationId)!,
    totalTime: timeAcc.get(destinationId)!,
  };
}

export function findFastestPath(
  nodes: Node[],
  edges: Edge[],
  originId: number,
  destinationId: number
): PathResult | null {
  return findShortestPath(nodes, edges, originId, destinationId, "time");
}
