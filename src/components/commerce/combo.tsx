"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCart } from "./cart-provider";
import { PaymentSelector } from "./payment-selector";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { formatPrice, packagingLabel, variantLabel } from "@/modules/catalog/model";
import { galleryPhotos } from "@/components/catalog/gallery-images";
import { safeShopReturn, productHref, comboHref } from "@/modules/catalog/navigation";
import { promotionPrice } from "@/modules/commerce/promotion-cart";
import { addPromotionAndRedirect } from "@/modules/commerce/actions";
import type { BundleOffer } from "@/modules/commerce/catalog-bundles";

type MediaProps = { offer: BundleOffer; imageBase?: string; imageUrls?: Record<string, string> };

function ComboVisual({ offer, imageBase = "", imageUrls = {}, priority = false }: MediaProps & { priority?: boolean }) {
  const photo = offer.imagePath ? imageUrls[offer.imagePath] ||
    (imageBase ? `${imageBase}/${offer.imagePath}` : "") : "";
  return <div className="combo-visual" data-composite={!photo || undefined}>
    {photo ? <Image src={photo} alt={`Combo ${offer.name}`} fill sizes={priority ? "(max-width: 700px) calc(100vw - 40px), (max-width: 1440px) 46vw, 636px" : "(max-width: 700px) 44vw, (max-width: 1100px) 30vw, 300px"} quality={85} priority={priority} /> :
      offer.components.map((component) => {
        const image = galleryPhotos(component.product!, component.variantId, imageBase, imageUrls, "card")[0];
        return <div key={component.variantId}>
          {image ? <Image src={image.src} alt={packagingLabel(component.product!.name)} width={320} height={320} sizes="(max-width: 700px) 40vw, 250px" unoptimized={image.src.startsWith("/_next/image?")} /> :
            <span className="combo-photo-pending">{packagingLabel(component.product!.name)}</span>}
        </div>;
      })}
  </div>;
}

export function ComboCard({ offer, imageBase, imageUrls, preview = false, returnHref }: MediaProps & { preview?: boolean; returnHref?: string }) {
  const href = comboHref(offer.id, preview, returnHref);
  return <article className="product-card combo-card">
    <Link className="combo-card-photo" href={href} aria-label={`Ver combo ${offer.name}`}>
      <ComboVisual offer={offer} imageBase={imageBase} imageUrls={imageUrls} />
      <span className="combo-card-badge">Combo</span>
    </Link>
    <div className="product-card-copy">
      <p className="combo-card-kicker">STYLO · {offer.components.reduce((n, c) => n + c.quantity, 0)} productos</p>
      <h2><Link href={href}>{offer.name}</Link></h2>
      <p className="combo-card-components">{offer.components.map((c) => `${c.quantity} × ${packagingLabel(c.product!.name)}`).join(" + ")}</p>
      <div className="combo-card-prices"><strong>{formatPrice(offer.listPrice, 0)}</strong><p><b>{formatPrice(offer.cashPrice, 0)}</b> <span>con transferencia</span></p></div>
      <Link href={href} className="combo-card-link">Ver combo <span aria-hidden="true">↗</span></Link>
    </div>
  </article>;
}

function ComboPurchase({ offer }: { offer: BundleOffer }) {
  const { addPromotion, busy, error, preview } = useCart();
  const [ready, setReady] = useState(false), [added, setAdded] = useState(false);
  const pending = useRef(false);
  useEffect(() => setReady(true), []);
  useEffect(() => { if (!added) return; const timer = setTimeout(() => setAdded(false), 1800); return () => clearTimeout(timer); }, [added]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    try { if (await addPromotion(offer.id, event.currentTarget.querySelector("button")?.getBoundingClientRect())) setAdded(true); }
    finally { pending.current = false; }
  }
  return <form action={addPromotionAndRedirect} onSubmit={submit} className="combo-purchase">
    <input type="hidden" name="promotionId" value={offer.id} />
    <button className="button button-gold" type="submit" disabled={busy || added || (preview && !ready)}>{added ? "Agregado a la bolsa" : "Agregar combo completo"}</button>
    <p className="sr-only" role="status">{added ? `${offer.name} agregado a la bolsa.` : ""}</p>
    {error && <p role="alert">{error}</p>}
  </form>;
}

export function ComboDetail({ offer, imageBase, imageUrls, preview = false, returnHref }: MediaProps & { preview?: boolean; returnHref?: string }) {
  const { paymentMethod } = useCart();
  const price = promotionPrice(offer, paymentMethod);
  const back = safeShopReturn(returnHref, preview ? "/vista-previa" : "/catalogo");
  return <section className="container interior-page combo-detail">
    <Link className="text-link combo-back" href={back}>← Volver a la tienda</Link>
    <div className="combo-detail-grid">
      <ComboVisual offer={offer} imageBase={imageBase} imageUrls={imageUrls} priority />
      <div className="combo-detail-info">
        <p className="eyebrow">COMBO STYLO</p><h1>{offer.name}</h1>
        <h2>Incluye</h2>
        <ul>{offer.components.map((component) => <li key={component.variantId}>
          <span>{component.quantity} ×</span><Link href={productHref(preview ? "/vista-previa/producto" : "/producto", component.product!.slug, component.variantId, back)}>
            <strong>{packagingLabel(component.product!.name)}</strong><small>{variantLabel(component.variant!)}</small>
          </Link>
        </li>)}</ul>
        <PaymentSelector />
        <div className="combo-detail-price"><span>Total del combo con {paymentMethod === "mercado-pago" ? "Mercado Pago" : "transferencia"}</span>
          {price.saving > 0 && <del>{formatPrice(price.original, 0)}</del>}
          <AnimatedAmount value={price.price} resetKey={offer.id} />
        </div>
        <ComboPurchase offer={offer} />
        <p className="combo-condition">Incluye las presentaciones y cantidades indicadas. Se aplica la promoción que más ahorre en el carrito; no se acumulan.</p>
      </div>
    </div>
  </section>;
}
