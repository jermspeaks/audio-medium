import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PODCAST_FILTER_OPTIONS = [
  { value: '', label: 'All podcasts' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived only' },
  { value: 'ended', label: 'Ended only' },
];

const ALL_VALUE = '__all__';

export default function PodcastFilter({ value, onChange }) {
  const selected = (value ?? '') || ALL_VALUE;
  return (
    <Select value={selected} onValueChange={(v) => onChange(v === ALL_VALUE ? '' : v)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All podcasts</SelectItem>
        {PODCAST_FILTER_OPTIONS.filter((o) => o.value !== '').map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
