'use client';

export default function Error({ reset }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-6xl flex-col items-center gap-4 p-12 text-center"
    >
      <p className="text-muted-foreground">
        A apărut o eroare. Te rugăm să încerci din nou.
      </p>
      <button
        onClick={reset}
        className="text-sm underline underline-offset-4 hover:text-foreground"
      >
        Reîncearcă
      </button>
    </div>
  );
}
