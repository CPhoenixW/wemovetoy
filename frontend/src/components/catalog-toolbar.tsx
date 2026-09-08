"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { ProductSort } from "@/lib/api/types";

interface SortOption {
  value: ProductSort;
  label: string;
}

/**
 * 商品列表统一工具栏：搜索 + 排序合并为一行。
 * 桌面端直接展示排序下拉；窄屏把排序收进底部抽屉，避免多行按钮堆叠。
 * 变更均通过更新 URL query 触发服务端重渲染。
 */
export function CatalogToolbar({
  search,
  sort,
  sorts,
}: {
  search: string;
  sort?: ProductSort;
  sorts: SortOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(search);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeSort = sort ?? "newest";

  const buildHref = (nextSearch: string, nextSort?: ProductSort): string => {
    const params = new URLSearchParams();
    const trimmed = nextSearch.trim();
    if (trimmed) params.set("search", trimmed);
    if (nextSort) params.set("sort", nextSort);
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  const applySort = (value: ProductSort) => {
    setDrawerOpen(false);
    router.push(buildHref(search, value));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildHref(query, sort));
  };

  return (
    <>
      <div className="catalog-toolbar">
        <form className="catalog-toolbar__search" onSubmit={submitSearch}>
          <input
            aria-label="Search products"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            type="search"
            value={query}
          />
          <button type="submit">Search</button>
        </form>

        <div className="catalog-toolbar__sort">
          <span className="catalog-toolbar__sort-label">Sort</span>
          <select
            aria-label="Sort products"
            onChange={(event) => {
              const value = event.target.value as ProductSort;
              if (value) applySort(value);
            }}
            value={activeSort}
          >
            {sorts.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            aria-label="Choose sort order"
            className="catalog-toolbar__sort-btn"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            Sort
          </button>
        </div>
      </div>

      {drawerOpen ? (
        <div
          aria-label="Sort products"
          className="catalog-drawer-overlay"
          onMouseDown={() => setDrawerOpen(false)}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="catalog-drawer"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="catalog-drawer__head">
              <h2 className="catalog-drawer__title">Sort products</h2>
              <button
                aria-label="Close"
                className="catalog-drawer__close"
                onClick={() => setDrawerOpen(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="catalog-drawer__options">
              {sorts.map((option) => {
                const isActive = activeSort === option.value;
                return (
                  <button
                    className={
                      isActive
                        ? "catalog-drawer__option is-active"
                        : "catalog-drawer__option"
                    }
                    key={option.value}
                    onClick={() => applySort(option.value)}
                    type="button"
                  >
                    <span>{option.label}</span>
                    {isActive ? (
                      <span aria-hidden="true">✓</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
