"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import {
  mockProducts,
  formatPrice,
  type MockProduct,
} from "@/lib/mocks/products";

const CATEGORIES = [
  { id: "ALL", name: "全部" },
  { id: "户外玩具", name: "户外玩具" },
  { id: "极限运动", name: "极限运动" },
  { id: "遥控玩具", name: "遥控玩具" },
];

export default function DealerProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [cart, setCart] = useState<Map<number, { product: MockProduct; qty: number }>>(new Map());
  const [cartPreview, setCartPreview] = useState<MockProduct | null>(null);

  // 只显示上架商品 + 搜索/分类过滤
  const filtered = useMemo(() => {
    return mockProducts.filter((p) => {
      if (p.status !== "ACTIVE") return false;
      if (category !== "ALL" && p.category?.name !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, category]);

  const cartCount = cart.size;
  const cartTotal = useMemo(() => {
    let total = 0;
    cart.forEach((item) => {
      total += item.product.dealerPrice ?? item.product.price;
    });
    return total;
  }, [cart]);

  function addToCart(product: MockProduct) {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      if (existing) {
        next.set(product.id, { ...existing, qty: existing.qty + 1 });
      } else {
        next.set(product.id, { product, qty: 1 });
      }
      return next;
    });
    setCartPreview(product);
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
        <button
          type="button"
          className="btn-primary cart-btn"
          onClick={() => alert(`购物车：${cartCount} 件，小计 ${formatPrice(cartTotal)}`)}
        >
          🛒 购物车 ({cartCount})
        </button>
      </div>

      {/* 工具栏：搜索 + 分类 */}
      <div className="toolbar dealer-toolbar">
        <input
          type="text"
          placeholder="搜索商品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="filter-tabs dealer-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`filter-tab ${category === cat.id ? "active" : ""}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 商品卡片网格 */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>没有匹配的商品</h3>
          <p>试试调整搜索关键词或分类筛选</p>
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
                {product.category ? (
                  <span className="dealer-product-category">{product.category.name}</span>
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
                      <span className="dealer-price muted">{formatPrice(product.price)}</span>
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
                  onClick={() => addToCart(product)}
                >
                  + 加入购物车
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 加购成功提示 Modal */}
      <Modal
        open={!!cartPreview}
        onClose={() => setCartPreview(null)}
        title="已加入购物车"
      >
        <p>
          <strong>{cartPreview?.name}</strong> 已加入购物车。
          {cartPreview && cartPreview.dealerPrice !== null
            ? `享受经销商价 ${formatPrice(cartPreview.dealerPrice)}。`
            : "该商品暂无经销商专属价格。"}
        </p>
      </Modal>
    </div>
  );
}
