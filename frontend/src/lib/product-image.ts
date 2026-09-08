import { existsSync } from "node:fs";
import path from "node:path";

/**
 * 公开商品展示图：图片存放在 frontend/public/pic，命名 = 商品 slug。
 * 支持 .jpg/.jpeg/.png/.webp，缺图返回 null（界面不渲染图片、不影响布局）。
 * 仅供 Server Component 在渲染时调用（依赖本地文件系统）。
 */

const PIC_DIR = path.join(process.cwd(), "public", "pic");
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export function productImageSrc(slug: string): string | null {
  for (const ext of EXTENSIONS) {
    if (existsSync(path.join(PIC_DIR, `${slug}${ext}`))) {
      return `/pic/${slug}${ext}`;
    }
  }
  return null;
}
