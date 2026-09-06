"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { addToCart, getCart } from "@/lib/api/cart";
import { getProductBySlug, listProducts } from "@/lib/api/products";
import type { Product } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

/**
 * TODO(依赖成员2): 分类接口（GET /categories）尚未提供，暂无分类筛选；
 * 经销商价边界（匿名可见 dealerPrice）由成员 2 在公开 API 修复中处理。
 */
export default function DealerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; error?: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listProducts({ status: "ACTIVE", limit: 100 }),
      getCart()
        .then((cart) => cart.items.reduce((sum, i) => sum + i.quantity, 0))
        .catch(() => 0),
    ])
      .then(([data, count]) => {
        if (cancelled) return;
        setProducts(data.items);
        setCartCount(count);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载商品失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q),
    );
  }, [products, search]);

  /** 加购必须用 variantId（服务端定价），通过商品详情获取可售 SKU */
  async function handleAddToCart(product: Product) {
    setAddingSlug(product.slug);
    try {
      const detail = await getProductBySlug(product.slug);
      const variant = detail.variants[0];
      if (!variant) {
        setPreview({ name: product.name, error: "该商品暂无可售 SKU，无法加购" });
        return;
      }
      await addToCart(variant.id, 1);
      setCartCount((prev) => prev + 1);
      setPreview({ name: product.name });
    } catch (err) {
      setPreview({
        name: product.name,
        error: err instanceof Error ? err.message : "加购失败，请重试",
      });
    } finally {
      setAddingSlug(null);
    }
  }

  return (
    <div>
      {/* 顶部：标题 + 购物车入口 */}
      <div className="page-header dealer-header">
        <div>
          <p className="eyebrow">Dealer Portal</p>
          <h1>商品目录</h1>
          <p className="page-subtitle">
            专属批发价 · 仅显示上架商品 · 当前购物车 {cartCount} 件
          </p>
        </div>
        <Link href="/dealer/cart" className="btn-primary cart-btn">
          🛒 购物车 ({cartCount})
        </Link>
      </div>

      {/* 工具栏：搜索 */}
      <div className="toolbar dealer-toolbar">
        <input
          type="text"
          placeholder="搜索商品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {/* 商品卡片网格 */}
      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>没有匹配的商品</h3>
          <p>试试调整搜索关键词</p>
        </div>
      ) : (
        <div className="dealer-product-grid">
          {filtered.map((product) => (
            <div key={product.id} className="dealer-product-card">
              <div className="dealer-product-info">
                <div className="dealer-product-header">
                  <h3>{product.name}</h3>
                  <StatusBadge status="active" label="上架中" />
                </div>
                <p className="dealer-product-desc">{product.shortDescription}</p>
                {product.categoryId != null ? (
                  <span className="dealer-product-category">
                    分类 #{product.categoryId}
                  </span>
                ) : null}
              </div>
              <div className="dealer-product-footer">
                <div className="dealer-product-price-area">
                  <span className="dealer-price-row label">经销商价</span>
                  <span className="dealer-price-row value">
                    {product.dealerPrice !== null ? (
                      <span className="dealer-price">
                        {formatPrice(product.dealerPrice)}
                        <span className="dealer-price-badge">专属</span>
                      </span>
                    ) : (
                      <span className="dealer-price muted">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </span>
                  <span className="dealer-price-row label original">零售价</span>
                  <span className="dealer-price-row value original">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-primary add-cart-btn"
                  disabled={addingSlug === product.slug}
                  onClick={() => handleAddToCart(product)}
                >
                  {addingSlug === product.slug ? "加购中..." : "+ 加入购物车"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 加购结果提示 Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="加购结果">
        {preview?.error ? (
          <p>
            <strong>{preview.name}</strong> 加购失败：{preview.error}
          </p>
        ) : (
          <p>
            <strong>{preview?.name}</strong> 已加入购物车。
          </p>
        )}
      </Modal>
    </div>
  );
}
