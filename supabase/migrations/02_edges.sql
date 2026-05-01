DROP TABLE IF EXISTS public.edges CASCADE;

CREATE TABLE public.edges (
    id serial PRIMARY KEY,
    origin integer NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
    destination integer NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
    time double precision NOT NULL, -- minutes
    distance double precision NOT NULL, -- kilometers
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (origin != destination)
);

CREATE INDEX edges_origin_idx ON public.edges (origin);

CREATE INDEX edges_destination_idx ON public.edges (destination);

ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edges: public read" ON public.edges FOR
SELECT USING (true);

CREATE POLICY "edges: public insert" ON public.edges FOR INSERT
WITH
    CHECK (true);

CREATE POLICY "edges: public update" ON public.edges
FOR UPDATE
    USING (true);

CREATE POLICY "edges: public delete" ON public.edges FOR DELETE USING (true);