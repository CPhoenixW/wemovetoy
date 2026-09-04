import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./styles.css";

export const metadata: Metadata = {
  title: "WEMOVE SPORTS",
  description: "WEMOVE SPORTS product platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
