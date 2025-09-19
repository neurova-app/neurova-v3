import { OutputData } from "@editorjs/editorjs";
import { Country } from "./constants/countries";

export type EmergencyContact = {
  name: string;
  country_code: Country;
  phone: string;
  relationship: string;
};

export type MedicalHistory = {
  expectations?: string;
  mainTopic?: string;
  symptoms?: string;
  familyInfo?: string;
  diagnosis?: string;
};

export type Patient = {
  id: string;
  name: string;
  profile_img?: string;
  date_of_birth?: string; // ISO format (e.g. "1990-05-14")
  gender?: "male" | "female" | "other";
  national_id: number;
  country_code: Country; // Changed to store full country object as JSONB
  phone_number: string;
  email: string;
  city?: string;
  language?: string;
  height?: number;
  occupation?: string;
  emergency_contact?: EmergencyContact; // stored as JSONB in Supabase
  medical_history?: MedicalHistory; // stored as JSONB in Supabase
  created_at?: string;
  updated_at?: string;
};

export type MedicalHistoryNote = {
  id: string; // UUID (primary key)
  patient_id: string; // UUID referencing patients table
  title: string;
  description?: string; // Optional description field
  date: string; // ISO date string (YYYY-MM-DD or full ISO timestamp)
  content: OutputData; // JSONB data from EditorJS
  created_at?: string; // ISO timestamp
  updated_at?: string | null; // optional if you track updates
};
