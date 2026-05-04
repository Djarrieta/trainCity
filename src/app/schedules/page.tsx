import { createClient } from "@/lib/supabase/server";
import type { Node } from "@/types";
import { Table } from "@/components/retroui/Table";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import Link from "next/link";

export default async function SchedulesPage() {
  const supabase = await createClient();

  const { data: schedules } = await supabase
    .from("schedules")
    .select(
      "*, origin_node:nodes!origin(*), destination_node:nodes!destination(*)",
    )
    .order("departure_time", { ascending: true });

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between">
        <Text as="h2">Schedules</Text>
        <Button asChild>
          <Link href="/schedules/new">New Schedule</Link>
        </Button>
      </div>

      {schedules && schedules.length > 0 ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Origin</Table.Head>
              <Table.Head>Destination</Table.Head>
              <Table.Head>Departure</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {schedules.map((schedule) => (
              <Table.Row key={schedule.id}>
                <Table.Cell>{schedule.name}</Table.Cell>
                <Table.Cell>
                  {(schedule.origin_node as unknown as Node)?.name ??
                    schedule.origin}
                </Table.Cell>
                <Table.Cell>
                  {(schedule.destination_node as unknown as Node)?.name ??
                    schedule.destination}
                </Table.Cell>
                <Table.Cell>
                  {new Date(schedule.departure_time).toLocaleString()}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ) : (
        <Text as="p">No schedules yet. Create one to get started.</Text>
      )}
    </div>
  );
}
