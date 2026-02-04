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

export const PODCAST_EPISODES_SORT_OPTIONS = [
  { value: 'newest', label: 'Most recent published' },
  { value: 'oldest', label: 'Oldest published' },
  { value: 'last_played', label: 'Last played' },
  { value: 'oldest_played', label: 'Oldest played' },
];

export default function SortOrderFilter({ value, onChange, options }) {
  const opts = options ?? SORT_ORDER_OPTIONS;
  const selected = value ?? opts[0]?.value ?? 'last_played';
  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opts.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
