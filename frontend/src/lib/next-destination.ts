// 登录/注册页“去向提示”：把 ?next= 的内部路径翻译成用户可读去向。
// 仅展示层用途；实际跳转仍由 safeNextPath + 角色默认路由决定。

export function nextDestinationLabel(next: string): string {
  if (next === "/products") return "商品列表";
  if (next.startsWith("/products/")) return "你刚才浏览的商品详情";
  if (next === "/cart") return "购物车";
  if (next === "/orders") return "我的订单";
  if (next.startsWith("/orders/")) return "该订单的详情页";
  if (next === "/dealer/apply") return "经销商申请页";
  if (next === "/about") return "品牌介绍页";
  if (next === "/") return "首页";
  return "你原来的页面";
}
