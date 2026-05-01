# Task 9: Schedule Conflict Detection Service

## Goal

Implement edge-level conflict detection logic to prevent two trains from occupying the same edge at the same time.

## Deliverables

- [ ] `src/lib/schedule-conflict.ts` with:
  - `checkConflicts(supabase, proposedEdges)` → `ConflictResult`
  - `computeScheduleEdges(path, edges, departureTime)` → array of `{ edge_id, position, start_time, end_time }`
  - `ConflictResult` interface: `{ hasConflict: boolean; conflicts: ConflictDetail[] }`

## Conflict Rule

Two trains conflict when on the **same edge** with **overlapping time windows**:

```
existing.start_time < proposed.end_time AND existing.end_time > proposed.start_time
```

## Time Computation

Starting from `departureTime`, accumulate each edge's `time` (minutes) to compute `start_time` and `end_time` for each edge segment in the path.

## Query Strategy

For each proposed edge, query `schedule_edges` where:

- `edge_id` matches
- `start_time < proposed.end_time`
- `end_time > proposed.start_time`

## Verification

- Insert a schedule in the DB manually
- Call `checkConflicts()` with overlapping edge/time → returns conflict
- Call with non-overlapping time → returns no conflict
