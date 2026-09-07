"use client";

import Link from "next/link";

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="page-shell">
      <p className="eyebrow">Something went wrong</p>
      <h1>Unable to load this product</h1>
      <p className="form-error">{error.message || "Please try again later."}</p>
      <button className="retry-button" type="button" onClick={reset}>
        Try again
      </button>
      <p className="back-link">
        <Link href="/products">← Back to products</Link>
      </p>
    </section>
  );
}
