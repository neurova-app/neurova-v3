"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmergencyContact } from "@/lib/types";

interface EditEmergencyContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: EmergencyContact;
  onSave: (updated: EmergencyContact) => void;
}

export function EditEmergencyContactModal({
  open,
  onOpenChange,
  contact,
  onSave,
}: EditEmergencyContactModalProps) {
  const [countryCode, setCountryCode] = useState("+1");
  const [formValues, setFormValues] = useState<EmergencyContact>({
    ...contact,
    phone: contact.phone ?? 0,
  });

  const handleChange = (key: keyof EmergencyContact, value: string | number) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const fields: { label: string; key: keyof EmergencyContact }[] = [
    { label: "Name", key: "name" },
    { label: "Relationship", key: "relationship" },
  ];

  const handleSaveClick = () => {
    const updated = {
      ...formValues,
      phone: parseInt(`${countryCode}${formValues.phone}`.replace(/\D/g, "")),
    };
    onSave(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Emergency Contact</DialogTitle>
          <DialogDescription>Update the emergency contact information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name and Relationship fields */}
          {fields.map(({ label, key }) => (
            <div key={key} className="grid gap-2">
              <label className="text-sm font-medium">{label}</label>
              <Input
                value={formValues[key]?.toString() ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}

          {/* Phone field with country code */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Phone</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+57">🇨🇴 +57</option>
                <option value="+91">🇮🇳 +91</option>
              </select>
              <Input
                type="tel"
                placeholder="3001234567"
                value={formValues.phone?.toString() ?? ""}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
