"use client";

import { useActionState, useMemo } from "react";
import { Select } from "@/components/retroui/Select";
import { Button } from "@/components/retroui/Button";
import { Text } from "@/components/retroui/Text";
import { findShortestPath, type PathResult } from "@/lib/pathfinder";
import { createSchedule, type CreateScheduleState } from "../actions";
import type { Node, Edge } from "@/types";
import { useState } from "react";

interface NewScheduleFormProps {
  nodes: Node[];
  edges: Edge[];
}

export function NewScheduleForm({ nodes, edges }: NewScheduleFormProps) {
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [state, formAction, pending] = useActionState<
    CreateScheduleState | null,
    FormData
  >(createSchedule, null);

  const pathResult: PathResult | null = useMemo(() => {
    if (!originId || !destinationId) return null;
    return findShortestPath(
      nodes,
      edges,
      Number(originId),
      Number(destinationId),
    );
  }, [nodes, edges, originId, destinationId]);

  return (
    <form action={formAction} className="space-y-6">
      <Text as="h2">New Schedule</Text>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <input
          name="name"
          type="text"
          required
          className="w-full border-2 border-border rounded px-3 py-2 bg-transparent"
          placeholder="e.g. Morning Express"
        />
      </div>

      {/* Origin & Destination */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Origin</label>
          <Select value={originId} onValueChange={setOriginId}>
            <Select.Trigger className="w-48">
              <Select.Value placeholder="Select origin" />
            </Select.Trigger>
            <Select.Content>
              {nodes.map((node) => (
                <Select.Item key={node.id} value={String(node.id)}>
                  {node.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <input type="hidden" name="origin" value={originId} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Destination</label>
          <Select value={destinationId} onValueChange={setDestinationId}>
            <Select.Trigger className="w-48">
              <Select.Value placeholder="Select destination" />
            </Select.Trigger>
            <Select.Content>
              {nodes.map((node) => (
                <Select.Item key={node.id} value={String(node.id)}>
                  {node.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <input type="hidden" name="destination" value={destinationId} />
        </div>
      </div>

      {/* Path preview */}
      {originId && destinationId && (
        <div className="text-sm">
          {pathResult ? (
            <div className="space-y-1">
              <p className="font-medium text-green-600">
                Route: {pathResult.path.map((n) => n.name).join(" → ")}
              </p>
              <p>
                Distance: {pathResult.totalDistance.toFixed(1)} km | Time:{" "}
                {pathResult.totalTime.toFixed(0)} min
              </p>
            </div>
          ) : (
            <p className="text-destructive font-medium">
              No path found between selected nodes.
            </p>
          )}
        </div>
      )}

      {/* Departure time */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Departure Time</label>
        <input
          name="departure_time"
          type="datetime-local"
          required
          className="w-full border-2 border-border rounded px-3 py-2 bg-transparent"
        />
      </div>

      {/* Error display */}
      {state?.error && (
        <div className="border-2 border-destructive rounded p-3 text-sm space-y-2">
          <p className="text-destructive font-medium">{state.error}</p>
          {state.conflicts && state.conflicts.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {state.conflicts.map((c, i) => (
                <li key={i}>
                  Edge #{c.edge_id} conflicts with schedule #
                  {c.existing_schedule_id} (
                  {new Date(c.existing_start).toLocaleString()} –{" "}
                  {new Date(c.existing_end).toLocaleString()})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={pending || !pathResult}>
        {pending ? "Creating..." : "Check & Create"}
      </Button>
    </form>
  );
}
