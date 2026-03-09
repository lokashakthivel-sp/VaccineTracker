import { useState } from 'react';
import { format } from 'date-fns';
import type { VaccineScheduleGroup, VaccineScheduleEntry } from '../types';
import { VaccineStatusBadge } from './VaccineStatusBadge';

interface Props {
  groups: VaccineScheduleGroup[];
  onVaccineClick?: (entry: VaccineScheduleEntry) => void;
  isDoctor?: boolean;
}

const STATUS_COLORS = {
  completed: { bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A' },
  upcoming:  { bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  overdue:   { bg: '#FFF1F2', border: '#FECDD3', dot: '#DC2626' },
};

export function VaccineTimeline({ groups, onVaccineClick, isDoctor }: Props) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map((group, gi) => {
        const hasOverdue = group.entries.some(e => e.status === 'overdue');
        const hasUpcoming = group.entries.some(e => e.status === 'upcoming');
        const allComplete = group.entries.every(e => e.status === 'completed');
        const isExpanded = expandedGroup === gi;

        let headerColor = '#0F172A';
        let headerBg = '#F8FAFC';
        if (hasOverdue) { headerColor = '#991B1B'; headerBg = '#FFF1F2'; }
        else if (allComplete) { headerColor = '#166534'; headerBg = '#F0FDF4'; }
        else if (hasUpcoming) { headerColor = '#92400E'; headerBg = '#FFFBEB'; }

        return (
          <div key={group.ageWeeks} style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #E2E8F0' }}>
            <button
              onClick={() => setExpandedGroup(isExpanded ? null : gi)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: headerBg, border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: hasOverdue ? '#DC2626' : allComplete ? '#16A34A' : '#D97706',
                }} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: headerColor, fontFamily: 'DM Serif Display, serif' }}>
                  {group.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
                  ({group.entries.length} vaccine{group.entries.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasOverdue && <MiniTag label="Overdue" color="#DC2626" bg="#FEE2E2" />}
                {allComplete && <MiniTag label="All Done" color="#16A34A" bg="#DCFCE7" />}
                <span style={{ color: '#94A3B8', fontSize: '0.85rem', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
              </div>
            </button>

            {isExpanded && (
              <div style={{ background: '#fff', padding: '8px 0' }}>
                {group.entries.map(entry => {
                  const cfg = STATUS_COLORS[entry.status];
                  const isClickable = isDoctor && entry.status !== 'completed';

                  return (
                    <div
                      key={entry.vaccine.id}
                      onClick={() => onVaccineClick && onVaccineClick(entry)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '12px 16px', cursor: isClickable ? 'pointer' : 'default',
                        borderLeft: `3px solid ${cfg.border}`, margin: '4px 12px',
                        background: cfg.bg, borderRadius: 8,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (isClickable) (e.currentTarget as HTMLDivElement).style.filter = 'brightness(0.97)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.filter = 'none';
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: cfg.dot,
                        flexShrink: 0, marginTop: 5,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A', fontFamily: 'DM Serif Display, serif' }}>
                            {entry.vaccine.name}
                          </span>
                          <VaccineStatusBadge status={entry.status} daysUntilDue={entry.daysUntilDue} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2, fontFamily: 'DM Sans, sans-serif' }}>
                          {entry.vaccine.full_name}
                        </div>
                        {entry.vaccine.diseases_prevented && (
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 3, fontFamily: 'DM Sans, sans-serif' }}>
                            Protects against: {entry.vaccine.diseases_prevented.join(', ')}
                          </div>
                        )}
                        {entry.vaccination?.administered_date && (
                          <div style={{ fontSize: '0.72rem', color: '#16A34A', marginTop: 4, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                            ✓ Administered: {format(new Date(entry.vaccination.administered_date), 'dd MMM yyyy')}
                            {entry.vaccination.batch_number && ` • Batch: ${entry.vaccination.batch_number}`}
                          </div>
                        )}
                        {entry.vaccination?.notes && (
                          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2, fontStyle: 'italic', fontFamily: 'DM Sans, sans-serif' }}>
                            "{entry.vaccination.notes}"
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
                          Due {format(entry.dueDate, 'dd MMM yy')}
                        </div>
                        {isDoctor && entry.status !== 'completed' && (
                          <div style={{
                            marginTop: 4, fontSize: '0.7rem', color: '#2563EB',
                            fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                          }}>
                            + Record
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniTag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      background: bg, color, fontSize: '0.65rem', fontWeight: 700,
      padding: '2px 7px', borderRadius: 999, fontFamily: 'DM Sans, sans-serif',
    }}>{label}</span>
  );
}
