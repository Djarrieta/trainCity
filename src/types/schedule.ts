export interface Schedule {
  id: number;
  name: string;
  origin: number;
  destination: number;
  departure_time: string;
  created_at: string;
}

export interface ScheduleEdge {
  id: number;
  schedule_id: number;
  edge_id: number;
  position: number;
  start_time: string;
  end_time: string;
}

export interface ScheduleWithEdges extends Schedule {
  schedule_edges: ScheduleEdge[];
}
