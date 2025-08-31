"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
      console.log(row.original)
      const rawDate = row.original.date_of_birth;

      if (!rawDate) return <div>—</div>; // handle null/undefined/empty

      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return <div>Invalid date</div>; // handle invalid format

      const formatted = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(date);

      return <div>{formatted}</div>;
    },
  },

  {
    accessorKey: "phone",
    header: "Phone",
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
    accessorKey: "city",
    header: "City",
  },
  {
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: () => {
      return (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-500">
                <Trash2 className="text-red-500 " />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
