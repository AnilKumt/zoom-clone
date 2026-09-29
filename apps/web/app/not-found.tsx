import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">404</h1>
      <p className="text-[var(--text-secondary)]">Page not found</p>
      <Link
        href="/home"
        className="text-[var(--zoom-blue)] hover:underline focus-visible:outline-[var(--zoom-blue)]"
      >
        Go to Home
      </Link>
    </div>
  );
}
