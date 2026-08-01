export function AdminError({ message, className }: { message: string | null; className?: string }) {
  if (!message) return null;

  return (
    <p role="alert" className={`rounded-card bg-danger-soft px-3 py-2 font-bold text-danger ${className ?? ""}`}>
      {message}
    </p>
  );
}
