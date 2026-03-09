import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Vaccine, ChildVaccination, VaccinationUpdateData, VaccineScheduleEntry } from '../types';
import { buildSchedule } from '../lib/vaccineSchedule';

export function useVaccinations(childId: string | null, dob: string | null) {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [vaccinations, setVaccinations] = useState<ChildVaccination[]>([]);
  const [schedule, setSchedule] = useState<VaccineScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!childId || !dob) { setLoading(false); return; }
    setLoading(true);

    const [vaccinesRes, vaccinationsRes] = await Promise.all([
      supabase.from('vaccines').select('*').order('recommended_age_weeks', { ascending: true }),
      supabase
        .from('child_vaccinations')
        .select('*, vaccine:vaccines(*), doctor:profiles(*)')
        .eq('child_id', childId),
    ]);

    if (vaccinesRes.error) { setError(vaccinesRes.error.message); setLoading(false); return; }
    if (vaccinationsRes.error) { setError(vaccinationsRes.error.message); setLoading(false); return; }

    const vaxList = (vaccinesRes.data as Vaccine[]) || [];
    const vacList = (vaccinationsRes.data as ChildVaccination[]) || [];

    setVaccines(vaxList);
    setVaccinations(vacList);
    setSchedule(buildSchedule(dob, vaxList, vacList));
    setLoading(false);
  }, [childId, dob]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const upsertVaccination = async (
    vaccineId: string,
    updateData: VaccinationUpdateData,
    doctorId: string
  ): Promise<{ error: string | null }> => {
    if (!childId) return { error: 'No child selected' };

    const existing = vaccinations.find(v => v.vaccine_id === vaccineId);

    if (existing) {
      const { error } = await supabase
        .from('child_vaccinations')
        .update({ ...updateData, doctor_id: doctorId, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from('child_vaccinations').insert({
        child_id: childId,
        vaccine_id: vaccineId,
        doctor_id: doctorId,
        ...updateData,
      });
      if (error) return { error: error.message };
    }

    await fetchData();
    return { error: null };
  };

  return { vaccines, vaccinations, schedule, loading, error, refetch: fetchData, upsertVaccination };
}
