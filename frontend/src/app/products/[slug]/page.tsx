import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ApiError } from "@/lib/api/client";
import { getProductBySlug } from "@/lib/api/products";
import type { ProductDetail } from "@/lib/api/types";
import { formatAgeRange, formatPrice } from "@/lib/format";
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
    return { title: `${product.name} · WEMOVE SPORTS` };
  } catch {
    return { title: "Product · WEMOVE SPORTS" };
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
        <Link href="/products">← Back to products</Link>
      </p>
      <p className="eyebrow">
        {product.category ? (
          <Link href="/products">{product.category.name}</Link>
        ) : (
          <Link href="/products">Catalog</Link>
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
          <p className="product-detail__price">{formatPrice(product.price)}</p>
          <p className="product-detail__short">{product.shortDescription}</p>
          <div className="product-detail__meta">
            {ageRange ? <span>{ageRange}</span> : null}
            {product.playEnvironment ? (
              <span>{product.playEnvironment}</span>
            ) : null}
          </div>
          {product.description ? (
            <p className="product-detail__description">{product.description}</p>
          ) : null}
        </div>

        <aside className="product-detail__aside">
          {features.length > 0 ? (
            <section>
              <h2>Features</h2>
              <ul className="feature-list">
                {features.map((feature, index) => (
                  <li key={index}>{String(feature)}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {specs.length > 0 ? (
            <section>
              <h2>Specifications</h2>
              <dl className="spec-list">
                {specs.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section>
            <h2>Variants</h2>
            {product.variants.length > 0 ? (
              <AddToCartPanel
                productName={product.name}
                variants={product.variants}
              />
            ) : (
              <p className="empty-state">No variants available.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
