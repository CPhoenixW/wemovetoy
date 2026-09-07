/**
 * 购物车变更事件：加购 / 改量 / 移除 / 下单成功后广播，
 * 公共头部 SiteHeader 订阅后刷新购物车数量徽标（无需引入全局状态库）。
 */
export const CART_UPDATED_EVENT = "wemove:cart-updated";

export function notifyCartUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}
