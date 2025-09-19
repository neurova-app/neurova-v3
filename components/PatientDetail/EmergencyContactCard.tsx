"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { EmergencyContact } from "@/lib/types";
import { EditEmergencyContactModal } from "../modals/EditEmergencyContactModal";
import { updatePatient } from "@/lib/supabase/updatePatient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/constants/countries";

export const EmergencyContactCard = ({
  emergency_contact,
  patientId,
}: {
  emergency_contact?: EmergencyContact;
  patientId: string;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateEmergencyContactMutation = useMutation({
    mutationFn: (updated: EmergencyContact) => 
      updatePatient(patientId, { emergency_contact: updated }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      toast.success("Emergency contact updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update emergency contact: " + error.message);
    },
  });

  const handleSave = (updated: EmergencyContact) => {
    updateEmergencyContactMutation.mutate(updated);
  };

  return (
    <>
      <Card className="shadow-xs border border-red-200  relative">
        <CardHeader className="text-center flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-red-500">
            Emergency Contact
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-red-200"
            onClick={() => setIsModalOpen(true)}
          >
            <Pencil className="w-4 h-4 text-red-400" />
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 space-y-1 text-sm">
          <div className="flex justify-between items-center gap-2">
            <span className="text-gray-400">Name</span>
            <span className="text-primary text-right">
              {emergency_contact?.name ?? "--"}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-gray-400">Phone</span>
            <span className="text-primary text-right">
              {emergency_contact?.country_code?.flag && emergency_contact?.country_code?.phoneCode && emergency_contact?.phone
                ? `${emergency_contact.country_code.flag} ${emergency_contact.country_code.phoneCode} ${emergency_contact.phone}`
                : emergency_contact?.phone || "--"}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-gray-400">Relationship</span>
            <span className="text-primary text-right">
              {emergency_contact?.relationship ?? "--"}
            </span>
          </div>
        </CardContent>
      </Card>

      <EditEmergencyContactModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        contact={{
          name: emergency_contact?.name ?? "",
          country_code: emergency_contact?.country_code ?? COUNTRIES[0],
          phone: emergency_contact?.phone ?? "",
          relationship: emergency_contact?.relationship ?? "",
        }}
        onSave={handleSave}
      />
    </>
  );
};
