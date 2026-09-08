"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { addToCart } from "@/lib/api/cart";
import { getToken } from "@/lib/api/auth";
import { notifyCartUpdated } from "@/lib/cart-events";
import type { ProductVariant } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

interface AddToCartPanelProps {
  productName: string;
  variants: ProductVariant[];
}

/**
 * 公开商品详情页购买面板：
 * 价格 → 选择规格（名称/价格/有货·缺货，SKU 降为辅助）→ 库存提示 → 规格编号 → 数量 → 加入购物车。
 * 游客/过期会话跳 /login?next=当前页。
 */
export function AddToCartPanel({ productName, variants }: AddToCartPanelProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const first = variants.find((v) => v.isPurchasable);
    return first ? first.id : null;
  });
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const hasStock = variants.some((v) => v.isPurchasable);
  // 全缺货（无默认选中项）时，顶部价格回退展示首个 SKU 的价格
  const priceSource = selected ?? variants[0] ?? null;

  function returnToLogin() {
    const target = window.location.pathname + window.location.search;
    router.push(`/login?next=${encodeURIComponent(target)}`);
  }

  async function handleAdd() {
    if (busy || !selected || !selected.isPurchasable) return;
    if (!getToken()) {
      returnToLogin();
      return;
    }
    setBusy(true);
    setAdded(false);
    setError("");
    try {
      await addToCart(selected.id, qty);
      notifyCartUpdated();
      setAdded(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // apiRequest 已清除本地 token；引导重新登录后回跳当前详情页
        returnToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "加入购物车失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="add-to-cart-panel">
      {priceSource ? (
        <p className="buy-box__price tnum">{formatPrice(priceSource.price)}</p>
      ) : null}

      <fieldset className="add-to-cart-fieldset" disabled={!hasStock}>
        <legend className="add-to-cart-panel__title">选择规格</legend>
        <div className="variant-pick" role="radiogroup" aria-label="规格">
          {variants.map((variant) => {
            const active = selectedId === variant.id;
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!variant.isPurchasable}
                className={
                  active
                    ? "variant-pick__option is-selected"
                    : "variant-pick__option"
                }
                onClick={() => {
                  setSelectedId(variant.id);
                  setAdded(false);
                  setError("");
                }}
              >
                <span className="variant-pick__name">{variant.name}</span>
                <span className="variant-pick__meta">
                  <span className="variant-pick__price tnum">
                    {formatPrice(variant.price)}
                  </span>
                  <span
                    className={`variant-pick__availability ${
                      variant.isPurchasable ? "is-in" : "is-out"
                    }`}
                  >
                    {variant.isPurchasable ? "有货" : "缺货"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {!hasStock ? (
        <p className="empty-state">目前没有可售规格。</p>
      ) : selected ? (
        <>
          <p
            className={`buy-box__stock ${
              selected.isPurchasable ? "is-in" : "is-out"
            }`}
          >
            {selected.isPurchasable ? "现货有货，可加入购物车" : "当前规格缺货"}
          </p>
          <p className="buy-box__sku">
            规格编号：<span className="mono">{selected.sku}</span>
          </p>

          <div className="buy-box__actions">
            <div className="buy-box__qty">
              <span className="buy-box__label">数量</span>
              <div className="cart-item-qty" aria-label="数量">
                <button
                  type="button"
                  className="qty-btn"
                  aria-label="减少数量"
                  disabled={busy || qty <= 1}
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                >
                  −
                </button>
                <span className="qty-value tnum" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  className="qty-btn"
                  aria-label="增加数量"
                  disabled={busy}
                  onClick={() => setQty((n) => n + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn-primary add-cart-btn buy-box__cta"
              disabled={busy}
              onClick={handleAdd}
            >
              {busy ? "正在加入…" : "加入购物车"}
            </button>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : added && selected ? (
        <div className="add-success" role="status">
          <p className="add-success__title">🛒 已加入购物车</p>
          <p className="add-success__detail">
            已将「{productName} · {selected.name}」加入购物车。
          </p>
          <Link href="/cart" className="btn-primary add-success__cta">
            🛒 查看购物车并结算
          </Link>
        </div>
      ) : null}
    </div>
  );
}
