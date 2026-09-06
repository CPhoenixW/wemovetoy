import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-shell">
      <p className="eyebrow">Not found</p>
      <h1>Product not found</h1>
      <p className="back-link">
        <Link href="/products">← Back to products</Link>
      </p>
    </section>
  );
}
