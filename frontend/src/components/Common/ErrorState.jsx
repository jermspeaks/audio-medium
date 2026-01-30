export default function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-800 dark:text-red-200">
      {message}
    </div>
  );
}
