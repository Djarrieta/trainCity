import { createClient } from "@/lib/supabase/server";
import type { Node, Edge } from "@/types";
import { PathfinderView } from "./PathfinderView";

export default async function PathfinderPage() {
  const supabase = await createClient();

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("nodes").select("*").returns<Node[]>(),
    supabase.from("edges").select("*").returns<Edge[]>(),
  ]);

  return <PathfinderView nodes={nodes ?? []} edges={edges ?? []} />;
}
