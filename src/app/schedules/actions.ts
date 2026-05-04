"use server";

import { createClient } from "@/lib/supabase/server";
import { findShortestPath } from "@/lib/pathfinder";
import { computeScheduleEdges, checkConflicts } from "@/lib/schedule-conflict";
import type { Node, Edge } from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface CreateScheduleState {
  error?: string;
  conflicts?: { edge_id: number; existing_schedule_id: number; existing_start: string; existing_end: string }[];
}

export async function createSchedule(
  _prev: CreateScheduleState | null,
  formData: FormData
): Promise<CreateScheduleState> {
  const name = formData.get("name") as string;
  const originId = Number(formData.get("origin"));
  const destinationId = Number(formData.get("destination"));
  const departureTime = formData.get("departure_time") as string;

  if (!name || !originId || !destinationId || !departureTime) {
    return { error: "All fields are required." };
  }

  if (originId === destinationId) {
    return { error: "Origin and destination must be different." };
  }

  const supabase = await createClient();

  // Fetch nodes and edges
  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase.from("nodes").select("*").returns<Node[]>(),
    supabase.from("edges").select("*").returns<Edge[]>(),
  ]);

  if (!nodes || !edges) {
    return { error: "Failed to fetch network data." };
  }

  // Compute path
  const pathResult = findShortestPath(nodes, edges, originId, destinationId);
  if (!pathResult) {
    return { error: "No path exists between the selected nodes." };
  }

  // Compute schedule edges with time windows
  const scheduleEdges = computeScheduleEdges(pathResult.path, edges, departureTime);

  // Check conflicts
  const conflictResult = await checkConflicts(supabase, scheduleEdges);
  if (conflictResult.hasConflict) {
    return {
      error: "Schedule conflicts detected.",
      conflicts: conflictResult.conflicts.map((c) => ({
        edge_id: c.edge_id,
        existing_schedule_id: c.existing_schedule_id,
        existing_start: c.existing_start,
        existing_end: c.existing_end,
      })),
    };
  }

  // Insert schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from("schedules")
    .insert({
      name,
      origin: originId,
      destination: destinationId,
      departure_time: departureTime,
    })
    .select("id")
    .single();

  if (scheduleError || !schedule) {
    return { error: "Failed to create schedule." };
  }

  // Insert schedule_edges
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

  revalidatePath("/schedules");
  redirect("/schedules");
}
