"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  mockCartItems,
  calculateCartTotal,
  calculateCartCount,
  getItemUnitPrice,
  type CartItem,
} from "@/lib/mocks/cart";
import { formatPrice } from "@/lib/mocks/products";

export default function DealerCartPage() {
  const [items, setItems] = useState<CartItem[]>(mockCartItems);
  const [pendingRemove, setPendingRemove] = useState<CartItem | null>(null);

  const total = useMemo(() => calculateCartTotal(items), [items]);
  const count = useMemo(() => calculateCartCount(items), [items]);

  function updateQty(productId: number, delta: number) {
    setItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function handleConfirmRemove() {
    if (!pendingRemove) return;
    setItems((prev) => prev.filter((i) => i.product.id !== pendingRemove.product.id));
    setPendingRemove(null);
  }

  function handleCheckout() {
    alert("Mock：跳转到结算页，提交订单...");
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

      <div className="cart-layout">
        {/* 左侧：购物车列表 */}
        <div className="cart-items">
          {items.map((item) => {
            const unitPrice = getItemUnitPrice(item);
            const subtotal = unitPrice * item.quantity;
            return (
              <div key={item.product.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">
                    {item.product.name}
                    {item.product.dealerPrice !== null ? (
                      <span className="dealer-price-badge">专属价</span>
                    ) : null}
                  </div>
                  <div className="cart-item-desc">{item.product.shortDescription}</div>
                  {item.product.category ? (
                    <span className="cart-item-category">{item.product.category.name}</span>
                  ) : null}
                </div>

                <div className="cart-item-price-col">
                  <div className="cart-item-unit">
                    <span className="label">单价</span>
                    <span className="value">
                      {item.product.dealerPrice !== null ? (
                        <span className="dealer-price">{formatPrice(unitPrice)}</span>
                      ) : (
                        formatPrice(unitPrice)
                      )}
                    </span>
                  </div>
                  {item.product.dealerPrice !== null ? (
                    <div className="cart-item-unit original">
                      <span className="label">零售价</span>
                      <span className="value">
                        <span className="original-price">{formatPrice(item.product.price)}</span>
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="cart-item-qty">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => updateQty(item.product.id, -1)}
                  >
                    −
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => updateQty(item.product.id, 1)}
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
          <div className="summary-row">
            <span>
              {items.some((i) => i.product.dealerPrice !== null)
                ? "经销商价优惠"
                : "小计"}
            </span>
            <span>
              {items.some((i) => i.product.dealerPrice !== null)
                ? `已享优惠`
                : formatPrice(total)}
            </span>
          </div>
          <div className="summary-divider" />
          <div className="summary-row total">
            <span>合计</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button
            type="button"
            className="btn-primary checkout-btn"
            onClick={handleCheckout}
          >
            提交订单
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
        confirmText="移除"
        confirmVariant="danger"
        onConfirm={handleConfirmRemove}
      >
        <p>
          确定要从购物车中移除 <strong>{pendingRemove?.product.name}</strong> 吗？
        </p>
      </Modal>
    </div>
  );
}
