import React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "lucide-react";

export const ScheduleAppointment = ({ variant }: { variant?: string }) => {
  return (
    <Dialog>
      <DialogTrigger
        className={
          variant
            ? `border-sky-500 text-sky-600 hover:text-sky-600 w-full border rounded-md items-center flex justify-center gap-2 p-2 max-w-64 hover:bg-sky-100`
            : `bg-sky-600 border-sky-600 text-white w-full hover:bg-sky-500 hover:text-white rounded-md flex items-center justify-center p-2 gap-2 `
        }
      >
        <Calendar
          className={
            variant ? `text-sky-600` : `text-white `
          }
          size={20}
        />
        Shedule Appointment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
