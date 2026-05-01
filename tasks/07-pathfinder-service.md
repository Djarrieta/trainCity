# Task 7: PathFinder Service

## Goal

Implement Dijkstra's algorithm as a standalone utility for finding shortest/fastest paths.

## Deliverables

- [ ] `src/lib/pathfinder.ts` with:
  - `findShortestPath(nodes, edges, originId, destinationId, by?)` → `PathResult | null`
  - `findFastestPath(nodes, edges, originId, destinationId)` → `PathResult | null`
  - `PathResult` interface: `{ path: Node[]; totalDistance: number; totalTime: number }`

## Algorithm

- Dijkstra's with configurable weight (`distance` or `time`)
- Build adjacency list from edges (directional — only `origin → destination`)
- Track previous node for path reconstruction
- Returns `null` if no path exists

## Edge Cases

- Origin equals destination → return empty path with 0 totals (or null)
- No path exists between disconnected nodes → return `null`
- Multiple edges between same nodes → algorithm picks optimal one naturally

## Verification

Given test data, returns correct shortest path and totals. Can be tested with simple arrays without DB dependency.
