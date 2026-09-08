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
  { value: "newest", label: "最新上架" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
  { value: "name_asc", label: "名称升序" },
  { value: "name_desc", label: "名称降序" },
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
            <h1>全部商品</h1>
            <p className="catalog-hero__lead">
              高精度木质轨道积木，在动手拼搭中激发想象力与 STEAM 创造力。
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
            <div aria-label="商品列表" className="product-grid">
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
          <p className="empty-state">暂无相关商品。</p>
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
    return (
      <p className="result-count">
        共 <span className="tnum">{total}</span> 件商品
      </p>
    );
  }

  return (
    <nav aria-label="分页" className="pagination">
      {page > 1 ? (
        <Link href={hrefFor({ page: String(page - 1) })}>上一页</Link>
      ) : (
        <span aria-disabled="true">上一页</span>
      )}
      <span className="pagination__info">
        第 <span className="tnum">{page}</span> /{" "}
        <span className="tnum">{totalPages}</span> 页 · 共{" "}
        <span className="tnum">{total}</span> 件商品
      </span>
      {page < totalPages ? (
        <Link href={hrefFor({ page: String(page + 1) })}>下一页</Link>
      ) : (
        <span aria-disabled="true">下一页</span>
      )}
    </nav>
  );
}
