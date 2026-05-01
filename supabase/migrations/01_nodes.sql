DROP TABLE IF EXISTS public.nodes CASCADE;

CREATE TABLE public.nodes (
    id serial PRIMARY KEY,
    name text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nodes: public read" ON public.nodes FOR
SELECT USING (true);

CREATE POLICY "nodes: public insert" ON public.nodes FOR INSERT
WITH
    CHECK (true);

CREATE POLICY "nodes: public update" ON public.nodes
FOR UPDATE
    USING (true);

CREATE POLICY "nodes: public delete" ON public.nodes FOR DELETE USING (true);