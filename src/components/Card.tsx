import { useId, type ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {title && (
        <h2
          id={headingId}
          className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
