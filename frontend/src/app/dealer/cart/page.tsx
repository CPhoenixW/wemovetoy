"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart";
import { createOrder } from "@/lib/api/orders";
import type { CartItem } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

/**
 * TODO(依赖成员3): 后端 GET /cart 目前只返回 variantId + unitPrice（无商品
 * 名称/图片），由成员 3 注入成员 2 的 SKU Service 后可补齐；届时替换展示。
 */
export default function DealerCartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingRemove, setPendingRemove] = useState<CartItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCart()
      .then((cart) => {
        if (!cancelled) setItems(cart.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载购物车失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  async function refreshCart() {
    const cart = await getCart();
    setItems(cart.items);
  }

  async function changeQty(item: CartItem, delta: number) {
    const nextQty = item.quantity + delta;
    setError("");
    if (nextQty <= 0) {
      setPendingRemove(item);
      return;
    }
    try {
      const updated = await updateCartItem(item.id, nextQty);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新数量失败");
    }
  }

  async function handleConfirmRemove() {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await removeCartItem(pendingRemove.id);
      setItems((prev) => prev.filter((i) => i.id !== pendingRemove.id));
      setPendingRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setRemoving(false);
    }
  }

  /** 提交订单：后端从当前购物车创建订单并清空购物车 */
  async function handleCheckout() {
    setCheckoutLoading(true);
    setError("");
    try {
      const order = await createOrder();
      setOrderNumber(order.orderNumber);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交订单失败");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <p className="eyebrow">Dealer Portal</p>
            <h1>购物车</h1>
          </div>
        </div>
        <p className="page-loading">加载中...</p>
      </div>
    );
  }

  if (orderNumber) {
    return (
      <div>
        <div className="page-header">
          <div>
            <p className="eyebrow">Dealer Portal</p>
            <h1>下单成功</h1>
          </div>
        </div>
        <EmptyState
          title="订单已提交"
          description={`订单号 ${orderNumber}，我们已收到你的订单。`}
          action={
            <Link href="/dealer/products" className="btn-primary">
              继续购物
            </Link>
          }
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <p className="eyebrow">Dealer Portal</p>
            <h1>购物车</h1>
          </div>
        </div>
        <EmptyState
          title="购物车是空的"
          description="去商品目录挑选喜欢的商品吧"
          action={
            <Link href="/dealer/products" className="btn-primary">
              去逛逛
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Dealer Portal</p>
          <h1>购物车</h1>
          <p className="page-subtitle">共 {count} 件商品</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="cart-layout">
        {/* 左侧：购物车列表 */}
        <div className="cart-items">
          {items.map((item) => {
            const unitPrice = Number(item.unitPrice);
            const subtotal = unitPrice * item.quantity;
            return (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">SKU #{item.variantId}</div>
                  <div className="cart-item-desc">由服务端按经销商价定价</div>
                </div>

                <div className="cart-item-price-col">
                  <div className="cart-item-unit">
                    <span className="label">单价</span>
                    <span className="value">{formatPrice(unitPrice)}</span>
                  </div>
                </div>

                <div className="cart-item-qty">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => changeQty(item, -1)}
                  >
                    −
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => changeQty(item, 1)}
                  >
                    +
                  </button>
                </div>

                <div className="cart-item-subtotal">
                  <span className="label">小计</span>
                  <span className="value">{formatPrice(subtotal)}</span>
                </div>

                <button
                  type="button"
                  className="link-danger remove-btn"
                  onClick={() => setPendingRemove(item)}
                >
                  删除
                </button>
              </div>
            );
          })}
        </div>

        {/* 右侧：结算摘要 */}
        <div className="cart-summary">
          <h3>订单摘要</h3>
          <div className="summary-row">
            <span>商品数量</span>
            <span>{count} 件</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-row total">
            <span>合计</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button
            type="button"
            className="btn-primary checkout-btn"
            disabled={checkoutLoading}
            onClick={handleCheckout}
          >
            {checkoutLoading ? "提交中..." : "提交订单"}
          </button>
          <Link href="/dealer/products" className="link-secondary continue-link">
            ← 继续购物
          </Link>
        </div>
      </div>

      {/* 删除确认 */}
      <Modal
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        title="确认移除"
        confirmText={removing ? "移除中..." : "移除"}
        confirmVariant="danger"
        onConfirm={handleConfirmRemove}
      >
        <p>
          确定要从购物车中移除 <strong>SKU #{pendingRemove?.variantId}</strong> 吗？
        </p>
      </Modal>
    </div>
  );
}
