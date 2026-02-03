import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SearchBar({ initialQuery = '', placeholder = 'Search podcasts and episodes...' }) {
  const [q, setQ] = useState(initialQuery);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl">
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
