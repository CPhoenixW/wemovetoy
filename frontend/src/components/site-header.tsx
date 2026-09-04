import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/products">
        WEMOVE SPORTS
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/products">Products</Link>
        <Link href="/login">Account</Link>
      </nav>
    </header>
  );
}
