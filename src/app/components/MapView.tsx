"use client";

import {
  Map,
  MapTileLayer,
  MapMarker,
  MapPopup,
  MapPolyline,
} from "@/components/ui/map";
import type { LatLngExpression } from "leaflet";
import type { Node, Edge } from "@/types";

interface MapViewProps {
  nodes: Node[];
  edges: Edge[];
  highlightedPath?: Node[];
}

export function MapView({ nodes, edges, highlightedPath }: MapViewProps) {
  const center: LatLngExpression =
    nodes.length > 0
      ? [
          nodes.reduce((sum, n) => sum + n.latitude, 0) / nodes.length,
          nodes.reduce((sum, n) => sum + n.longitude, 0) / nodes.length,
        ]
      : [9.952, -75.081];

  const nodeMap = new globalThis.Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex-1 relative">
      <Map center={center} zoom={15}>
        <MapTileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; National Geographic"
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
              className="!stroke-muted-foreground !stroke-[2] !fill-none opacity-50"
            />
          );
        })}

        {/* Highlighted path */}
        {highlightedPath && highlightedPath.length > 1 && (
          <MapPolyline
            positions={highlightedPath.map(
              (n) => [n.latitude, n.longitude] as [number, number],
            )}
            className="!stroke-primary !stroke-[4] !fill-none"
          />
        )}

        {/* Node markers */}
        {nodes.map((node) => (
          <MapMarker
            key={node.id}
            position={[node.latitude, node.longitude]}
          >
            <MapPopup>
              <div className="p-2 text-sm font-medium">{node.name}</div>
            </MapPopup>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
