import Link from "next/link";

const quickLinks = [
  {
    href: "/dealer/products",
    title: "商品目录",
    desc: "浏览上架商品与经销商专属批发价，直接加购",
  },
  {
    href: "/dealer/cart",
    title: "购物车",
    desc: "核对采购清单并提交订单",
  },
  {
    href: "/orders",
    title: "我的订单",
    desc: "查看订单状态与历史采购记录",
  },
  {
    href: "/dealer/company",
    title: "我的企业",
    desc: "企业信息、成员列表与邀请成员",
  },
  {
    href: "/dealer/apply",
    title: "经销商入驻",
    desc: "提交或查看经销商入驻申请",
  },
];

export default function DealerPortal() {
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Dealer Portal</p>
          <h1>经销商中心</h1>
          <p className="page-subtitle">
            欢迎！从这里进入商品目录采购、管理订单与企业信息。
          </p>
        </div>
      </div>

      <div className="quick-link-grid">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href} className="quick-link-card">
            <strong>{item.title}</strong>
            <span className="muted-text">{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
