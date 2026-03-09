// ============================================================
// CORE DATABASE TYPES
// ============================================================

export type UserRole = "parent" | "doctor";
export type Gender = "male" | "female" | "other";
export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "unknown";
export type VaccinationStatus = "pending" | "issued";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  full_name: string;
  dob: string;
  gender: Gender;
  blood_group: BloodGroup | null;
  created_at: string;
  updated_at: string;
}

export interface Vaccine {
  id: string;
  name: string;
  full_name: string;
  recommended_age_weeks: number;
  description: string | null;
  diseases_prevented: string[] | null;
  doses_required: number;
  dose_number: number;
  series_name: string | null;
  created_at: string;
}

export interface ChildVaccination {
  id: string;
  child_id: string;
  vaccine_id: string;
  status: VaccinationStatus;
  administered_date: string | null;
  doctor_id: string | null;
  batch_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vaccine?: Vaccine;
  doctor?: Profile;
}

export interface ChildFormData {
  full_name: string;
  dob: string;
  gender: Gender;
  blood_group: BloodGroup;
}

export interface VaccinationUpdateData {
  status: VaccinationStatus;
  administered_date: string;
  batch_number: string;
  notes: string;
}

export interface AuthFormData {
  email: string;
  password: string;
  full_name?: string;
  role?: UserRole;
}

export type VaccineScheduleEntry = {
  vaccine: Vaccine;
  vaccination: ChildVaccination | null;
  status: "completed" | "upcoming" | "overdue";
  dueDate: Date;
  daysUntilDue: number;
};

export type VaccineScheduleGroup = {
  label: string;
  ageWeeks: number;
  entries: VaccineScheduleEntry[];
};

export interface ApiError {
  message: string;
  code?: string;
}

export type ApiResult<T> = {
  data: T | null;
  error: ApiError | null;
};

export interface SetupInfo {
  provider: string;
  green_api_configured: boolean;
  instance_id: string;
  steps: string[];
  note: string;
  phone_format: string;
}

export interface DoctorProfile {
  id: string;
  full_name: string;
  clinic_name: string | null;
  clinic_address: string | null;
  lat: number | null;
  lng: number | null;
  distance_km?: number;   // populated client-side after search
}