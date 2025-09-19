"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Patient } from "./types";
import { formatDateOfBirth } from "./utils";
import { EditPatientModal } from "@/components/modals/EditPatientModal";
import { DeletePatientModal } from "@/components/modals/DeletePatientModal";
import { updatePatient } from "@/lib/supabase/updatePatient";
import { deletePatient } from "@/lib/supabase/deletePatient";
import { Country } from "./constants/countries";

// Actions cell component
function ActionsCell({ patient }: { patient: Patient }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const updatePatientMutation = useMutation({
    mutationFn: (updated: {
      country_code?: Country;
      phone_number?: string;
      email?: string;
      gender?: string;
      date_of_birth?: string;
      language?: string;
      occupation?: string;
    }) => updatePatient(patient.id, updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient updated successfully");
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update patient: " + error.message);
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: () => deletePatient(patient.id),
    onSuccess: () => {
      toast.success("Patient deleted successfully");
      setIsDeleteModalOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to delete patient: " + error.message);
    },
  });

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row navigation
    setIsEditModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row navigation
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = (updated: {
    country_code?: Country;
    phone_number?: string;
    email?: string;
    gender?: string;
    date_of_birth?: string;
    language?: string;
    occupation?: string;
  }) => {
    updatePatientMutation.mutate(updated);
  };

  const handleConfirmDelete = () => {
    deletePatientMutation.mutate();
  };

  return (
    <>
      <div 
        className="flex justify-center"
        onClick={(e) => e.stopPropagation()} // Prevent row navigation
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-500 focus:text-red-500" 
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4 text-red-500" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditPatientModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        patient={{
          country_code: patient.country_code,
          phone_number: patient.phone_number,
          email: patient.email,
          gender: patient.gender,
          date_of_birth: patient.date_of_birth,
          language: patient.language,
          occupation: patient.occupation,
        }}
        onSave={handleSaveEdit}
      />

      <DeletePatientModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        patientName={patient.name}
        onConfirm={handleConfirmDelete}
        isDeleting={deletePatientMutation.isPending}
      />
    </>
  );
}

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export const columns: ColumnDef<Patient>[] = [
  {
    accessorKey: "profile",
    header: "Profile",
    cell: ({ row }) => {
      const picture = row.original.profile_img;
      return (
        <Avatar>
          <AvatarImage src={picture} />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "dateOfBirth", // make sure this exactly matches your data
    header: "Date of birth",
    cell: ({ row }) => {
      const rawDate = row.original.date_of_birth;
      const formattedDate = formatDateOfBirth(rawDate);
      return <div>{formattedDate}</div>;
    },
  },

  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const countryCode = row.original.country_code;
      const phoneNumber = row.original.phone_number;
      
      if (!phoneNumber) return <div>—</div>;
      
      const displayPhone = countryCode?.flag && countryCode?.phoneCode 
        ? `${countryCode.flag} ${countryCode.phoneCode} ${phoneNumber}`
        : phoneNumber;
        
      return <div>{displayPhone}</div>;
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <ActionsCell patient={row.original} />,
  },
];
