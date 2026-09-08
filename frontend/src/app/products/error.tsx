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
      <p className="eyebrow">加载出错了</p>
      <h1>商品加载失败</h1>
      <p className="form-error">{error.message || "请稍后重试。"}</p>
      <button className="retry-button" type="button" onClick={reset}>
        重试
      </button>
    </section>
  );
}
