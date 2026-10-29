export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${className}`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
}
