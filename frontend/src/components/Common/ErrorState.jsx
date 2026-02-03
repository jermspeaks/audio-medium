export default function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
      {message}
    </div>
  );
}
