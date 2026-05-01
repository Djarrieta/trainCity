import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Nodes (stations) ---
const nodeData: { name: string; latitude: number; longitude: number }[] = [
  { name: "Estación Central", latitude: 9.9521, longitude: -75.0815 },
  { name: "Plaza Mayor", latitude: 9.9498, longitude: -75.0802 },
  { name: "Parque Norte", latitude: 9.9575, longitude: -75.0798 },
  { name: "Terminal Sur", latitude: 9.9452, longitude: -75.083 },
  { name: "Mercado", latitude: 9.951, longitude: -75.079 },
  { name: "Hospital", latitude: 9.956, longitude: -75.0825 },
  { name: "Universidad", latitude: 9.9485, longitude: -75.084 },
  { name: "Centro Comercial", latitude: 9.9545, longitude: -75.0795 },
  { name: "Estadio", latitude: 9.947, longitude: -75.081 },
  { name: "Biblioteca", latitude: 9.953, longitude: -75.0835 },
  { name: "Puerto", latitude: 9.958, longitude: -75.081 },
  { name: "Aeropuerto", latitude: 9.946, longitude: -75.079 },
];

// --- Edges (directional track segments) ---
// [originIndex, destinationIndex, timeMinutes, distanceKm]
const edgeData: [number, number, number, number][] = [
  // Estación Central connections
  [0, 1, 5, 1.2],   // Central → Plaza Mayor
  [1, 0, 5, 1.2],   // Plaza Mayor → Central
  [0, 4, 4, 0.9],   // Central → Mercado
  [4, 0, 4, 0.9],   // Mercado → Central
  [0, 9, 3, 0.7],   // Central → Biblioteca
  [9, 0, 3, 0.7],   // Biblioteca → Central

  // Plaza Mayor connections
  [1, 3, 8, 2.1],   // Plaza Mayor → Terminal Sur
  [3, 1, 8, 2.1],   // Terminal Sur → Plaza Mayor
  [1, 4, 3, 0.6],   // Plaza Mayor → Mercado
  [4, 1, 3, 0.6],   // Mercado → Plaza Mayor

  // Parque Norte connections
  [2, 5, 4, 1.0],   // Parque Norte → Hospital
  [5, 2, 4, 1.0],   // Hospital → Parque Norte
  [2, 7, 3, 0.8],   // Parque Norte → Centro Comercial
  [7, 2, 3, 0.8],   // Centro Comercial → Parque Norte
  [2, 10, 5, 1.3],  // Parque Norte → Puerto
  [10, 2, 5, 1.3],  // Puerto → Parque Norte

  // Terminal Sur connections
  [3, 8, 4, 1.0],   // Terminal Sur → Estadio
  [8, 3, 4, 1.0],   // Estadio → Terminal Sur
  [3, 6, 6, 1.5],   // Terminal Sur → Universidad
  [6, 3, 6, 1.5],   // Universidad → Terminal Sur

  // Mercado connections
  [4, 7, 5, 1.2],   // Mercado → Centro Comercial
  [7, 4, 5, 1.2],   // Centro Comercial → Mercado
  [4, 11, 7, 1.8],  // Mercado → Aeropuerto
  [11, 4, 7, 1.8],  // Aeropuerto → Mercado

  // Hospital connections
  [5, 9, 4, 0.9],   // Hospital → Biblioteca
  [9, 5, 4, 0.9],   // Biblioteca → Hospital
  [5, 10, 3, 0.7],  // Hospital → Puerto
  [10, 5, 3, 0.7],  // Puerto → Hospital

  // Universidad connections
  [6, 8, 3, 0.8],   // Universidad → Estadio
  [8, 6, 3, 0.8],   // Estadio → Universidad

  // Estadio connections
  [8, 11, 5, 1.3],  // Estadio → Aeropuerto
  [11, 8, 5, 1.3],  // Aeropuerto → Estadio
];

async function seed() {
  console.log("Clearing existing data...");
  await supabase.from("schedule_edges").delete().neq("id", 0);
  await supabase.from("schedules").delete().neq("id", 0);
  await supabase.from("edges").delete().neq("id", 0);
  await supabase.from("nodes").delete().neq("id", 0);

  console.log(`Inserting ${nodeData.length} nodes...`);
  const { data: nodes, error: nodesError } = await supabase
    .from("nodes")
    .insert(nodeData)
    .select("id, name");

  if (nodesError) {
    console.error("Error inserting nodes:", nodesError.message);
    process.exit(1);
  }

  console.log(`Inserted ${nodes.length} nodes.`);

  // Build edges using inserted node IDs
  const edges = edgeData.map(([originIdx, destIdx, time, distance]) => ({
    origin: nodes[originIdx].id,
    destination: nodes[destIdx].id,
    time,
    distance,
  }));

  console.log(`Inserting ${edges.length} edges...`);
  const { data: insertedEdges, error: edgesError } = await supabase
    .from("edges")
    .insert(edges)
    .select("id");

  if (edgesError) {
    console.error("Error inserting edges:", edgesError.message);
    process.exit(1);
  }

  console.log(`Inserted ${insertedEdges.length} edges.`);
  console.log("Seed complete!");
}

seed();
