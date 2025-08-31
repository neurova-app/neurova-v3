import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  country_code: z.string().regex(/^\+\d+$/, "Invalid country code"),
  phone_number: z
    .string()
    .min(7, "Phone number must be at least 7 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
});


export type PatientSchema = z.infer<typeof patientSchema>;
