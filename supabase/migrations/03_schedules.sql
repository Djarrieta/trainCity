DROP TABLE IF EXISTS public.schedule_edges CASCADE;

DROP TABLE IF EXISTS public.schedules CASCADE;

CREATE TABLE public.schedules (
    id serial PRIMARY KEY,
    name text NOT NULL,
    origin integer NOT NULL REFERENCES public.nodes (id),
    destination integer NOT NULL REFERENCES public.nodes (id),
    departure_time timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Each schedule has an ordered list of edges with the time each edge is occupied
CREATE TABLE public.schedule_edges (
    id serial PRIMARY KEY,
    schedule_id integer NOT NULL REFERENCES public.schedules (id) ON DELETE CASCADE,
    edge_id integer NOT NULL REFERENCES public.edges (id),
    position integer NOT NULL,
    start_time timestamptz NOT NULL, -- when the train enters this edge
    end_time timestamptz NOT NULL, -- when the train exits this edge
    UNIQUE (schedule_id, position)
);

CREATE INDEX schedule_edges_edge_time_idx ON public.schedule_edges (edge_id, start_time, end_time);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.schedule_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules: public read" ON public.schedules FOR
SELECT USING (true);

CREATE POLICY "schedules: public insert" ON public.schedules FOR INSERT
WITH
    CHECK (true);

CREATE POLICY "schedules: public update" ON public.schedules
FOR UPDATE
    USING (true);

CREATE POLICY "schedules: public delete" ON public.schedules FOR DELETE USING (true);

CREATE POLICY "schedule_edges: public read" ON public.schedule_edges FOR
SELECT USING (true);

CREATE POLICY "schedule_edges: public insert" ON public.schedule_edges FOR INSERT
WITH
    CHECK (true);

CREATE POLICY "schedule_edges: public delete" ON public.schedule_edges FOR DELETE USING (true);