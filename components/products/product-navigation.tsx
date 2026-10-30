import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { PRODUCTS, PRODUCT_IDS, productHref, type ProductId } from "@/lib/products";
import styles from "./products.module.css";

export function ProductNavigation({ active, lang = "th" }: { active?: ProductId; lang?: Lang }) {
  return <nav className={styles.navigation} aria-label={lang === "th" ? "บริการ VibeLinkTH" : "VibeLinkTH products"}>
    {PRODUCT_IDS.map(id => {
      const product = PRODUCTS[id];
      return <Link key={id} href={productHref(id)} prefetch={false} data-product={id}
        data-product-status={product.status} aria-current={active === id ? "page" : undefined}
        title={`${product.name} · ${product.statusLabel[lang]}`}>
        <span>{product.label}</span>
        {(product.status === "development" || product.status === "alpha") &&
          <small>{product.statusLabel[lang]}</small>}
      </Link>;
    })}
  </nav>;
}
