"""Schedule computation — mirrors the TypeScript vaccineSchedule.ts logic."""
from __future__ import annotations
from datetime import date, timedelta
from dataclasses import dataclass
from typing import Optional
from models.schemas import VaccineRow, ChildVaccinationRow


@dataclass
class ScheduleEntry:
    vaccine: VaccineRow
    vaccination: Optional[ChildVaccinationRow]
    status: str          # "completed" | "upcoming" | "overdue"
    due_date: date
    days_until_due: int  # negative means overdue


def get_due_date(dob: date, recommended_age_weeks: int) -> date:
    return dob + timedelta(weeks=recommended_age_weeks)


def compute_entry(dob: date, vaccine: VaccineRow,
                  vaccination: Optional[ChildVaccinationRow],
                  today: Optional[date] = None) -> ScheduleEntry:
    today = today or date.today()
    due = get_due_date(dob, vaccine.recommended_age_weeks)
    days = (due - today).days
    if vaccination and vaccination.status in ("issued", "authorized"):
        status = "completed"
    elif days < 0:
        status = "overdue"
    else:
        status = "upcoming"
    return ScheduleEntry(vaccine=vaccine, vaccination=vaccination,
                         status=status, due_date=due, days_until_due=days)


def build_schedule(dob: date, vaccines: list[VaccineRow],
                   vaccinations: list[ChildVaccinationRow],
                   today: Optional[date] = None) -> list[ScheduleEntry]:
    vmap = {v.vaccine_id: v for v in vaccinations}
    return [compute_entry(dob, v, vmap.get(v.id), today) for v in vaccines]


def format_age(dob: date, today: Optional[date] = None) -> str:
    today = today or date.today()
    weeks = (today - dob).days // 7
    if weeks < 4:
        return f"{weeks} week{'s' if weeks != 1 else ''}"
    months = int(weeks / 4.33)
    if months < 24:
        return f"{months} month{'s' if months != 1 else ''}"
    years, rem = divmod(months, 12)
    return f"{years}y {rem}m" if rem else f"{years} year{'s' if years != 1 else ''}"


def get_schedule_summary(entries: list[ScheduleEntry]) -> dict[str, int]:
    return {
        "total": len(entries),
        "completed": sum(1 for e in entries if e.status == "completed"),
        "overdue": sum(1 for e in entries if e.status == "overdue"),
        "upcoming": sum(1 for e in entries if e.status == "upcoming"),
    }


AGE_LABELS: dict[int, str] = {
    0: "At Birth", 6: "6 Weeks", 10: "10 Weeks", 14: "14 Weeks",
    39: "9 Months", 52: "12 Months", 65: "15 Months",
    72: "16–18 Months", 78: "18–24 Months", 91: "21 Months",
    260: "5 Years", 520: "10 Years", 832: "16 Years",
}