/** 登录/注册成功回跳目标校验：仅允许站内相对路径（/cart、/products/foo?x=1），
 *  拒绝 //host、https://host、含反斜杠等开放重定向向量。 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (/\\/.test(next)) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next)) return null;
  return next;
}
