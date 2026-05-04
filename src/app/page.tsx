import { createClient } from "@/lib/supabase/server";
import type { Node, Edge, ScheduleWithEdges } from "@/types";
import { MapView } from "./components/MapView";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: nodes }, { data: edges }, { data: schedules }] =
    await Promise.all([
      supabase.from("nodes").select("*").returns<Node[]>(),
      supabase.from("edges").select("*").returns<Edge[]>(),
      supabase
        .from("schedules")
        .select("*, schedule_edges(*)")
        .returns<ScheduleWithEdges[]>(),
    ]);

  return (
    <MapView
      nodes={nodes ?? []}
      edges={edges ?? []}
      schedules={schedules ?? []}
    />
  );
}
