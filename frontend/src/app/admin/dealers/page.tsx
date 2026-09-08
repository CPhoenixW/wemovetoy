"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import {
  approveApplication,
  listAdminApplications,
  rejectApplication,
} from "@/lib/api/dealers";
import type {
  DealerApplication,
  DealerApplicationStatus,
} from "@/lib/api/types";
import { dealerStatusMap, formatDate } from "@/lib/format";

const FILTER_TABS: Array<{ key: "ALL" | DealerApplicationStatus; label: string }> = [
  { key: "ALL", label: "全部" },
  { key: "PENDING", label: "待审核" },
  { key: "APPROVED", label: "已通过" },
  { key: "REJECTED", label: "已拒绝" },
];

// ============ 详情 Modal（定义在组件外，避免输入失焦） ============
interface DetailModalProps {
  open: boolean;
  target: DealerApplication | null;
  onClose: () => void;
}

function DetailModal({ open, target, onClose }: DetailModalProps) {
  if (!target) return null;
  return (
    <Modal open={open} onClose={onClose} title="申请详情">
      <div className="detail-grid">
        <div>
          <span className="detail-label">公司名称</span>
          <span>{target.companyName}</span>
        </div>
        <div>
          <span className="detail-label">联系人</span>
          <span>{target.contactName}</span>
        </div>
        <div>
          <span className="detail-label">联系电话</span>
          <span>{target.contactPhone}</span>
        </div>
        <div>
          <span className="detail-label">统一社会信用代码</span>
          <span>{target.taxId}</span>
        </div>
        <div className="detail-full">
          <span className="detail-label">公司地址</span>
          <span>{target.address}</span>
        </div>
        {target.reviewNote ? (
          <div className="detail-full">
            <span className="detail-label">审核备注</span>
            <span>{target.reviewNote}</span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

// ============ 审核 Modal（定义在组件外，textarea 不会因父渲染失焦） ============
interface ReviewModalProps {
  open: boolean;
  target: DealerApplication | null;
  action: "approve" | "reject" | null;
  note: string;
  reviewing: boolean;
  onNoteChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ReviewModal({
  open,
  target,
  action,
  note,
  reviewing,
  onNoteChange,
  onClose,
  onConfirm,
}: ReviewModalProps) {
  if (!target || !action) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={action === "approve" ? "批准经销商申请" : "拒绝经销商申请"}
      confirmText={
        reviewing
          ? "处理中..."
          : action === "approve"
            ? "确认批准"
            : "确认拒绝"
      }
      confirmVariant={action === "approve" ? "primary" : "danger"}
      confirmDisabled={reviewing}
      onConfirm={onConfirm}
    >
      <p>
        即将对 <strong>{target.companyName}</strong> 的申请进行
        <strong>{action === "approve" ? "批准" : "拒绝"}</strong>操作。
      </p>
      <div className="form-field" style={{ marginTop: 16 }}>
        <label htmlFor="review-note">审核备注（可选）</label>
        <textarea
          id="review-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="填写审核意见或拒绝原因..."
          rows={3}
          disabled={reviewing}
        />
      </div>
    </Modal>
  );
}

export default function AdminDealersPage() {
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [filter, setFilter] = useState<"ALL" | DealerApplicationStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState<DealerApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminApplications(filter === "ALL" ? undefined : filter)
      .then((data) => {
        if (!cancelled) setApplications(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载申请列表失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return applications;
    return applications.filter((a) => a.status === filter);
  }, [applications, filter]);

  const columns: Column<DealerApplication>[] = [
    { key: "id", header: "#", className: "col-id" },
    {
      key: "companyName",
      header: "公司名称",
      render: (row) => (
        <div>
          <div className="company-name">{row.companyName}</div>
          <div className="company-contact">{row.contactName}</div>
        </div>
      ),
    },
    { key: "contactPhone", header: "电话" },
    {
      key: "status",
      header: "状态",
      render: (row) => {
        const s = dealerStatusMap[row.status];
        return s ? <StatusBadge status={s.status} label={s.label} /> : row.status;
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

  function openReview(row: DealerApplication, action: "approve" | "reject") {
    setReviewTarget(row);
    setReviewAction(action);
    setReviewNote(row.reviewNote ?? "");
    setError("");
  }

  function closeReview() {
    setReviewTarget(null);
    setReviewAction(null);
    setReviewNote("");
  }

  /** 审核：调用后端 approve/reject 接口，用返回实体更新本地状态 */
  async function handleConfirmReview() {
    if (!reviewTarget || !reviewAction) return;
    setReviewing(true);
    setError("");
    try {
      const updated =
        reviewAction === "approve"
          ? await approveApplication(reviewTarget.id, reviewNote || undefined)
          : await rejectApplication(reviewTarget.id, reviewNote || undefined);
      setApplications((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      closeReview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "审核操作失败");
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">管理后台</p>
          <h1>经销商审核</h1>
          <p className="page-subtitle">
            共 {filtered.length} 条申请，待处理{" "}
            {applications.filter((a) => a.status === "PENDING").length} 条
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

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : (
        <DataTable<DealerApplication>
          columns={columns}
          data={filtered}
          rowKey={(row) => row.id}
          emptyTitle="暂无申请"
          emptyDescription="当前筛选条件下没有经销商申请"
        />
      )}

      <DetailModal
        open={!!reviewTarget && !reviewAction}
        target={reviewTarget}
        onClose={closeReview}
      />
      <ReviewModal
        open={!!reviewTarget && !!reviewAction}
        target={reviewTarget}
        action={reviewAction}
        note={reviewNote}
        reviewing={reviewing}
        onNoteChange={setReviewNote}
        onClose={closeReview}
        onConfirm={handleConfirmReview}
      />
    </div>
  );
}
