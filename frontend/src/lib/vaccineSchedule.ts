import { differenceInWeeks, differenceInDays, addWeeks } from "date-fns";
import type {
  Vaccine,
  ChildVaccination,
  VaccineScheduleEntry,
  VaccineScheduleGroup,
} from "../types";

export function calculateAgeInWeeks(dob: string): number {
  return differenceInWeeks(new Date(), new Date(dob));
}

export function formatAge(dob: string): string {
  const ageWeeks = calculateAgeInWeeks(dob);
  if (ageWeeks <= 4) return `${ageWeeks} week${ageWeeks !== 1 ? "s" : ""}`;
  const months = Math.floor(ageWeeks / 4.33);
  if (months < 24) return `${months} month${months !== 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years}y ${remMonths}m`;
}

export function getVaccineDueDate(
  dob: string,
  recommendedAgeWeeks: number,
): Date {
  return addWeeks(new Date(dob), recommendedAgeWeeks);
}

export function computeVaccineStatus(
  dob: string,
  vaccine: Vaccine,
  vaccination: ChildVaccination | null,
): {
  status: "completed" | "upcoming" | "overdue";
  dueDate: Date;
  daysUntilDue: number;
} {
  const dueDate = getVaccineDueDate(dob, vaccine.recommended_age_weeks);
  const today = new Date();
  const daysUntilDue = differenceInDays(dueDate, today);

  if (vaccination && vaccination.status === "issued") {
    return { status: "completed", dueDate, daysUntilDue };
  }

  if (daysUntilDue < 0) {
    return { status: "overdue", dueDate, daysUntilDue };
  }

  return { status: "upcoming", dueDate, daysUntilDue };
}

export function buildSchedule(
  dob: string,
  vaccines: Vaccine[],
  vaccinations: ChildVaccination[],
): VaccineScheduleEntry[] {
  const vaccinationMap = new Map(vaccinations.map((v) => [v.vaccine_id, v]));

  return vaccines.map((vaccine) => {
    const vaccination = vaccinationMap.get(vaccine.id) || null;
    const { status, dueDate, daysUntilDue } = computeVaccineStatus(
      dob,
      vaccine,
      vaccination,
    );
    return { vaccine, vaccination, status, dueDate, daysUntilDue };
  });
}

export function groupScheduleByAge(
  entries: VaccineScheduleEntry[],
): VaccineScheduleGroup[] {
  const groups = new Map<number, VaccineScheduleEntry[]>();

  for (const entry of entries) {
    const weeks = entry.vaccine.recommended_age_weeks;
    if (!groups.has(weeks)) groups.set(weeks, []);
    groups.get(weeks)!.push(entry);
  }

  const ageLabels: Record<number, string> = {
    0: "At Birth",
    6: "6 Weeks",
    10: "10 Weeks",
    14: "14 Weeks",
    39: "9 Months",
    52: "12 Months",
    65: "15 Months",
    72: "16–18 Months",
    78: "18–24 Months",
    91: "21 Months",
    260: "5 Years",
    520: "10 Years",
    832: "16 Years",
  };

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([ageWeeks, groupEntries]) => ({
      label: ageLabels[ageWeeks] || `${ageWeeks} Weeks`,
      ageWeeks,
      entries: groupEntries,
    }));
}

export function getScheduleSummary(entries: VaccineScheduleEntry[]) {
  const completed = entries.filter((e) => e.status === "completed").length;
  const overdue = entries.filter((e) => e.status === "overdue").length;
  const upcoming = entries.filter((e) => e.status === "upcoming").length;
  return { completed, overdue, upcoming, total: entries.length };
}
