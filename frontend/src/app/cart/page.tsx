"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart";
import { createOrder } from "@/lib/api/orders";
import { notifyCartUpdated } from "@/lib/cart-events";
import type { Cart } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";

/** 普通用户（公开店）购物车与结算。价格/库存/下单均以服务端为准。 */
export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [shipping, setShipping] = useState({
    shippingName: "",
    shippingPhone: "",
    shippingAddress: "",
    remark: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCart(await getCart());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // apiRequest 已清除本地 token；引导登录后回到购物车
        router.replace(`/login?next=${encodeURIComponent("/cart")}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeQuantity(itemId: number, next: number) {
    if (next < 1) return;
    setBusyItem(itemId);
    setError("");
    try {
      await updateCartItem(itemId, next);
      notifyCartUpdated();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity");
    } finally {
      setBusyItem(null);
    }
  }

  async function handleRemove(itemId: number) {
    setBusyItem(itemId);
    setError("");
    try {
      await removeCartItem(itemId);
      notifyCartUpdated();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    } finally {
      setBusyItem(null);
    }
  }

  async function handleCheckout() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const order = await createOrder({
        shippingName: shipping.shippingName.trim() || undefined,
        shippingPhone: shipping.shippingPhone.trim() || undefined,
        shippingAddress: shipping.shippingAddress.trim() || undefined,
        remark: shipping.remark.trim() || undefined,
      });
      setCheckoutOpen(false);
      setOrderNumber(order.orderNumber);
      notifyCartUpdated();
      await load(); // 下单成功服务端已清空购物车
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setCheckoutOpen(false);
        router.replace(`/login?next=${encodeURIComponent("/cart")}`);
        return;
      }
      setCheckoutOpen(false);
      const message =
        err instanceof Error ? err.message : "Failed to place order";
      // 服务端 400（库存/不可售/空车）时重载购物车，让行内降级态显现
      await load();
      setError(cart?.items.length ? message : "");
    } finally {
      setSubmitting(false);
    }
  }

  const hasUnavailable = cart?.items.some((i) => !i.isPurchasable) ?? false;
  const overStock =
    cart?.items.some((i) => i.quantity > i.availableStock) ?? false;
  const checkoutDisabled = hasUnavailable || overStock || submitting;

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Storefront</p>
          <h1>Your Cart</h1>
          <p className="page-subtitle">
            Retail pricing · prices &amp; stock are finalized server-side
          </p>
        </div>
        <Link href="/products" className="link-secondary">
          ← Continue shopping
        </Link>
      </div>

      {error && cart ? <p className="form-error">{error}</p> : null}

      {orderNumber ? (
        <div className="order-success">
          <div className="empty-icon">✅</div>
          <h3>Order placed</h3>
          <p>
            Order number: <strong>{orderNumber}</strong>
          </p>
          <p>Thank you! Order tracking will be available in a future release.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setOrderNumber(null)}
          >
            OK
          </button>
        </div>
      ) : loading ? (
        <p className="page-loading">Loading…</p>
      ) : error && !cart ? (
        <div className="cart-error">
          <p className="form-error">{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={load}>
              Retry
            </button>
            <Link href="/products" className="btn-primary">
              Browse products
            </Link>
          </div>
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Browse the catalog to find something you like."
          action={
            <Link href="/products" className="btn-primary">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.productName}</p>
                  <p className="cart-item-variant">
                    {item.variantName}（{item.sku}）
                  </p>
                  {!item.isPurchasable ? (
                    <p className="cart-item-warn">
                      This SKU is no longer purchasable — please remove it.
                    </p>
                  ) : item.quantity > item.availableStock ? (
                    <p className="cart-item-warn">
                      Over available stock ({item.availableStock}) — adjust
                      quantity.
                    </p>
                  ) : null}
                </div>
                <span className="cart-item-price">
                  {formatPrice(item.unitPrice)}
                </span>
                <div className="cart-item-qty">
                  <button
                    type="button"
                    className="qty-btn"
                    aria-label="Decrease"
                    disabled={busyItem === item.id || item.quantity <= 1}
                    onClick={() => changeQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    aria-label="Increase"
                    disabled={
                      busyItem === item.id ||
                      !item.isPurchasable ||
                      item.quantity >= item.availableStock
                    }
                    onClick={() => changeQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <span className="cart-item-subtotal">
                  {formatPrice(item.subtotal)}
                </span>
                <button
                  type="button"
                  className="link-danger remove-btn"
                  disabled={busyItem === item.id}
                  onClick={() => handleRemove(item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <h3>Summary</h3>
            <div className="summary-row">
              <span>Items</span>
              <span>{cart.itemCount}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(cart.totalAmount)}</span>
            </div>
            {hasUnavailable ? (
              <p className="cart-item-warn">
                Some items are unavailable — please review before checkout.
              </p>
            ) : null}
            {overStock ? (
              <p className="cart-item-warn">
                Some items exceed available stock — please adjust quantity.
              </p>
            ) : null}
            <button
              type="button"
              className="btn-primary checkout-btn"
              disabled={checkoutDisabled}
              onClick={() => setCheckoutOpen(true)}
            >
              Checkout
            </button>
          </aside>
        </div>
      )}

      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Checkout"
        confirmText={submitting ? "Placing…" : "Place order"}
        cancelText="Cancel"
        confirmDisabled={submitting}
        onConfirm={handleCheckout}
      >
        <p className="modal-tip">
          Shipping details are optional. Prices &amp; stock are re-validated by
          the server when you place the order.
        </p>
        <FormField
          label="Recipient"
          name="shippingName"
          value={shipping.shippingName}
          onChange={(e) =>
            setShipping((s) => ({ ...s, shippingName: e.target.value }))
          }
        />
        <FormField
          label="Phone"
          name="shippingPhone"
          value={shipping.shippingPhone}
          onChange={(e) =>
            setShipping((s) => ({ ...s, shippingPhone: e.target.value }))
          }
        />
        <FormField
          label="Address"
          name="shippingAddress"
          value={shipping.shippingAddress}
          onChange={(e) =>
            setShipping((s) => ({ ...s, shippingAddress: e.target.value }))
          }
        />
        <FormField
          label="Remark (optional)"
          name="remark"
          as="textarea"
          value={shipping.remark}
          onChange={(e) => setShipping((s) => ({ ...s, remark: e.target.value }))}
        />
      </Modal>
    </section>
  );
}
