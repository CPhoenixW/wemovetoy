export default function Loading() {
  return (
    <section aria-busy="true" className="page-shell">
      <p className="eyebrow">Catalog</p>
      <h1>Products</h1>
      <div aria-label="Loading products" className="product-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="product-card" key={index}>
            <div className="skeleton skeleton--price" />
            <div className="skeleton skeleton--name" />
            <div className="skeleton skeleton--desc" />
          </div>
        ))}
      </div>
    </section>
  );
}
