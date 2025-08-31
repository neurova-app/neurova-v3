"use client";
import { getPatients } from "@/lib/supabase/getPatients";
import { DataTable } from "@/components/data-table";
import { columns } from "@/lib/columns";
import { Patient } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export default function Patients() {
  const { data = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  return (
    <div className="container mx-auto">
      <DataTable columns={columns} data={data} loading={isLoading} />
    </div>
  );
}
