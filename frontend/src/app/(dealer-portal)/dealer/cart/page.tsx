"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart";
import { createOrder } from "@/lib/api/orders";
import type { Cart } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

export default function DealerCartPage() {
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
      setError(err instanceof Error ? err.message : "加载购物车失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeQuantity(itemId: number, next: number) {
    if (next < 1) return;
    setBusyItem(itemId);
    setError("");
    try {
      await updateCartItem(itemId, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "修改数量失败");
    } finally {
      setBusyItem(null);
    }
  }

  async function handleRemove(itemId: number) {
    setBusyItem(itemId);
    setError("");
    try {
      await removeCartItem(itemId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusyItem(null);
    }
  }

  async function handleCheckout() {
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
      await load(); // 下单成功后服务端已清空购物车
    } catch (err) {
      setError(err instanceof Error ? err.message : "下单失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  const hasUnavailable = cart?.items.some((i) => !i.isPurchasable) ?? false;
  const overStock = cart?.items.some((i) => i.quantity > i.availableStock) ?? false;
  const checkoutDisabled = hasUnavailable || overStock || submitting;

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Dealer Portal</p>
          <h1>购物车</h1>
          <p className="page-subtitle">价格与库存以服务端结算为准</p>
        </div>
        <Link href="/dealer/products" className="link-secondary">
          ← 继续选购
        </Link>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {orderNumber ? (
        <div className="order-success">
          <div className="empty-icon">✅</div>
          <h3>下单成功</h3>
          <p>
            订单号：<strong>{orderNumber}</strong>
          </p>
          <p>可在后台订单流程中查看处理进度。</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setOrderNumber(null)}
          >
            知道了
          </button>
        </div>
      ) : loading ? (
        <p className="page-loading">加载中...</p>
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState
          title="购物车是空的"
          description="去商品目录挑选需要批发的商品吧"
          action={
            <Link href="/dealer/products" className="btn-primary">
              去选购
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
                    <p className="cart-item-warn">该 SKU 已不可售，请移除</p>
                  ) : item.quantity > item.availableStock ? (
                    <p className="cart-item-warn">
                      超出可用库存（{item.availableStock}），请调整数量
                    </p>
                  ) : null}
                </div>
                <span className="cart-item-price">{formatPrice(item.unitPrice)}</span>
                <div className="cart-item-qty">
                  <button
                    type="button"
                    className="qty-btn"
                    aria-label="减少"
                    disabled={busyItem === item.id || item.quantity <= 1}
                    onClick={() => changeQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    aria-label="增加"
                    disabled={busyItem === item.id}
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
                  移除
                </button>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <h3>结算摘要</h3>
            <div className="summary-row">
              <span>商品件数</span>
              <span>{cart.itemCount}</span>
            </div>
            <div className="summary-row total">
              <span>合计</span>
              <span>{formatPrice(cart.totalAmount)}</span>
            </div>
            {hasUnavailable ? (
              <p className="cart-item-warn">存在不可售商品，请先处理</p>
            ) : null}
            {overStock ? (
              <p className="cart-item-warn">存在超出可用库存的商品，请调整数量</p>
            ) : null}
            <button
              type="button"
              className="btn-primary checkout-btn"
              disabled={checkoutDisabled}
              onClick={() => setCheckoutOpen(true)}
            >
              提交订单
            </button>
          </aside>
        </div>
      )}

      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="确认下单"
        confirmText={submitting ? "提交中..." : "确认提交订单"}
        cancelText="取消"
        confirmDisabled={submitting}
        onConfirm={handleCheckout}
      >
        <p className="modal-tip">
          收货信息选填，留空将使用账户资料；提交后价格与库存由服务端最终核定。
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
          label="备注（可选）"
          name="remark"
          as="textarea"
          value={shipping.remark}
          onChange={(e) => setShipping((s) => ({ ...s, remark: e.target.value }))}
        />
      </Modal>
    </div>
  );
}
