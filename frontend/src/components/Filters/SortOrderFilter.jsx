import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const SORT_ORDER_OPTIONS = [
  { value: 'last_played', label: 'Date last played' },
  { value: 'published', label: 'Date published' },
  { value: 'created', label: 'Date added' },
  { value: 'title', label: 'Title A–Z' },
];

export default function SortOrderFilter({ value, onChange }) {
  const selected = value ?? 'last_played';
  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_ORDER_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
