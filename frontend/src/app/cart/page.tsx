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
      setError(err instanceof Error ? err.message : "购物车加载失败");
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
      setError(err instanceof Error ? err.message : "数量更新失败");
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
      setError(err instanceof Error ? err.message : "移除失败");
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
        err instanceof Error ? err.message : "下单失败";
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
          <p className="eyebrow">商城</p>
          <h1>购物车</h1>
        </div>
        <Link href="/products" className="link-secondary">
          ← 继续购物
        </Link>
      </div>

      {error && cart ? <p className="form-error">{error}</p> : null}

      {orderNumber ? (
        <div className="order-success">
          <div className="empty-icon">✅</div>
          <h3>下单成功</h3>
          <p>
            订单号：<strong className="tnum">{orderNumber}</strong>
          </p>
          <p>感谢购买！订单追踪将在后续版本上线。</p>
          <div className="empty-action">
            <Link href="/orders" className="btn-secondary">
              查看我的订单
            </Link>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setOrderNumber(null)}
            >
              好的
            </button>
          </div>
        </div>
      ) : loading ? (
        <p className="page-loading">加载中…</p>
      ) : error && !cart ? (
        <div className="cart-error">
          <p className="form-error">{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={load}>
              重试
            </button>
            <Link href="/products" className="btn-primary">
              去逛逛
            </Link>
          </div>
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState
          title="购物车是空的"
          description="去目录里挑一件喜欢的吧。"
          action={
            <Link href="/products" className="btn-primary">
              去逛逛
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
                      该 SKU 已不可购买，请先移除。
                    </p>
                  ) : item.quantity > item.availableStock ? (
                    <p className="cart-item-warn">
                      超出可用库存（<span className="tnum">{item.availableStock}</span>）——请调整数量。
                    </p>
                  ) : null}
                </div>
                <span className="cart-item-price tnum">
                  {formatPrice(item.unitPrice)}
                </span>
                <div className="cart-item-qty" aria-label="数量">
                  <button
                    type="button"
                    className="qty-btn"
                    aria-label="减少数量"
                    disabled={busyItem === item.id || item.quantity <= 1}
                    onClick={() => changeQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="qty-value tnum">{item.quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    aria-label="增加数量"
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
                <span className="cart-item-subtotal tnum">
                  {formatPrice(item.subtotal)}
                </span>
                <button
                  type="button"
                  className="link-danger remove-btn"
                  disabled={busyItem === item.id}
                  onClick={() => handleRemove(item.id)}
                >
                  移除
                </button>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <h3>订单摘要</h3>
            <div className="summary-row">
              <span>件数</span>
              <span className="tnum">{cart.itemCount}</span>
            </div>
            <div className="summary-row total">
              <span>合计</span>
              <span className="tnum">{formatPrice(cart.totalAmount)}</span>
            </div>
            {hasUnavailable ? (
              <p className="cart-item-warn">
                部分商品已不可购买，请在结算前处理。
              </p>
            ) : null}
            {overStock ? (
              <p className="cart-item-warn">
                部分商品超出可用库存，请调整数量。
              </p>
            ) : null}
            <p className="checkout-note">
              结算时，价格与库存将由服务器实际数据再次确认。
            </p>
            <button
              type="button"
              className="btn-primary checkout-btn"
              disabled={checkoutDisabled}
              onClick={() => setCheckoutOpen(true)}
            >
              去结算
            </button>
          </aside>
        </div>
      )}

      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="确认下单"
        confirmText={submitting ? "正在下单…" : "提交订单"}
        cancelText="取消"
        confirmDisabled={submitting}
        onConfirm={handleCheckout}
      >
        <p className="modal-tip">
          收货信息选填。提交订单时价格与库存会由服务器重新校验。
        </p>
        <FormField
          label="收货人"
          name="shippingName"
          value={shipping.shippingName}
          onChange={(e) =>
            setShipping((s) => ({ ...s, shippingName: e.target.value }))
          }
        />
        <FormField
          label="联系电话"
          name="shippingPhone"
          value={shipping.shippingPhone}
          onChange={(e) =>
            setShipping((s) => ({ ...s, shippingPhone: e.target.value }))
          }
        />
        <FormField
          label="收货地址"
          name="shippingAddress"
          value={shipping.shippingAddress}
          onChange={(e) =>
            setShipping((s) => ({ ...s, shippingAddress: e.target.value }))
          }
        />
        <FormField
          label="备注（选填）"
          name="remark"
          as="textarea"
          value={shipping.remark}
          onChange={(e) => setShipping((s) => ({ ...s, remark: e.target.value }))}
        />
      </Modal>
    </section>
  );
}
