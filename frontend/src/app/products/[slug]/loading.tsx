export default function Loading() {
  return (
    <section aria-busy="true" className="page-shell">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--block" />
    </section>
  );
}
