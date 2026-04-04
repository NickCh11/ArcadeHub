'use client';

export type PresenceStatus = 'online' | 'away' | 'offline';

const STATUS_OPTIONS: Array<{
  value: PresenceStatus;
  label: string;
  hint: string;
  color: string;
}> = [
  { value: 'online', label: 'Online', hint: 'Ready to chat', color: '#22c55e' },
  { value: 'away', label: 'Away', hint: 'Heads down for a bit', color: '#f59e0b' },
  { value: 'offline', label: 'Offline', hint: 'Appear invisible', color: '#6b7280' },
];

interface StatusPickerProps {
  value: PresenceStatus;
  onChange: (status: PresenceStatus) => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export function getPresenceMeta(status: PresenceStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];
}

export function StatusPicker({ value, onChange, disabled = false, compact = false }: StatusPickerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
      {STATUS_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              padding: compact ? '8px 10px' : '10px 12px',
              borderRadius: compact ? 10 : 12,
              border: selected ? `1px solid ${option.color}` : '1px solid rgba(139,92,246,0.12)',
              background: selected ? 'rgba(139,92,246,0.12)' : 'rgba(12,12,28,0.72)',
              color: '#f1f0ff',
              cursor: disabled ? 'default' : 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: option.color,
                  boxShadow: `0 0 12px ${option.color}55`,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700 }}>{option.label}</div>
                {!compact && <div style={{ fontSize: 11, color: '#8f90ad', marginTop: 2 }}>{option.hint}</div>}
              </div>
            </div>
            {selected && (
              <span style={{ fontSize: 11, fontWeight: 700, color: option.color }}>
                Active
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
