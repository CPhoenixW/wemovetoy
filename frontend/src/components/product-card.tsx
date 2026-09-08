import Link from "next/link";
import type { Product } from "@/lib/api/types";
import { formatAgeRange, formatPrice } from "@/lib/format";
import { productImageSrc } from "@/lib/product-image";

export async function ProductCard({ product }: { product: Product }) {
  const ageRange = formatAgeRange(product.ageMin, product.ageMax);
  const image = productImageSrc(product.slug);

  return (
    <Link className="product-card" href={`/products/${product.slug}`}>
      {image ? (
        <div className="product-card__thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={product.name} loading="lazy" />
        </div>
      ) : null}
      <h2 className="product-card__name">{product.name}</h2>
      <p className="product-card__desc">{product.shortDescription}</p>
      <div className="product-card__meta">
        {ageRange ? <span className="product-card__age">{ageRange}</span> : null}
        {product.playEnvironment ? (
          <span className="product-card__scene">{product.playEnvironment}</span>
        ) : null}
      </div>
      <p className="product-card__price">{formatPrice(product.price)}</p>
    </Link>
  );
}
