// app/patients/[id]/page.tsx
import PatientDetailClient from "@/components/PatientDetailClient";

export default async function PatientDetail({ params }: { params: { id: string } }) {

  return (
    <div className="container mx-auto">
      <PatientDetailClient id={params.id} />
    </div>
  );
}
