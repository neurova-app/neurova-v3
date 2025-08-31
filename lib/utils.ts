import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;


export function getInitials(name: string) {
  return name
    .split(" ")
    .map(word => word[0]?.toUpperCase())
    .join("")
    .slice(0, 2); // In case of middle names
}

export function calculateAge(dateString: string): number {
  const birthDate = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}


import { format } from "date-fns";

export function formatLocalDateTime(date: Date) {
  return date.toISOString();
}

export const medicalHistoryLabels: Record<string, string> = {
  expectations: "Expectations with therapy",
  mainTopic: "Why? - Main reason for consultation",
  symptoms: "Symptoms",
  familyInfo: "Family Information",
  diagnosis: "Diagnosis",
};