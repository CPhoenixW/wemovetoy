import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError } from "@/lib/api/client";
import { getProductBySlug } from "@/lib/api/products";
import type { ProductDetail } from "@/lib/api/types";
import {
  formatAgeRange,
  formatPlayEnvironment,
  formatPrice,
  formatSpecKey,
} from "@/lib/format";
import { productImageSrc } from "@/lib/product-image";
import { AddToCartPanel } from "./add-to-cart";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return { title: `${product.name} · WEMOVE` };
  } catch {
    return { title: "商品详情 · WEMOVE" };
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;

  let product: ProductDetail;
  try {
    product = await getProductBySlug(slug);
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      notFound();
    }
    throw caught;
  }

  const ageRange = formatAgeRange(product.ageMin, product.ageMax);
  const environment = formatPlayEnvironment(product.playEnvironment);
  const features = Array.isArray(product.features) ? product.features : [];
  const specs =
    product.specifications &&
    typeof product.specifications === "object" &&
    !Array.isArray(product.specifications)
      ? Object.entries(product.specifications)
      : [];

  const image = productImageSrc(slug);

  return (
    <section className="page-shell">
      <p className="back-link back-link--top">
        <Link href="/products">← 返回商品列表</Link>
      </p>
      <p className="eyebrow">
        {product.category ? (
          <Link href="/products">{product.category.name}</Link>
        ) : (
          <Link href="/products">商品目录</Link>
        )}
      </p>
      <h1>{product.name}</h1>

      <div className="product-detail">
        <div className="product-detail__main">
          {image ? (
            <div className="product-detail__image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={product.name} />
            </div>
          ) : null}
          <p className="product-detail__short">{product.shortDescription}</p>
          <div className="product-detail__meta">
            {ageRange ? <span>{ageRange}</span> : null}
            {environment ? <span>{environment}</span> : null}
          </div>
          {product.description ? (
            <p className="product-detail__description">{product.description}</p>
          ) : null}

          {features.length > 0 ? (
            <details className="detail-folding">
              <summary>产品特点</summary>
              <ul className="feature-list">
                {features.map((feature, index) => (
                  <li key={index}>{String(feature)}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {specs.length > 0 ? (
            <details className="detail-folding">
              <summary>规格参数</summary>
              <dl className="spec-list">
                {specs.map(([key, value]) => (
                  <div key={key}>
                    <dt>{formatSpecKey(key)}</dt>
                    <dd
                      className={typeof value === "number" ? "tnum" : undefined}
                    >
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>

        <aside className="product-detail__aside">
          {product.variants.length > 0 ? (
            <AddToCartPanel
              productName={product.name}
              variants={product.variants}
            />
          ) : (
            <div className="add-to-cart-panel">
              <p className="buy-box__price tnum">
                {formatPrice(product.price)}
              </p>
              <p className="empty-state">暂无可选规格。</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
