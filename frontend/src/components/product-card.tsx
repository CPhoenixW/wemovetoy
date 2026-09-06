import Link from "next/link";
import type { Product } from "@/lib/api/types";
import { formatAgeRange, formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const ageRange = formatAgeRange(product.ageMin, product.ageMax);

  return (
    <Link className="product-card" href={`/products/${product.slug}`}>
      <div className="product-card__price">{formatPrice(product.price)}</div>
      <h2 className="product-card__name">{product.name}</h2>
      <p className="product-card__desc">{product.shortDescription}</p>
      {ageRange ? <span className="product-card__age">{ageRange}</span> : null}
    </Link>
  );
}
