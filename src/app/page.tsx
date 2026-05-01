import { createClient } from "@/lib/supabase/server";
import type { Node, Edge } from "@/types";
import { MapView } from "./components/MapView";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("nodes").select("*").returns<Node[]>(),
    supabase.from("edges").select("*").returns<Edge[]>(),
  ]);

  return <MapView nodes={nodes ?? []} edges={edges ?? []} />;
}
