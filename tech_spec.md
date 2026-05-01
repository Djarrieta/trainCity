# Tech Spec — trainCity

> Technical specification for a train network planning application. Users visualize nodes (stations) and edges (track segments) on a map, find shortest/fastest paths, and schedule trips with edge-level conflict detection.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Environment Variables](#3-environment-variables)
4. [Supabase Setup](#4-supabase-setup)
5. [Database Schema](#5-database-schema)
6. [TypeScript Types](#6-typescript-types)
7. [Map Setup (shadcn-map)](#7-map-setup-shadcn-map)
8. [Main Map View](#8-main-map-view)
9. [PathFinder Service](#9-pathfinder-service)
10. [Pathfinder Page](#10-pathfinder-page)
11. [Schedules Module](#11-schedules-module)
12. [Schedule Conflict Detection](#12-schedule-conflict-detection)
13. [Styling & Theming](#13-styling--theming)
14. [Scripts & Data Seeding](#14-scripts--data-seeding)

---

## 1. Tech Stack

| Layer           | Technology                                              | Version      |
| --------------- | ------------------------------------------------------- | ------------ |
| Framework       | **Next.js** (App Router)                                | 16.x         |
| Language        | **TypeScript**                                          | 5.x          |
| React           | **React**                                               | 19.x         |
| Styling         | **Tailwind CSS** v4 (via `@tailwindcss/postcss`)        | 4.x          |
| UI Components   | **RetroUI** (retroui.dev — brutalist shadcn components) | 2.x          |
| Map             | **@shadcn-map/map** (Leaflet-based)                     | latest       |
| Backend / DB    | **Supabase** (Postgres + RLS)                           | —            |
| Supabase Client | `@supabase/supabase-js` + `@supabase/ssr`               | 2.x / 0.10.x |
| Runtime         | **Bun**                                                 | latest       |
| Package Manager | **Bun**                                                 | latest       |
| Linter          | **ESLint** (eslint-config-next)                         | 9.x          |

### Key Design Decisions

- **No authentication** — shared public dataset, no user ownership.
- **No ORM** — Supabase JS client used directly (PostgREST under the hood).
- **Server Components by default** — pages and layouts are async Server Components.
- **No UI-based CRUD** — nodes and edges are managed via Supabase directly (seed scripts / Studio). The app is read-only + pathfinding + scheduling.
- **RetroUI** — brutalist/retro-styled shadcn-compatible components from retroui.dev for all UI elements (buttons, cards, dialogs, etc.).
- **shadcn-map** — Leaflet-based map component for geographic visualization.
- **Directional edges** — an edge from A→B does not imply B→A.
- **Edge-level conflict detection** — two scheduled trains cannot occupy the same edge at the same time.

---

## 2. Project Structure

```
├── public/                     # Static assets
├── scripts/
│   └── seed.ts                 # Bun script to seed nodes/edges via Supabase client
├── src/
│   ├── middleware.ts           # Supabase session refresh (minimal, no auth)
│   ├── app/
│   │   ├── globals.css         # Tailwind + theme tokens
│   │   ├── layout.tsx          # Root layout (nav, fonts, theme toggle)
│   │   ├── page.tsx            # Main map view (nodes + edges)
│   │   ├── pathfinder/
│   │   │   └── page.tsx        # Pathfinder page (select origin/dest, see result on map)
│   │   ├── schedules/
│   │   │   ├── page.tsx        # Schedule list page
│   │   │   └── new/page.tsx    # Create new schedule (with conflict detection)
│   │   └── components/         # Shared UI components
│   ├── lib/
│   │   ├── constants.ts        # App constants
│   │   ├── pathfinder.ts       # Dijkstra's algorithm (shortest/fastest path)
│   │   ├── schedule-conflict.ts # Edge-level conflict detection
│   │   └── supabase/
│   │       ├── client.ts       # Browser Supabase client
│   │       └── server.ts       # Server Supabase client (cookies)
│   └── types/
│       ├── index.ts            # Re-exports
│       ├── node.ts             # Node type
│       ├── edge.ts             # Edge type
│       └── schedule.ts         # Schedule type
├── supabase/
│   ├── config.toml             # Local Supabase config
│   └── migrations/
│       ├── 01_nodes.sql
│       ├── 02_edges.sql
│       └── 03_schedules.sql
└── package.json
```

---

## 3. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:5002
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5003/postgres
```

---

## 4. Supabase Setup

### Local Development

```bash
DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock npx supabase start
```

### Supabase Client Setup

**Browser client** (`src/lib/supabase/client.ts`):

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**Server client** (`src/lib/supabase/server.ts`):

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Server Component — safe to ignore */
          }
        },
      },
    },
  );
}
```

---

## 5. Database Schema

### Migration: `01_nodes.sql`

```sql
DROP TABLE IF EXISTS public.nodes CASCADE;

CREATE TABLE public.nodes (
    id        serial PRIMARY KEY,
    name      text NOT NULL,
    latitude  double precision NOT NULL,
    longitude double precision NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Public access (no auth)
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nodes: public read" ON public.nodes
  FOR SELECT USING (true);

CREATE POLICY "nodes: public insert" ON public.nodes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "nodes: public update" ON public.nodes
  FOR UPDATE USING (true);

CREATE POLICY "nodes: public delete" ON public.nodes
  FOR DELETE USING (true);
```

### Migration: `02_edges.sql`

```sql
DROP TABLE IF EXISTS public.edges CASCADE;

CREATE TABLE public.edges (
    id          serial PRIMARY KEY,
    origin      integer NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
    destination integer NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
    time        double precision NOT NULL,  -- minutes
    distance    double precision NOT NULL,  -- kilometers
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (origin != destination)
);

CREATE INDEX edges_origin_idx ON public.edges(origin);
CREATE INDEX edges_destination_idx ON public.edges(destination);

ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edges: public read" ON public.edges
  FOR SELECT USING (true);

CREATE POLICY "edges: public insert" ON public.edges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "edges: public update" ON public.edges
  FOR UPDATE USING (true);

CREATE POLICY "edges: public delete" ON public.edges
  FOR DELETE USING (true);
```

### Migration: `03_schedules.sql`

```sql
DROP TABLE IF EXISTS public.schedule_edges CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;

CREATE TABLE public.schedules (
    id             serial PRIMARY KEY,
    name           text NOT NULL,
    origin         integer NOT NULL REFERENCES public.nodes(id),
    destination    integer NOT NULL REFERENCES public.nodes(id),
    departure_time timestamptz NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Each schedule has an ordered list of edges with the time each edge is occupied
CREATE TABLE public.schedule_edges (
    id            serial PRIMARY KEY,
    schedule_id   integer NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    edge_id       integer NOT NULL REFERENCES public.edges(id),
    position      integer NOT NULL,
    start_time    timestamptz NOT NULL,  -- when the train enters this edge
    end_time      timestamptz NOT NULL,  -- when the train exits this edge
    UNIQUE (schedule_id, position)
);

CREATE INDEX schedule_edges_edge_time_idx
  ON public.schedule_edges(edge_id, start_time, end_time);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules: public read" ON public.schedules
  FOR SELECT USING (true);
CREATE POLICY "schedules: public insert" ON public.schedules
  FOR INSERT WITH CHECK (true);
CREATE POLICY "schedules: public update" ON public.schedules
  FOR UPDATE USING (true);
CREATE POLICY "schedules: public delete" ON public.schedules
  FOR DELETE USING (true);

CREATE POLICY "schedule_edges: public read" ON public.schedule_edges
  FOR SELECT USING (true);
CREATE POLICY "schedule_edges: public insert" ON public.schedule_edges
  FOR INSERT WITH CHECK (true);
CREATE POLICY "schedule_edges: public delete" ON public.schedule_edges
  FOR DELETE USING (true);
```

---

## 6. TypeScript Types

### `src/types/node.ts`

```ts
export interface Node {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}
```

### `src/types/edge.ts`

```ts
export interface Edge {
  id: number;
  origin: number; // FK → nodes.id
  destination: number; // FK → nodes.id
  time: number; // minutes
  distance: number; // kilometers
  created_at: string;
}

// Edge with resolved node data (for map rendering)
export interface EdgeWithNodes extends Edge {
  origin_node: Node;
  destination_node: Node;
}
```

### `src/types/schedule.ts`

```ts
export interface Schedule {
  id: number;
  name: string;
  origin: number; // FK → nodes.id
  destination: number; // FK → nodes.id
  departure_time: string;
  created_at: string;
}

export interface ScheduleEdge {
  id: number;
  schedule_id: number;
  edge_id: number;
  position: number;
  start_time: string;
  end_time: string;
}

export interface ScheduleWithEdges extends Schedule {
  schedule_edges: ScheduleEdge[];
}
```

---

## 7. Map Setup (shadcn-map)

### Installation

```bash
bunx --bun shadcn@latest add @shadcn-map/map
```

### Base Map Component Usage

```tsx
import { Map, MapTileLayer } from "@/components/ui/map";
import type { LatLngExpression } from "leaflet";

export function BaseMap({ children }: { children?: React.ReactNode }) {
  const CENTER = [43.6532, -79.3832] satisfies LatLngExpression;

  return (
    <Map center={CENTER} zoom={2}>
      <MapTileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC"
      />
      {children}
    </Map>
  );
}
```

### Map Markers (Nodes)

Render each node as a Leaflet marker on the map:

```tsx
import { Marker, Popup } from "react-leaflet";

function NodeMarkers({ nodes }: { nodes: Node[] }) {
  return (
    <>
      {nodes.map((node) => (
        <Marker key={node.id} position={[node.latitude, node.longitude]}>
          <Popup>{node.name}</Popup>
        </Marker>
      ))}
    </>
  );
}
```

### Map Lines (Edges)

Render each edge as a polyline between its origin and destination nodes:

```tsx
import { Polyline } from "react-leaflet";

function EdgeLines({ edges, nodes }: { edges: Edge[]; nodes: Node[] }) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <>
      {edges.map((edge) => {
        const from = nodeMap.get(edge.origin);
        const to = nodeMap.get(edge.destination);
        if (!from || !to) return null;
        return (
          <Polyline
            key={edge.id}
            positions={[
              [from.latitude, from.longitude],
              [to.latitude, to.longitude],
            ]}
            color="gray"
            weight={2}
          />
        );
      })}
    </>
  );
}
```

### Highlighted Path (Pathfinder Result)

```tsx
function HighlightedPath({ pathNodes }: { pathNodes: Node[] }) {
  const positions = pathNodes.map(
    (n) => [n.latitude, n.longitude] as [number, number],
  );
  return <Polyline positions={positions} color="red" weight={4} />;
}
```

---

## 8. Main Map View

The home page (`src/app/page.tsx`) displays all nodes and edges on the map:

```tsx
import { createClient } from "@/lib/supabase/server";
import type { Node, Edge } from "@/types";
import MapView from "./components/MapView";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("nodes").select("*").returns<Node[]>(),
    supabase.from("edges").select("*").returns<Edge[]>(),
  ]);

  return (
    <div className="h-screen">
      <MapView nodes={nodes ?? []} edges={edges ?? []} />
    </div>
  );
}
```

`MapView` is a `"use client"` component that renders the map with node markers and edge lines.

---

## 9. PathFinder Service

`src/lib/pathfinder.ts` — Dijkstra's algorithm to find shortest or fastest path between two nodes.

```ts
import type { Node, Edge } from "@/types";

export interface PathResult {
  path: Node[];
  totalDistance: number; // km
  totalTime: number; // minutes
}

export function findShortestPath(
  nodes: Node[],
  edges: Edge[],
  originId: number,
  destinationId: number,
  by: "distance" | "time" = "distance",
): PathResult | null {
  const nodeIds = nodes.map((n) => n.id);
  const dist = new Map<number, number>();
  const prev = new Map<number, number | null>();
  const visited = new Set<number>();

  // Build adjacency list
  const adjacency = new Map<number, Edge[]>();
  for (const id of nodeIds) {
    adjacency.set(id, []);
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  for (const edge of edges) {
    adjacency.get(edge.origin)?.push(edge);
  }

  dist.set(originId, 0);

  while (true) {
    let current: number | null = null;
    let minDist = Infinity;

    for (const id of nodeIds) {
      if (!visited.has(id) && dist.get(id)! < minDist) {
        minDist = dist.get(id)!;
        current = id;
      }
    }

    if (current === null || current === destinationId) break;
    visited.add(current);

    const neighbors = adjacency.get(current) ?? [];
    for (const edge of neighbors) {
      if (visited.has(edge.destination)) continue;
      const weight = by === "distance" ? edge.distance : edge.time;
      const alt = dist.get(current)! + weight;
      if (alt < dist.get(edge.destination)!) {
        dist.set(edge.destination, alt);
        prev.set(edge.destination, current);
      }
    }
  }

  if (dist.get(destinationId) === Infinity) return null;

  // Reconstruct path
  const pathIds: number[] = [];
  let step: number | null = destinationId;
  while (step !== null) {
    pathIds.unshift(step);
    step = prev.get(step) ?? null;
  }

  // Calculate totals
  let totalDistance = 0;
  let totalTime = 0;
  for (let i = 0; i < pathIds.length - 1; i++) {
    const edge = edges.find(
      (e) => e.origin === pathIds[i] && e.destination === pathIds[i + 1],
    );
    if (edge) {
      totalDistance += edge.distance;
      totalTime += edge.time;
    }
  }

  const path = pathIds.map((id) => nodes.find((n) => n.id === id)!);
  return { path, totalDistance, totalTime };
}

export function findFastestPath(
  nodes: Node[],
  edges: Edge[],
  originId: number,
  destinationId: number,
): PathResult | null {
  return findShortestPath(nodes, edges, originId, destinationId, "time");
}
```

---

## 10. Pathfinder Page

`src/app/pathfinder/page.tsx` — Server Component that fetches nodes/edges, passes to a client component with two dropdowns (origin, destination) and a map showing the result.

```tsx
import { createClient } from "@/lib/supabase/server";
import type { Node, Edge } from "@/types";
import PathfinderView from "./PathfinderView";

export default async function PathfinderPage() {
  const supabase = await createClient();

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("nodes").select("*").returns<Node[]>(),
    supabase.from("edges").select("*").returns<Edge[]>(),
  ]);

  return <PathfinderView nodes={nodes ?? []} edges={edges ?? []} />;
}
```

`PathfinderView` (`"use client"`):

- Two select dropdowns for origin and destination nodes
- Runs `findShortestPath()` client-side with the prefetched data
- Displays result: highlighted path on map + total distance (km) + total time (min)
- Map shows all nodes/edges as background, path highlighted in a different color

---

## 11. Schedules Module

A schedule represents a planned train trip along a specific path at a specific time.

### Data Model

- **`schedules`** — the trip metadata (name, origin, destination, departure time)
- **`schedule_edges`** — ordered list of edges the train will traverse, with `start_time` and `end_time` per edge segment

### Creating a Schedule

When a user creates a schedule:

1. Select origin and destination nodes
2. System finds a valid path (using PathFinder)
3. User picks a departure time (specific datetime)
4. System computes `start_time` / `end_time` for each edge based on the edge's `time` field (cumulative from departure)
5. System checks for conflicts (see section 12)
6. If no conflicts, inserts the schedule + schedule_edges

### Schedule Edge Time Computation

```ts
function computeScheduleEdges(
  path: Node[],
  edges: Edge[],
  departureTime: Date,
): { edge_id: number; position: number; start_time: Date; end_time: Date }[] {
  const result = [];
  let currentTime = departureTime;

  for (let i = 0; i < path.length - 1; i++) {
    const edge = edges.find(
      (e) => e.origin === path[i].id && e.destination === path[i + 1].id,
    )!;
    const endTime = new Date(currentTime.getTime() + edge.time * 60_000); // time is in minutes

    result.push({
      edge_id: edge.id,
      position: i,
      start_time: currentTime,
      end_time: endTime,
    });

    currentTime = endTime;
  }

  return result;
}
```

---

## 12. Schedule Conflict Detection

`src/lib/schedule-conflict.ts` — checks whether a proposed schedule's edge-time windows overlap with existing scheduled trains on any of the same edges.

### Conflict Rule

Two trains **conflict** if they occupy the **same edge** during **overlapping time windows**:

```
existing.start_time < proposed.end_time AND existing.end_time > proposed.start_time
```

### Implementation

```ts
import type { ScheduleEdge } from "@/types";

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: {
    edge_id: number;
    existing_schedule_id: number;
    overlap_start: string;
    overlap_end: string;
  }[];
}

export async function checkConflicts(
  supabase: SupabaseClient,
  proposedEdges: { edge_id: number; start_time: Date; end_time: Date }[],
): Promise<ConflictResult> {
  const conflicts = [];

  for (const proposed of proposedEdges) {
    const { data: overlapping } = await supabase
      .from("schedule_edges")
      .select("*, schedule:schedules(id, name)")
      .eq("edge_id", proposed.edge_id)
      .lt("start_time", proposed.end_time.toISOString())
      .gt("end_time", proposed.start_time.toISOString());

    if (overlapping && overlapping.length > 0) {
      for (const existing of overlapping) {
        conflicts.push({
          edge_id: proposed.edge_id,
          existing_schedule_id: existing.schedule_id,
          overlap_start: proposed.start_time.toISOString(),
          overlap_end: proposed.end_time.toISOString(),
        });
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
```

### Supabase Query for Conflicts (single query alternative)

```sql
SELECT se.*
FROM schedule_edges se
WHERE se.edge_id = ANY($1)                      -- array of proposed edge IDs
  AND se.start_time < $3                        -- proposed end time
  AND se.end_time > $2;                         -- proposed start time
```

---

## 13. Styling & Theming

### RetroUI Components

Install from [retroui.dev](https://www.retroui.dev/docs/components). Components available:

- Button, Card, Badge, Dialog, Select, Input, Table, Accordion, Alert, Avatar, Breadcrumb, Calendar, Command, Tabs, Tooltip, etc.

Components are shadcn-compatible and installed via the shadcn CLI pattern.

### Tailwind CSS v4

Uses `@tailwindcss/postcss` plugin. Theme tokens defined in `globals.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: system-ui, sans-serif;
}
```

### Theme Mode

System preference with light/dark toggle. Use `next-themes` or a custom implementation:

```tsx
// ThemeProvider wraps the app in layout.tsx
// Toggle button in the nav allows manual override
```

### Map Styling

The map container takes full height of the viewport on the home page. On the pathfinder page it shares space with the controls panel.

---

## 14. Scripts & Data Seeding

### Seed Script (`scripts/seed.ts`)

Run with: `bun scripts/seed.ts`

Seeds nodes and edges via the Supabase client:

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const nodes = [
  { name: "Station A", latitude: 43.65, longitude: -79.38 },
  { name: "Station B", latitude: 43.7, longitude: -79.4 },
  // ...
];

const { data: insertedNodes } = await supabase
  .from("nodes")
  .insert(nodes)
  .select("id, name");

const edges = [
  { origin: 1, destination: 2, time: 15, distance: 12.5 },
  // ...
];

await supabase.from("edges").insert(edges);

console.log("Seed complete");
```

### DB Reset

```bash
# Reset local Supabase DB and re-run migrations
DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock npx supabase db reset

# Then seed
bun scripts/seed.ts
```

---

## Quick Reference

| What               | Where                          |
| ------------------ | ------------------------------ |
| Map component      | `src/components/ui/map`        |
| Node/Edge types    | `src/types/`                   |
| PathFinder logic   | `src/lib/pathfinder.ts`        |
| Conflict detection | `src/lib/schedule-conflict.ts` |
| Supabase clients   | `src/lib/supabase/`            |
| DB migrations      | `supabase/migrations/`         |
| Seed script        | `scripts/seed.ts`              |
| Main map page      | `src/app/page.tsx`             |
| Pathfinder page    | `src/app/pathfinder/page.tsx`  |
| Schedules          | `src/app/schedules/page.tsx`   |
