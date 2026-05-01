import type { Node } from "./node";

export interface Edge {
  id: number;
  origin: number;
  destination: number;
  time: number;
  distance: number;
  created_at: string;
}

export interface EdgeWithNodes extends Edge {
  origin_node: Node;
  destination_node: Node;
}
