import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./styles.css";

export const metadata: Metadata = {
  title: "WEMOVE",
  description: "WEMOVE — 高精度木质轨道积木与实木玩具",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
