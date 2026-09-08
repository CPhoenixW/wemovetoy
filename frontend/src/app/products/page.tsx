import { readdirSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { CatalogToolbar } from "@/components/catalog-toolbar";
import { ProductCard } from "@/components/product-card";
import { ShowcaseHero } from "@/components/showcase-hero";
import { listProducts } from "@/lib/api/products";
import type { ProductListResult, ProductSort } from "@/lib/api/types";

const PAGE_SIZE = 12;

/** 探测 public/ 下的 publicN 系列公司展示图（如 public1.png…public7.png），按编号升序返回可引用 URL。 */
function resolveShowcaseImages(): string[] {
  const publicDir = path.join(process.cwd(), "public");
  let files: string[];
  try {
    files = readdirSync(publicDir);
  } catch {
    return [];
  }
  return files
    .filter((name) => /^public(\d+)\.(png|jpe?g|webp)$/.test(name))
    .map((name) => ({ name, n: Number(/^public(\d+)/.exec(name)?.[1] ?? 0) }))
    .sort((a, b) => a.n - b.n)
    .map(({ name }) => `/${name}`);
}

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
];

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    search?: string;
  }>;
}

function parsePage(value?: string): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function pickSort(value?: string): ProductSort | undefined {
  return SORTS.some((sort) => sort.value === value)
    ? (value as ProductSort)
    : undefined;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const sort = pickSort(params.sort);
  const search = params.search?.trim() || undefined;

  const hrefFor = (updates: { page?: string; sort?: string }) => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    const nextSort = updates.sort ?? sort;
    if (nextSort) next.set("sort", nextSort);
    if (updates.page) next.set("page", updates.page);
    const qs = next.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  const showcaseImages = resolveShowcaseImages();
  const hasShowcaseMedia = showcaseImages.length > 0;

  const result: ProductListResult = await listProducts({
    page,
    limit: PAGE_SIZE,
    sort,
    search,
  });

  return (
    <>
      <section className="catalog-hero">
        <div
          className={
            hasShowcaseMedia
              ? "catalog-hero__grid"
              : "catalog-hero__grid catalog-hero__grid--text-only"
          }
        >
          <div className="catalog-hero__text">
            <p className="catalog-hero__brand">惟®木|WeMove® · WEMOVE</p>
            <h1>Products</h1>
            <p className="catalog-hero__lead">
              Precision wooden track blocks for hands-on, imaginative STEAM
              play.
            </p>
          </div>
          {hasShowcaseMedia ? (
            <div className="catalog-hero__media">
              <ShowcaseHero images={showcaseImages} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="catalog-list">
        <CatalogToolbar search={search ?? ""} sort={sort} sorts={SORTS} />
        {result.items.length > 0 ? (
          <>
            <div aria-label="Product catalogue" className="product-grid">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination
              hrefFor={hrefFor}
              page={result.page}
              total={result.total}
              totalPages={result.totalPages}
            />
          </>
        ) : (
          <p className="empty-state">No products found.</p>
        )}
      </section>
    </>
  );
}

function Pagination({
  hrefFor,
  page,
  total,
  totalPages,
}: {
  hrefFor: (updates: { page?: string }) => string;
  page: number;
  total: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return <p className="result-count">{total} products</p>;
  }

  return (
    <nav aria-label="Pagination" className="pagination">
      {page > 1 ? (
        <Link href={hrefFor({ page: String(page - 1) })}>Prev</Link>
      ) : (
        <span aria-disabled="true">Prev</span>
      )}
      <span className="pagination__info">
        Page {page} of {totalPages} · {total} products
      </span>
      {page < totalPages ? (
        <Link href={hrefFor({ page: String(page + 1) })}>Next</Link>
      ) : (
        <span aria-disabled="true">Next</span>
      )}
    </nav>
  );
}
