import { useMemo, useEffect } from 'react';

const COLOR_KEYS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
];

function getComputedColor(name) {
  if (typeof document === 'undefined') return null;
  const el = document.documentElement;
  const value = getComputedStyle(el).getPropertyValue(`--${name}`).trim();
  return value || null;
}

function ColorSwatch({ name }) {
  const value = useMemo(() => getComputedColor(name), [name]);
  const isForeground = name.includes('foreground') || name === 'foreground' || name === 'ring' || name === 'input' || name === 'border';
  const bgClass = isForeground ? 'bg-muted' : `bg-[var(--${name})]`;
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className={`h-20 ${bgClass} border-b border-border`} />
      <div className="p-3 text-sm">
        <div className="font-medium text-foreground">{name}</div>
        {value && <div className="text-muted-foreground font-mono text-xs mt-1 break-all">{value}</div>}
      </div>
    </div>
  );
}

export default function ColophonPage() {
  useEffect(() => {
    document.title = 'Colophon | Audiophile';
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Colophon</h1>
      <p className="text-muted-foreground">Design system colors (CSS variables).</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {COLOR_KEYS.map((key) => (
          <ColorSwatch key={key} name={key} />
        ))}
      </div>
    </div>
  );
}
