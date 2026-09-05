// 对齐后端 DealerApplication + DealerApplicationStatus
export interface MockDealerApplication {
  id: number;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  companyAddress: string;
  businessLicense: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export const mockDealerApplications: MockDealerApplication[] = [
  {
    id: 1,
    companyName: "北京乐活体育用品有限公司",
    contactEmail: "contact@lehuo-sport.cn",
    contactPhone: "13800138001",
    companyAddress: "北京市朝阳区建国路 88 号",
    businessLicense: "91110105MA00ABCDE1",
    status: "PENDING",
    reviewNote: null,
    reviewerName: null,
    reviewedAt: null,
    createdAt: "2026-09-03T09:15:00Z",
  },
  {
    id: 2,
    companyName: "上海童趣贸易商行",
    contactEmail: "sarah@tongqu-sh.com",
    contactPhone: "13900139002",
    companyAddress: "上海市浦东新区张江高科技园区",
    businessLicense: "91310115MA00XYZ7F2",
    status: "PENDING",
    reviewNote: null,
    reviewerName: null,
    reviewedAt: null,
    createdAt: "2026-09-03T14:30:00Z",
  },
  {
    id: 3,
    companyName: "深圳运动达人连锁",
    contactEmail: "ceo@sportmaster.cn",
    contactPhone: "13700137003",
    companyAddress: "深圳市南山区科技园南区",
    businessLicense: "91440300MA00GHIJ53",
    status: "APPROVED",
    reviewNote: "资质齐全，已通过审核。",
    reviewerName: "admin",
    reviewedAt: "2026-09-04T10:00:00Z",
    createdAt: "2026-09-01T08:00:00Z",
  },
  {
    id: 4,
    companyName: "广州欢乐玩具批发",
    contactEmail: "gm@gz-happy-toy.com",
    contactPhone: "13600136004",
    companyAddress: "广州市白云区玩具批发市场",
    businessLicense: "91440111MA00LMNO64",
    status: "REJECTED",
    reviewNote: "营业执照过期，请更新后重新提交。",
    reviewerName: "admin",
    reviewedAt: "2026-09-04T16:20:00Z",
    createdAt: "2026-09-02T11:45:00Z",
  },
  {
    id: 5,
    companyName: "成都亲子运动馆",
    contactEmail: "book@cd-family-sport.cn",
    contactPhone: "13500135005",
    companyAddress: "成都市锦江区春熙路商圈",
    businessLicense: "91510104MA00QRST75",
    status: "PENDING",
    reviewNote: null,
    reviewerName: null,
    reviewedAt: null,
    createdAt: "2026-09-05T08:00:00Z",
  },
];

// 状态 → Badge 映射
export const dealerStatusMap: Record<string, { status: string; label: string }> = {
  PENDING: { status: "pending", label: "待审核" },
  APPROVED: { status: "approved", label: "已通过" },
  REJECTED: { status: "rejected", label: "已拒绝" },
};

// 格式化时间
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}
