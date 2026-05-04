"use client";

import { useState, useMemo } from "react";
import { Select } from "@/components/retroui/Select";
import { MapView } from "@/app/components/MapView";
import { findShortestPath, type PathResult } from "@/lib/pathfinder";
import type { Node, Edge } from "@/types";

interface PathfinderViewProps {
  nodes: Node[];
  edges: Edge[];
}

export function PathfinderView({ nodes, edges }: PathfinderViewProps) {
  const [originId, setOriginId] = useState<string>("");
  const [destinationId, setDestinationId] = useState<string>("");

  const result: PathResult | null = useMemo(() => {
    if (!originId || !destinationId) return null;
    return findShortestPath(
      nodes,
      edges,
      Number(originId),
      Number(destinationId),
    );
  }, [nodes, edges, originId, destinationId]);

  const noPath = originId && destinationId && result === null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Controls */}
      <div className="border-b-2 border-border px-4 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-2">
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
        </div>

        {/* Result panel */}
        {result && result.path.length > 1 && (
          <div className="flex items-center gap-4 ml-auto text-sm">
            <span>
              <strong>Distance:</strong> {result.totalDistance.toFixed(1)} km
            </span>
            <span>
              <strong>Time:</strong> {result.totalTime.toFixed(0)} min
            </span>
          </div>
        )}

        {noPath && (
          <div className="ml-auto text-sm text-destructive font-medium">
            No path found
          </div>
        )}
      </div>

      {/* Map */}
      <MapView nodes={nodes} edges={edges} highlightedPath={result?.path} />
    </div>
  );
}
