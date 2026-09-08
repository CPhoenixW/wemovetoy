import Link from "next/link";

/** 登录态校验中（useAuth 完成 /auth/me 校验前的占位，避免白屏） */
export function AuthChecking() {
  return (
    <div className="access-state">
      <p className="page-loading">正在校验登录态...</p>
    </div>
  );
}

/** 已登录但角色不符（useAuth 同时会跳转到该用户的角色首页，此面板为跳转前/跳转失败的兜底） */
export function AccessDenied({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="access-state">
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <h3>无权限访问</h3>
        <p>该区域仅限{roleLabel}访问，当前账号角色无权查看。</p>
        <div className="empty-action">
          <Link href="/" className="btn-primary">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
