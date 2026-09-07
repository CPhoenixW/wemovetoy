"use client";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="page-shell">
      <p className="eyebrow">Something went wrong</p>
      <h1>Unable to load products</h1>
      <p className="form-error">{error.message || "Please try again later."}</p>
      <button className="retry-button" type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
