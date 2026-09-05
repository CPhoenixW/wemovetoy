"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import {
  mockDealerApplications,
  dealerStatusMap,
  formatDate,
  type MockDealerApplication,
} from "@/lib/mocks/dealers";

const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "全部" },
  { key: "PENDING", label: "待审核" },
  { key: "APPROVED", label: "已通过" },
  { key: "REJECTED", label: "已拒绝" },
];

export default function AdminDealersPage() {
  const [applications, setApplications] = useState<MockDealerApplication[]>(
    mockDealerApplications,
  );
  const [filter, setFilter] = useState("ALL");
  const [reviewTarget, setReviewTarget] = useState<MockDealerApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const filtered = useMemo(() => {
    if (filter === "ALL") return applications;
    return applications.filter((a) => a.status === filter);
  }, [applications, filter]);

  const columns: Column<MockDealerApplication>[] = [
    { key: "id", header: "#", className: "col-id" },
    {
      key: "companyName",
      header: "公司名称",
      render: (row) => (
        <div>
          <div className="company-name">{row.companyName}</div>
          <div className="company-contact">{row.contactEmail}</div>
        </div>
      ),
    },
    { key: "contactPhone", header: "电话" },
    {
      key: "status",
      header: "状态",
      render: (row) => {
        const s = dealerStatusMap[row.status];
        return <StatusBadge status={s.status} label={s.label} />;
      },
    },
    {
      key: "createdAt",
      header: "申请时间",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "reviewedAt",
      header: "审核时间",
      render: (row) => formatDate(row.reviewedAt),
    },
    {
      key: "actions",
      header: "操作",
      render: (row) => {
        if (row.status !== "PENDING") {
          return (
            <button
              type="button"
              className="link-secondary"
              onClick={() => setReviewTarget(row)}
            >
              查看详情
            </button>
          );
        }
        return (
          <div className="row-actions">
            <button
              type="button"
              className="link-success"
              onClick={() => openReview(row, "approve")}
            >
              批准
            </button>
            <button
              type="button"
              className="link-danger"
              onClick={() => openReview(row, "reject")}
            >
              拒绝
            </button>
          </div>
        );
      },
      className: "col-actions",
    },
  ];

  function openReview(row: MockDealerApplication, action: "approve" | "reject") {
    setReviewTarget(row);
    setReviewAction(action);
    setReviewNote(row.reviewNote ?? "");
  }

  function closeReview() {
    setReviewTarget(null);
    setReviewAction(null);
    setReviewNote("");
  }

  function handleConfirmReview() {
    if (!reviewTarget || !reviewAction) return;
    const newStatus: MockDealerApplication["status"] =
      reviewAction === "approve" ? "APPROVED" : "REJECTED";
    setApplications((prev) =>
      prev.map((a) =>
        a.id === reviewTarget.id
          ? {
              ...a,
              status: newStatus,
              reviewNote: reviewNote || null,
              reviewerName: "admin",
              reviewedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
    closeReview();
  }

  // 详情 Modal（已审核的申请）
  function DetailModal() {
    if (!reviewTarget || reviewAction) return null;
    return (
      <Modal
        open={!!reviewTarget && !reviewAction}
        onClose={closeReview}
        title="申请详情"
      >
        <div className="detail-grid">
          <div>
            <span className="detail-label">公司名称</span>
            <span>{reviewTarget.companyName}</span>
          </div>
          <div>
            <span className="detail-label">联系人邮箱</span>
            <span>{reviewTarget.contactEmail}</span>
          </div>
          <div>
            <span className="detail-label">联系电话</span>
            <span>{reviewTarget.contactPhone}</span>
          </div>
          <div>
            <span className="detail-label">统一社会信用代码</span>
            <span>{reviewTarget.businessLicense}</span>
          </div>
          <div className="detail-full">
            <span className="detail-label">公司地址</span>
            <span>{reviewTarget.companyAddress}</span>
          </div>
          {reviewTarget.reviewNote ? (
            <div className="detail-full">
              <span className="detail-label">审核备注</span>
              <span>{reviewTarget.reviewNote}</span>
            </div>
          ) : null}
        </div>
      </Modal>
    );
  }

  // 审核 Modal（批准/拒绝待审核申请）
  function ReviewModal() {
    if (!reviewTarget || !reviewAction) return null;
    return (
      <Modal
        open={!!reviewTarget && !!reviewAction}
        onClose={closeReview}
        title={reviewAction === "approve" ? "批准经销商申请" : "拒绝经销商申请"}
        confirmText={reviewAction === "approve" ? "确认批准" : "确认拒绝"}
        confirmVariant={reviewAction === "approve" ? "primary" : "danger"}
        onConfirm={handleConfirmReview}
      >
        <p>
          即将对 <strong>{reviewTarget.companyName}</strong> 的申请进行
          <strong>{reviewAction === "approve" ? "批准" : "拒绝"}</strong>操作。
        </p>
        <div className="form-field" style={{ marginTop: 16 }}>
          <label htmlFor="review-note">审核备注（可选）</label>
          <textarea
            id="review-note"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="填写审核意见或拒绝原因..."
            rows={3}
          />
        </div>
      </Modal>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>Dealer 审核</h1>
          <p className="page-subtitle">
            共 {filtered.length} 条申请，待处理 {applications.filter((a) => a.status === "PENDING").length} 条
          </p>
        </div>
      </div>

      <div className="filter-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`filter-tab ${filter === tab.key ? "active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            <span className="filter-count">
              {tab.key === "ALL"
                ? applications.length
                : applications.filter((a) => a.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      <DataTable<MockDealerApplication>
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        emptyTitle="暂无申请"
        emptyDescription="当前筛选条件下没有经销商申请"
      />

      <DetailModal />
      <ReviewModal />
    </div>
  );
}
