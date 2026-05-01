# Task 10: Schedules Module (List + Create)

## Goal

Build the schedule pages — list existing schedules and create new ones with conflict checking.

## Deliverables

- [ ] `src/app/schedules/page.tsx` — list all schedules in a table/cards (Server Component)
- [ ] `src/app/schedules/new/page.tsx` — create new schedule page
- [ ] `src/app/schedules/actions.ts` — Server Action for inserting schedule + schedule_edges
- [ ] Add nav link to `/schedules` in layout

## Schedule List Page

- Display all schedules with: name, origin node, destination node, departure time
- Use RetroUI Table or Card components

## Create Schedule Page

`"use client"` component with the following flow:

1. Select origin and destination nodes (two dropdowns)
2. System computes path via PathFinder (shows the route)
3. User picks departure datetime (date + time input)
4. User clicks "Check & Create"
5. System computes `schedule_edges` time windows (using `computeScheduleEdges`)
6. System calls `checkConflicts()` to verify no overlaps
7. If conflicts → display error with conflict details (which edge, which existing schedule)
8. If no conflicts → insert via Server Action, redirect to schedule list

## Server Action

```ts
"use server";
async function createSchedule(formData: FormData) {
  // 1. Parse input (origin, destination, departure_time, name)
  // 2. Fetch nodes + edges
  // 3. Compute path
  // 4. Compute schedule_edges with time windows
  // 5. Check conflicts
  // 6. If conflict → return error
  // 7. Insert schedule + schedule_edges
  // 8. revalidatePath("/schedules")
  // 9. redirect("/schedules")
}
```

## Verification

- Create a schedule → appears in the list page
- Try to create a schedule that overlaps an existing one on the same edge → conflict error displayed
- Create a schedule at a different time on the same path → succeeds
