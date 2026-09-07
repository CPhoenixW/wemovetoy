import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/lib/api/products";
import type { ProductListResult, ProductSort } from "@/lib/api/types";

const PAGE_SIZE = 12;

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

  const result: ProductListResult = await listProducts({
    page,
    limit: PAGE_SIZE,
    sort,
    search,
  });

  return (
    <section className="page-shell">
      <p className="eyebrow">Catalog</p>
      <h1>Products</h1>

      <form className="search-form" action="/products" method="get">
        <input
          aria-label="Search products"
          defaultValue={search}
          name="search"
          placeholder="Search products"
          type="search"
        />
        {sort ? <input name="sort" type="hidden" value={sort} /> : null}
        <button type="submit">Search</button>
      </form>

      <nav aria-label="Sort products" className="sort-bar">
        {SORTS.map(({ value, label }) => (
          <Link
            aria-current={sort === value ? "page" : undefined}
            className={sort === value ? "is-active" : undefined}
            href={hrefFor({ sort: value, page: "1" })}
            key={value}
          >
            {label}
          </Link>
        ))}
      </nav>

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
