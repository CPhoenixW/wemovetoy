"use client";

import { useCallback, useEffect, useState } from "react";
import { addToCart } from "@/lib/api/cart";
import { listDealerProducts } from "@/lib/api/products";
import type { DealerProduct, DealerVariant } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

const PAGE_SIZE = 20;

export default function DealerProductsPage() {
  const [products, setProducts] = useState<DealerProduct[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingVariant, setAddingVariant] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listDealerProducts({ limit: PAGE_SIZE, page, search });
      setProducts(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages ?? Math.ceil(data.total / PAGE_SIZE));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载商品失败");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // 搜索时回到第 1 页；搜索加防抖
  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  /** 加购直接使用目录内联的 variantId（服务端定价/库存校验） */
  async function handleAdd(product: DealerProduct, variant: DealerVariant) {
    setAddingVariant(variant.id);
    setFeedback(null);
    try {
      await addToCart(variant.id, 1);
      setFeedback({ ok: true, text: `${product.name} · ${variant.name} 已加入购物车` });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : "加购失败，请重试",
      });
    } finally {
      setAddingVariant(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Dealer Portal</p>
          <h1>商品目录</h1>
          <p className="page-subtitle">专属批发价 · 仅显示上架商品 · 价格与库存以服务端为准</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="搜索商品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? (
        <p className={feedback.ok ? "form-success" : "form-error"}>{feedback.text}</p>
      ) : null}

      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>没有匹配的商品</h3>
          <p>试试调整搜索关键词</p>
        </div>
      ) : (
        <div className="dealer-product-grid">
          {products.map((product) => (
            <div key={product.id} className="dealer-product-card">
              <div className="dealer-product-info">
                <div className="dealer-product-header">
                  <h3>{product.name}</h3>
                </div>
                <p className="dealer-product-desc">{product.shortDescription}</p>
                {product.category ? (
                  <span className="dealer-product-category">
                    分类：{product.category.name}
                  </span>
                ) : null}
                <div className="dealer-price-area">
                  <span className="dealer-price">
                    {formatPrice(product.dealerPrice)}
                    <span className="dealer-price-badge">经销商价</span>
                  </span>
                  <span className="dealer-price-original">
                    零售价 {formatPrice(product.retailPrice)}
                  </span>
                </div>
              </div>

              <div className="dealer-variant-list">
                {product.variants.length === 0 ? (
                  <p className="dealer-variant-empty">暂无可售 SKU</p>
                ) : (
                  product.variants.map((variant) => (
                    <div key={variant.id} className="dealer-variant-row">
                      <div className="dealer-variant-meta">
                        <span className="dealer-variant-name">
                          {variant.name}
                          <span className="dealer-variant-sku">（{variant.sku}）</span>
                        </span>
                        <span className="dealer-variant-price">
                          {formatPrice(variant.unitPrice)}
                          <span className="dealer-variant-stock">
                            {variant.isPurchasable
                              ? `库存 ${variant.availableStock}`
                              : "缺货"}
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-primary add-cart-btn"
                        disabled={!variant.isPurchasable || addingVariant === variant.id}
                        onClick={() => handleAdd(product, variant)}
                      >
                        {addingVariant === variant.id
                          ? "加购中..."
                          : variant.isPurchasable
                            ? "+ 加购"
                            : "缺货"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && products.length > 0 && totalPages > 1 ? (
        <div className="pagination">
          <button
            type="button"
            className="btn-secondary page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <span className="page-info">
            第 {page} / {totalPages} 页，共 {total} 条
          </span>
          <button
            type="button"
            className="btn-secondary page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一页
          </button>
        </div>
      ) : null}
    </div>
  );
}
