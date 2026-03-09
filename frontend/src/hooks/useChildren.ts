import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Child, ChildFormData } from '../types';

export function useChildren(parentId: string | null) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!parentId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (error) setError(error.message);
    else setChildren((data as Child[]) || []);
    setLoading(false);
  }, [parentId]);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  const createChild = async (formData: ChildFormData): Promise<{ error: string | null }> => {
    if (!parentId) return { error: 'Not authenticated' };
    const { error } = await supabase.from('children').insert({ ...formData, parent_id: parentId });
    if (error) return { error: error.message };
    await fetchChildren();
    return { error: null };
  };

  const updateChild = async (id: string, formData: Partial<ChildFormData>): Promise<{ error: string | null }> => {
    const { error } = await supabase.from('children').update(formData).eq('id', id);
    if (error) return { error: error.message };
    await fetchChildren();
    return { error: null };
  };

  const deleteChild = async (id: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.from('children').delete().eq('id', id);
    if (error) return { error: error.message };
    await fetchChildren();
    return { error: null };
  };

  return { children, loading, error, refetch: fetchChildren, createChild, updateChild, deleteChild };
}
