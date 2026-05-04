"use client";

import { useState, useTransition } from "react";
import {
  Map,
  MapTileLayer,
  MapMarker,
  MapPopup,
  MapPolyline,
} from "@/components/ui/map";
import type { LatLngExpression } from "leaflet";
import type { Node, Edge, ScheduleWithEdges } from "@/types";
import {
  quickSchedule,
  cancelSchedule,
  type QuickScheduleResult,
} from "@/app/actions";

interface MapViewProps {
  nodes: Node[];
  edges: Edge[];
  highlightedPath?: Node[];
  schedules?: ScheduleWithEdges[];
}

export function MapView({
  nodes,
  edges,
  highlightedPath,
  schedules = [],
}: MapViewProps) {
  const [originId, setOriginId] = useState<number | null>(null);
  const [result, setResult] = useState<QuickScheduleResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const center: LatLngExpression =
    nodes.length > 0
      ? [
          nodes.reduce((sum, n) => sum + n.latitude, 0) / nodes.length,
          nodes.reduce((sum, n) => sum + n.longitude, 0) / nodes.length,
        ]
      : [9.952, -75.081];

  const nodeMap = new globalThis.Map(nodes.map((n) => [n.id, n]));

  function handleMarkerClick(nodeId: number) {
    if (isPending) return;

    if (originId === null) {
      setOriginId(nodeId);
      setResult(null);
    } else {
      const destId = nodeId;
      const origin = originId;
      setOriginId(null);
      startTransition(async () => {
        const res = await quickSchedule(origin, destId);
        setResult(res);
      });
    }
  }

  function handleCancel(scheduleId: number) {
    startTransition(async () => {
      await cancelSchedule(scheduleId);
      setResult(null);
    });
  }

  function getSchedulePath(schedule: ScheduleWithEdges): [number, number][] {
    const sortedEdges = [...schedule.schedule_edges].sort(
      (a, b) => a.position - b.position,
    );
    const points: [number, number][] = [];

    for (const se of sortedEdges) {
      const edge = edges.find((e) => e.id === se.edge_id);
      if (!edge) continue;
      const fromNode = nodeMap.get(edge.origin);
      const toNode = nodeMap.get(edge.destination);
      if (!fromNode || !toNode) continue;
      if (points.length === 0) {
        points.push([fromNode.latitude, fromNode.longitude]);
      }
      points.push([toNode.latitude, toNode.longitude]);
    }
    return points;
  }

  return (
    <div className="flex-1 relative h-full">
      {/* Status bar */}
      <div className="absolute top-3 left-3 z-[1000] space-y-2 max-w-sm">
        {originId !== null && (
          <div className="bg-background border-2 border-border rounded px-4 py-3 shadow-md text-sm font-medium">
            <strong>Origin:</strong> {nodeMap.get(originId)?.name} &mdash; Now
            click a destination
            <button
              onClick={() => {
                setOriginId(null);
                setResult(null);
              }}
              className="ml-3 text-destructive underline text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        )}

        {originId === null && !result && !isPending && (
          <div className="bg-background/90 backdrop-blur-sm border-2 border-border rounded px-4 py-3 shadow-md text-sm text-muted-foreground">
            Click a station to set origin
          </div>
        )}

        {isPending && (
          <div className="bg-background border-2 border-border rounded px-3 py-2 shadow-md text-sm">
            Scheduling...
          </div>
        )}

        {result && !isPending && (
          <div
            className={`bg-background border-2 rounded px-3 py-2 shadow-md text-sm ${result.success ? "border-green-500" : "border-destructive"}`}
          >
            {result.success ? (
              <div>
                <p className="text-green-600 font-medium">Trip scheduled!</p>
                <p>{result.path?.join(" → ")}</p>
                <p className="text-xs text-muted-foreground">
                  Departs:{" "}
                  {new Date(result.departureTime!).toLocaleTimeString()}
                  {result.delayed && " (delayed to avoid conflict)"}
                </p>
              </div>
            ) : (
              <p className="text-destructive">{result.error}</p>
            )}
            <button
              onClick={() => setResult(null)}
              className="mt-1 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Scheduled trips panel */}
      {schedules.length > 0 && (
        <div className="absolute top-3 right-3 z-[1000] bg-background/95 backdrop-blur-sm border-2 border-border rounded shadow-md p-3 max-w-xs max-h-72 overflow-y-auto">
          <p className="text-xs font-bold uppercase tracking-wide mb-2">
            Scheduled Trips
          </p>
          {schedules.map((s) => (
            <div
              key={s.id}
              className="text-xs border-b border-border pb-1 mb-1 last:border-0 last:mb-0 last:pb-0"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-medium">{s.name}</span>
                <button
                  onClick={() => handleCancel(s.id)}
                  disabled={isPending}
                  className="text-destructive underline shrink-0"
                >
                  Cancel
                </button>
              </div>
              <span className="text-muted-foreground">
                {new Date(s.departure_time).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <Map center={center} zoom={15}>
        <MapTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Edge lines */}
        {edges.map((edge) => {
          const from = nodeMap.get(edge.origin);
          const to = nodeMap.get(edge.destination);
          if (!from || !to) return null;
          return (
            <MapPolyline
              key={edge.id}
              positions={[
                [from.latitude, from.longitude],
                [to.latitude, to.longitude],
              ]}
              className="!stroke-muted-foreground !stroke-[2] !fill-none opacity-60"
            />
          );
        })}

        {/* Scheduled trip paths */}
        {schedules.map((schedule) => {
          const positions = getSchedulePath(schedule);
          if (positions.length < 2) return null;
          return (
            <MapPolyline
              key={`schedule-${schedule.id}`}
              positions={positions}
              className="!stroke-blue-500 !stroke-[3] !fill-none opacity-70"
            />
          );
        })}

        {/* Highlighted path */}
        {highlightedPath && highlightedPath.length > 1 && (
          <MapPolyline
            positions={highlightedPath.map(
              (n) => [n.latitude, n.longitude] as [number, number],
            )}
            className="!stroke-red-500 !stroke-[4] !fill-none"
          />
        )}

        {/* Node markers */}
        {nodes.map((node) => {
          const isOrigin = originId === node.id;
          return (
            <MapMarker
              key={node.id}
              position={[node.latitude, node.longitude]}
              eventHandlers={{ click: () => handleMarkerClick(node.id) }}
            >
              <MapPopup>
                <div className="px-3 py-2 text-sm font-medium whitespace-nowrap">
                  {node.name}
                  {isOrigin && (
                    <span className="ml-1 text-green-600 font-bold">
                      (origin)
                    </span>
                  )}
                </div>
              </MapPopup>
            </MapMarker>
          );
        })}
      </Map>
    </div>
  );
}
