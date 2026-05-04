"use server";

import { createClient } from "@/lib/supabase/server";
import { findShortestPath, type PathResult } from "@/lib/pathfinder";
import { computeScheduleEdges, checkConflicts } from "@/lib/schedule-conflict";
import type { Node, Edge } from "@/types";
import { revalidatePath } from "next/cache";

export interface QuickScheduleResult {
  success?: boolean;
  scheduleId?: number;
  departureTime?: string;
  path?: string[];
  delayed?: boolean;
  error?: string;
}

const MAX_DELAY_ATTEMPTS = 10;
const DELAY_INCREMENT_MINUTES = 5;

export async function quickSchedule(
  originId: number,
  destinationId: number
): Promise<QuickScheduleResult> {
  if (originId === destinationId) {
    return { error: "Origin and destination must be different." };
  }

  const supabase = await createClient();

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("nodes").select("*").returns<Node[]>(),
    supabase.from("edges").select("*").returns<Edge[]>(),
  ]);

  if (!nodes || !edges) {
    return { error: "Failed to fetch network data." };
  }

  // Try shortest path first
  const pathResult = findShortestPath(nodes, edges, originId, destinationId);
  if (!pathResult) {
    return { error: "No path exists between the selected nodes." };
  }

  // Try scheduling ASAP, with incremental delays if conflicts
  const now = new Date();
  let departureTime = now;
  let delayed = false;

  for (let attempt = 0; attempt <= MAX_DELAY_ATTEMPTS; attempt++) {
    const scheduleEdges = computeScheduleEdges(
      pathResult.path,
      edges,
      departureTime.toISOString()
    );

    const conflictResult = await checkConflicts(supabase, scheduleEdges);

    if (!conflictResult.hasConflict) {
      // No conflicts — insert schedule
      const originNode = nodes.find((n) => n.id === originId);
      const destNode = nodes.find((n) => n.id === destinationId);
      const name = `${originNode?.name} → ${destNode?.name}`;

      const { data: schedule, error: scheduleError } = await supabase
        .from("schedules")
        .insert({
          name,
          origin: originId,
          destination: destinationId,
          departure_time: departureTime.toISOString(),
        })
        .select("id")
        .single();

      if (scheduleError || !schedule) {
        return { error: "Failed to create schedule." };
      }

      const { error: edgesError } = await supabase.from("schedule_edges").insert(
        scheduleEdges.map((se) => ({
          schedule_id: schedule.id,
          edge_id: se.edge_id,
          position: se.position,
          start_time: se.start_time,
          end_time: se.end_time,
        }))
      );

      if (edgesError) {
        return { error: "Failed to insert schedule edges." };
      }

      revalidatePath("/");
      revalidatePath("/schedules");

      return {
        success: true,
        scheduleId: schedule.id,
        departureTime: departureTime.toISOString(),
        path: pathResult.path.map((n) => n.name),
        delayed: delayed,
      };
    }

    // Conflict found — delay departure
    delayed = true;
    departureTime = new Date(now.getTime() + (attempt + 1) * DELAY_INCREMENT_MINUTES * 60_000);
  }

  return {
    error: `Could not schedule without conflicts. All slots for the next ${MAX_DELAY_ATTEMPTS * DELAY_INCREMENT_MINUTES} minutes are occupied.`,
  };
}

export async function cancelSchedule(scheduleId: number): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    return { error: "Failed to cancel schedule." };
  }

  revalidatePath("/");
  revalidatePath("/schedules");
  return { success: true };
}
