# Task 8: Pathfinder Page

## Goal

Build the UI for selecting origin/destination nodes and viewing the computed path on the map.

## Deliverables

- [ ] `src/app/pathfinder/page.tsx` — Server Component fetching nodes/edges
- [ ] `src/app/pathfinder/PathfinderView.tsx` — `"use client"` component with:
  - Two Select dropdowns (origin node, destination node) using RetroUI
  - Calls `findShortestPath()` client-side on selection
  - Map showing all nodes/edges as background
  - Highlighted path as red polyline (weight 4)
  - Result panel showing: total distance (km), total time (min)
- [ ] Add nav link to `/pathfinder` in layout

## UX Flow

1. User selects origin from dropdown
2. User selects destination from dropdown
3. Path computes instantly (client-side, data already loaded)
4. Map highlights the path in red
5. Panel shows distance + time summary

## Verification

Select two connected nodes → red highlighted path appears on map, totals display correctly. Select disconnected nodes → "No path found" message.
