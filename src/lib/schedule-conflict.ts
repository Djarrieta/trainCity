import type { SupabaseClient } from "@supabase/supabase-js";
import type { Node } from "@/types/node";
import type { Edge } from "@/types/edge";

export interface ProposedEdge {
  edge_id: number;
  position: number;
  start_time: string;
  end_time: string;
}

export interface ConflictDetail {
  edge_id: number;
  proposed_start: string;
  proposed_end: string;
  existing_schedule_id: number;
  existing_start: string;
  existing_end: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
}

/**
 * Given a path (ordered nodes) and edges data, compute the schedule_edges
 * with start_time and end_time for each segment starting from departureTime.
 */
export function computeScheduleEdges(
  path: Node[],
  edges: Edge[],
  departureTime: string
): ProposedEdge[] {
  if (path.length < 2) return [];

  const result: ProposedEdge[] = [];
  let currentTime = new Date(departureTime);

  for (let i = 0; i < path.length - 1; i++) {
    const fromId = path[i].id;
    const toId = path[i + 1].id;

    // Find the edge connecting these two nodes (directional)
    const edge = edges.find((e) => e.origin === fromId && e.destination === toId);
    if (!edge) continue;

    const startTime = new Date(currentTime);
    const endTime = new Date(currentTime.getTime() + edge.time * 60_000);

    result.push({
      edge_id: edge.id,
      position: i,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });

    currentTime = endTime;
  }

  return result;
}

/**
 * Check if any of the proposed edges conflict with existing schedule_edges in the DB.
 * Two trains conflict when on the same edge with overlapping time windows.
 */
export async function checkConflicts(
  supabase: SupabaseClient,
  proposedEdges: ProposedEdge[],
  excludeScheduleId?: number
): Promise<ConflictResult> {
  const conflicts: ConflictDetail[] = [];

  for (const proposed of proposedEdges) {
    let query = supabase
      .from("schedule_edges")
      .select("schedule_id, edge_id, start_time, end_time")
      .eq("edge_id", proposed.edge_id)
      .lt("start_time", proposed.end_time)
      .gt("end_time", proposed.start_time);

    if (excludeScheduleId !== undefined) {
      query = query.neq("schedule_id", excludeScheduleId);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      for (const existing of data) {
        conflicts.push({
          edge_id: proposed.edge_id,
          proposed_start: proposed.start_time,
          proposed_end: proposed.end_time,
          existing_schedule_id: existing.schedule_id,
          existing_start: existing.start_time,
          existing_end: existing.end_time,
        });
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
