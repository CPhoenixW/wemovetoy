export default function Loading() {
  return (
    <section aria-busy="true" className="page-shell">
      <p className="eyebrow">商品目录</p>
      <h1>全部商品</h1>
      <div aria-label="商品加载中" className="product-grid">
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
