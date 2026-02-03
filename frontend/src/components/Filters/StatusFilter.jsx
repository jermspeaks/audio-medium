import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PLAYING_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: '1', label: 'Not played' },
  { value: '2', label: 'In progress' },
  { value: '3', label: 'Completed' },
  { value: 'played', label: 'Played' },
];

const ALL_VALUE = '__all__';

export default function StatusFilter({ value, onChange }) {
  const selected = (value ?? '') || ALL_VALUE;
  return (
    <Select value={selected} onValueChange={(v) => onChange(v === ALL_VALUE ? '' : v)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
        {PLAYING_STATUS_OPTIONS.filter((o) => o.value !== '').map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
