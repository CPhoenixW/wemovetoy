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

/** 公开商品详情页：选 SKU → 数量 → 加入购物车。游客/过期会话跳 /login?next=当前页。 */
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
      setError(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="add-to-cart-panel">
      <fieldset className="add-to-cart-fieldset" disabled={!hasStock}>
        <legend className="add-to-cart-panel__title">Select SKU</legend>
        <div className="variant-pick" role="radiogroup" aria-label="Variant">
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
                <span className="variant-pick__name">
                  {variant.name}
                  <span className="variant-pick__sku">（{variant.sku}）</span>
                </span>
                <span className="variant-pick__meta">
                  <span className="variant-pick__price">
                    {formatPrice(variant.price)}
                  </span>
                  <span className="variant-pick__availability">
                    {variant.isPurchasable ? "In stock" : "Out of stock"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {!hasStock ? (
        <p className="empty-state">No in-stock SKU available right now.</p>
      ) : (
        <div className="add-to-cart-panel__row">
          <div className="cart-item-qty" aria-label="Quantity">
            <button
              type="button"
              className="qty-btn"
              aria-label="Decrease"
              disabled={busy || qty <= 1}
              onClick={() => setQty((n) => Math.max(1, n - 1))}
            >
              −
            </button>
            <span className="qty-value" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              className="qty-btn"
              aria-label="Increase"
              disabled={busy}
              onClick={() => setQty((n) => n + 1)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="btn-primary add-cart-btn"
            disabled={busy}
            onClick={handleAdd}
          >
            {busy ? "Adding…" : "Add to cart"}
          </button>
        </div>
      )}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : added && selected ? (
        <div className="add-success" role="status">
          <p className="add-success__title">🛒 Added to cart</p>
          <p className="add-success__detail">
            {productName} · {selected.name} added to cart.
          </p>
          <Link href="/cart" className="btn-primary add-success__cta">
            🛒 View cart &amp; checkout
          </Link>
        </div>
      ) : null}
    </div>
  );
}
