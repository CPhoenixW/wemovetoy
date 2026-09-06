"use client";

interface StatusBadgeProps {
  status: string;
  label?: string;
}

const styles: Record<string, { background: string; color: string }> = {
  // 审核流程
  pending: { background: "#fef3c7", color: "#92400e" },
  approved: { background: "#d1fae5", color: "#065f46" },
  rejected: { background: "#fee2e2", color: "#991b1b" },
  // 商品状态
  active: { background: "#d1fae5", color: "#065f46" },
  inactive: { background: "#e5e7eb", color: "#374151" },
  // 默认
  default: { background: "#e5e7eb", color: "#374151" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const style = styles[key] ?? styles.default;
  const text = label ?? status;

  return (
    <span
      className="status-badge"
      style={{ background: style.background, color: style.color }}
    >
      {text}
    </span>
  );
}
