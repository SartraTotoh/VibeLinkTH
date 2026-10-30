import Link from "next/link";
import { PRODUCTS, PRODUCT_IDS, productHref } from "@/lib/products";
import styles from "./products.module.css";

export function ProductCards() {
  return <div className={styles.cards}>
    {PRODUCT_IDS.map(id => {
      const product = PRODUCTS[id];
      return <article key={id} id={product.anchor} className={styles.card} data-product-status={product.status}>
        <span className="ms" aria-hidden="true">{product.icon}</span>
        <h2>{product.name}</h2>
        <small>{product.statusLabel.th}</small>
        <p>{product.description.th}</p>
        {product.route
          ? <Link href={productHref(id)} prefetch={false}>{product.cta.th} <span aria-hidden="true">↗</span></Link>
          : <span className={styles.unavailable}>{product.cta.th}</span>}
      </article>;
    })}
  </div>;
}
