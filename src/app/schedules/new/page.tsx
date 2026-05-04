import { createClient } from "@/lib/supabase/server";
import type { Node, Edge } from "@/types";
import { NewScheduleForm } from "./NewScheduleForm";

export default async function NewSchedulePage() {
  const supabase = await createClient();

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("nodes").select("*").returns<Node[]>(),
    supabase.from("edges").select("*").returns<Edge[]>(),
  ]);

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <NewScheduleForm nodes={nodes ?? []} edges={edges ?? []} />
    </div>
  );
}
