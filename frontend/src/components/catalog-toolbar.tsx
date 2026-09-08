"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  const activeSort = sort ?? "newest";

  /** 关闭抽屉并把焦点还给触发按钮（键盘/读屏用户能顺着原处继续操作）。 */
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    sortButtonRef.current?.focus();
  }, []);

  // 打开时焦点移入弹窗；Esc 关闭；Tab 在弹窗内循环，焦点不逃逸到背后内容
  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusables = Array.from(
      drawer.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1] ?? first;
    // 默认聚焦当前已选中的排序项，用户可直接按方向确认或 Esc 退出
    const initial =
      drawer.querySelector<HTMLElement>(".catalog-drawer__option.is-active") ??
      first;
    initial?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !first || !last) return;
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, closeDrawer]);

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
            aria-label="搜索商品"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索商品"
            type="search"
            value={query}
          />
          <button type="submit">搜索</button>
        </form>

        <div className="catalog-toolbar__sort">
          <span className="catalog-toolbar__sort-label">排序</span>
          <select
            aria-label="选择排序"
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
            aria-label="选择排序方式"
            className="catalog-toolbar__sort-btn"
            onClick={() => setDrawerOpen(true)}
            ref={sortButtonRef}
            type="button"
          >
            排序
          </button>
        </div>
      </div>

      {drawerOpen ? (
        <div
          aria-label="选择排序"
          className="catalog-drawer-overlay"
          onMouseDown={closeDrawer}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="catalog-drawer"
            onMouseDown={(event) => event.stopPropagation()}
            ref={drawerRef}
            role="dialog"
          >
            <div className="catalog-drawer__head">
              <h2 className="catalog-drawer__title">选择排序</h2>
              <button
                aria-label="关闭"
                className="catalog-drawer__close"
                onClick={closeDrawer}
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
