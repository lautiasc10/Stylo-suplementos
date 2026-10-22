"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useCart } from "@/components/commerce/cart-provider";
import { PaymentSelector } from "@/components/commerce/payment-selector";
import { addPromotionAndRedirect } from "@/modules/commerce/actions";
import { productOffers } from "@/modules/commerce/product-offers";
import { promotionPrice } from "@/modules/commerce/promotion-cart";
import { formatPrice, variantLabel, type Catalog } from "@/modules/catalog/model";
import { galleryPhotos } from "@/components/catalog/gallery-images";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import { promoBody } from "@/components/storefront/hero-fonts";

type Offer = ReturnType<typeof productOffers>[number];

function offerImage(offer: Offer, imageBase: string, imageUrls: Record<string, string>) {
  if (offer.kind === "bundle" && offer.imagePath) {
    const src = imageUrls[offer.imagePath] || (imageBase ? catalogMediaSource(`${imageBase}/${offer.imagePath}`, imageBase, "card") : "");
    if (src) return { src, alt: `Combo ${offer.name}` };
  }
  const first = offer.components[0];
  const product = first.product!;
  return galleryPhotos(product, first.variantId, imageBase, imageUrls, "card")[0] ??
    product.variants.flatMap((variant) => galleryPhotos(product, variant.id, imageBase, imageUrls, "card"))[0] ?? null;
}

function OfferImage({ offer, imageBase, imageUrls, priority = false }: {
  offer: Offer; imageBase: string; imageUrls: Record<string, string>; priority?: boolean;
}) {
  const photo = offerImage(offer, imageBase, imageUrls);
  return photo ? (
    <span className="promo-product-art">
      <Image className="promo-product-front" src={photo.src} alt={photo.alt || offer.name} width={600} height={600} sizes="(max-width: 700px) 78vw, 370px" unoptimized priority={priority} />
      <Image className="promo-product-reflection" src={photo.src} alt="" aria-hidden="true" width={600} height={600} sizes="(max-width: 700px) 78vw, 370px" unoptimized loading="lazy" />
    </span>
  ) : (
    <span className="promo-photo-pending" role="img" aria-label={`Imagen pendiente de ${offer.name}`}>STYLO</span>
  );
}

function OfferAction({ offer }: { offer: Offer }) {
  const { addPromotion, busy, preview } = useCart();
  const [added, setAdded] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [added]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    const origin = event.currentTarget.querySelector("button")?.getBoundingClientRect();
    try {
      if (await addPromotion(offer.id, origin)) {
        setAdded(true);
        setMessage(`${offer.name} agregada a la bolsa.`);
      }
    } finally {
      pending.current = false;
    }
  }

  return (
    <form action={addPromotionAndRedirect} onSubmit={submit}>
      <input type="hidden" name="promotionId" value={offer.id} />
      <button type="submit" disabled={busy || added || (preview && !ready)} aria-label={`Agregar promoción ${offer.name} a la bolsa`}>
        {added ? "✓ Agregado" : "+ Agregar"}
      </button>
      <span className="sr-only" role="status">{message}</span>
    </form>
  );
}

function Countdown({ end }: { end: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = now === null ? null : Math.max(0, Date.parse(end) - now);
  if (remaining === 0) return null;
  const units = remaining === null ? ["--", "--", "--"] : [
    String(Math.floor(remaining / 3600000)).padStart(2, "0"),
    String(Math.floor(remaining / 60000) % 60).padStart(2, "0"),
    String(Math.floor(remaining / 1000) % 60).padStart(2, "0"),
  ];
  return <div className="promo-countdown" aria-label="Tiempo restante de la promoción">
    {units.map((value, index) => <span key={index}><strong>{value}</strong><small>{["horas", "min", "seg"][index]}</small></span>)}
  </div>;
}

function HorizontalOffers({ catalog, offers, imageBase, imageUrls, prefix }: { catalog: Catalog; offers: Offer[]; imageBase: string; imageUrls: Record<string, string>; prefix: string }) {
  const { paymentMethod } = useCart();
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = section.current;
    const track = rail.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 801px)");
    if (!root || !track) return;
    let distance = 0;
    let raf = 0;
    let enhanced = false;
    let visible = false;
    const cards = Array.from(track.querySelectorAll<HTMLElement>(".promo-horizontal-card"));
    const reset = () => {
      track.style.transform = "";
      cards.forEach((card) => card.style.removeProperty("transform"));
      root.style.setProperty("--promo-progress", "0");
    };
    const measure = () => {
      const overflow = Math.max(0, track.scrollWidth - window.innerWidth + 48);
      enhanced = desktop.matches && !reduced.matches && offers.length > 2 && overflow > 64;
      root.dataset.enhanced = enhanced ? "true" : "false";
      distance = enhanced ? overflow : 0;
      root.style.setProperty("--promo-travel", `${enhanced ? Math.max(distance, window.innerHeight * 2.2) : 0}px`);
      if (!enhanced) reset();
      update();
    };
    const update = () => {
      raf = 0;
      if (!enhanced || !visible) return;
      const rect = root.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / range));
      track.style.transform = `translate3d(${-distance * progress}px, 0, 0)`;
      cards.forEach((card, index) => { card.style.transform = `translate3d(0, ${Math.sin(progress * 6 + index) * 18}px, 0)`; });
      root.style.setProperty("--promo-progress", String(progress));
    };
    const schedule = () => { if (!raf && enhanced && visible) raf = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); }, { rootMargin: "100px" });
    const resize = new ResizeObserver(measure);
    observer.observe(root);
    resize.observe(track);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    reduced.addEventListener("change", measure);
    desktop.addEventListener("change", measure);
    measure();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      reduced.removeEventListener("change", measure);
      desktop.removeEventListener("change", measure);
      reset();
    };
  }, [offers.length]);

  return <section className="promo-horizontal" ref={section} aria-labelledby="promo-horizontal-title">
    <div className="promo-horizontal-stage">
      <header className="promo-section-heading">
        <p className="promo-eyebrow">OFERTAS VIGENTES</p>
        <h2 id="promo-horizontal-title">Ofertas <em>imperdibles</em></h2>
      </header>
      <div className="promo-horizontal-viewport">
        <div className="promo-horizontal-track" ref={rail}>
          {offers.map((offer, index) => {
            const price = promotionPrice(offer, paymentMethod);
            const first = offer.components[0];
            const href = `${prefix}/producto/${first.product!.slug}?variante=${first.variantId}`;
            return <article className="promo-horizontal-card" key={offer.id}>
              <span className="promo-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <Link className="promo-horizontal-image" href={href} aria-label={`Ver ${offer.name}`}>
                <OfferImage offer={offer} imageBase={imageBase} imageUrls={imageUrls} />
                {price.percentage > 0 && <span className="promo-percent">−{price.percentage}%</span>}
              </Link>
              <div className="promo-horizontal-info">
                <div><small>{catalog.brands.find((brand) => brand.id === first.product!.brandId)?.name}</small><h3>{offer.name}</h3><p>{variantLabel(first.variant!)}</p></div>
                <div className="promo-horizontal-price">{price.saving > 0 && <del>{formatPrice(price.original, 0)}</del>}<strong>{formatPrice(price.price, 0)}</strong></div>
              </div>
              <div className="promo-horizontal-actions"><Link href={href}>Ver promoción →</Link><OfferAction offer={offer} /></div>
            </article>;
          })}
        </div>
      </div>
      <div className="promo-horizontal-progress" aria-hidden="true"><span /></div>
    </div>
  </section>;
}

export function PromotionsExperience({ catalog: initialCatalog, imageBase = "", unavailable = false }: { catalog?: Catalog; imageBase?: string; unavailable?: boolean }) {
  const pageRef = useRef<HTMLDivElement>(null);
  const { promotions, imageUrls, paymentMethod, error, preview, catalog: cartCatalog } = useCart();
  const catalog = initialCatalog ?? cartCatalog;
  const prefix = preview ? "/vista-previa" : "";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const boundary = promotions.flatMap((offer) => [offer.startsAt, offer.endsAt]).filter(Boolean)
      .map((date) => Date.parse(date!)).filter((time) => time > now).sort((a, b) => a - b)[0];
    if (!boundary) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(0, boundary - Date.now() + 20), 2147483647));
    return () => clearTimeout(timer);
  }, [promotions, now]);
  const offers = useMemo(() => [...new Map(promotions.flatMap((offer) => offer.components[0]
    ? productOffers(catalog, [offer], offer.components[0].variantId, now)
    : []).map((offer) => [offer.id, offer])).values()], [catalog, promotions, now]);
  const featured = offers.slice().sort((a, b) => promotionPrice(b, paymentMethod).percentage - promotionPrice(a, paymentMethod).percentage)[0];
  const highest = featured ? promotionPrice(featured, paymentMethod).percentage : 0;
  const bundles = offers.filter((offer) => offer.kind === "bundle");
  useLayoutEffect(() => {
    const root = pageRef.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (!root || reduced.matches || !window.IntersectionObserver) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>(".promo-reveal"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).dataset.entered = "true";
        observer.unobserve(entry.target);
      }
    }), { threshold: .15 });
    elements.forEach((element) => {
      if (element.getBoundingClientRect().top >= innerHeight) {
        element.dataset.entered = "false";
        observer.observe(element);
      }
    });
    const show = () => { if (reduced.matches) elements.forEach((element) => { element.dataset.entered = "true"; }); };
    reduced.addEventListener("change", show);
    return () => { observer.disconnect(); reduced.removeEventListener("change", show); };
  }, [offers.length]);
  const availableKinds = [...new Set(offers.map((offer) => offer.kind))].map((kind) => kind === "sale" ? "Precios rebajados" : kind === "quantity" ? "Ofertas por cantidad" : "Combos");
  const ticker = availableKinds.length ? availableKinds : ["Promociones STYLO", "Explorá la tienda"];

  return <div ref={pageRef} className={`promo-page ${promoBody.variable}`}>
    <section className="promo-hero" aria-labelledby="promo-title">
      <Image src="/reference/promotions-scoop.webp" alt="" fill sizes="100vw" quality={85} priority className="promo-hero-image" />
      <div className="promo-hero-scrim" />
      <div className="promo-hero-kicker"><span>Promociones</span><strong>STYLO <em>SUPLEMENTOS</em></strong></div>
      <div className="promo-hero-copy">
        <h1 id="promo-title"><span className="sr-only">Promociones STYLO</span><span aria-hidden="true">{highest > 0 ? `−${highest}%` : "PROMOS"}</span></h1>
        <p>{highest > 0 ? "EN OFERTAS SELECCIONADAS" : "DESCUBRÍ LAS OFERTAS VIGENTES"}</p>
      </div>
      <a className="promo-scroll-cue" href="#oferta-destacada">Seguí bajando ↓</a>
    </section>

    <div className="promo-marquee" aria-label={ticker.join(" · ")}>
      <div aria-hidden="true">{[0, 1, 2, 3].map((repeat) => <span key={repeat}>{ticker.map((label, index) => <span key={index}>{label}<b>★</b></span>)}</span>)}</div>
    </div>

    <div className="promo-payment"><PaymentSelector label="Ver promociones con" /></div>
    {error && <p className="ui-notice" role="alert">{error}</p>}
    {featured ? <>
      <section className="promo-feature" id="oferta-destacada" aria-labelledby="promo-feature-title">
        <div className="promo-feature-copy promo-reveal">
          <p className="promo-eyebrow">OFERTA DESTACADA · {featured.kind === "bundle" ? "COMBO" : featured.kind === "quantity" ? "POR CANTIDAD" : "PRECIO REBAJADO"}</p>
          <h2 id="promo-feature-title">{featured.name.split(/\s+/).slice(0, -1).join(" ")} <em>{featured.name.split(/\s+/).at(-1)}</em></h2>
          <p>{featured.components.map((part) => `${part.quantity} × ${part.product!.name} · ${variantLabel(part.variant!)}`).join(" + ")}</p>
          {featured.endsAt && <><p className="promo-countdown-label">Esta oferta finaliza en</p><Countdown end={featured.endsAt} /></>}
          <div className="promo-feature-prices"><del>{formatPrice(promotionPrice(featured, paymentMethod).original, 0)}</del><strong>{formatPrice(promotionPrice(featured, paymentMethod).price, 0)}</strong><small>{paymentMethod === "transferencia" ? "Con transferencia" : "Con Mercado Pago"}</small></div>
          <OfferAction offer={featured} />
        </div>
        <Link className="promo-feature-visual promo-reveal" href={`${prefix}/producto/${featured.components[0].product!.slug}?variante=${featured.components[0].variantId}`} aria-label={`Ver ${featured.name}`}>
          <OfferImage offer={featured} imageBase={imageBase} imageUrls={imageUrls} priority />
        </Link>
      </section>
      <HorizontalOffers catalog={catalog} offers={offers} imageBase={imageBase} imageUrls={imageUrls} prefix={prefix} />
      <section className="promo-bundles" aria-labelledby="promo-bundles-title">
        <header className="promo-section-heading"><p className="promo-eyebrow">ELEGÍ TU COMBINACIÓN</p><h2 id="promo-bundles-title">Combos <em>power</em></h2></header>
        {bundles.length ? <div className="promo-bundle-grid">{bundles.map((offer) => {
          const price = promotionPrice(offer, paymentMethod);
          return <article key={offer.id} className="promo-bundle">
            <p className="promo-eyebrow">COMBO</p><h3>{offer.name}</h3>
            <ul>{offer.components.map((part) => <li key={part.variantId}>{part.quantity} × {part.product!.name} · {variantLabel(part.variant!)}</li>)}</ul>
            <div className="promo-bundle-prices">{price.saving > 0 && <del>{formatPrice(price.original, 0)}</del>}<strong>{formatPrice(price.price, 0)}</strong></div>
            <OfferAction offer={offer} />
          </article>;
        })}</div> : <p className="promo-bundle-empty">Todavía no hay combos en promoción.</p>}
        <Link className="promo-custom-link" href={preview ? "/vista-previa/portada#tu-combo" : "/#tu-combo"}>Armar mi propio combo →</Link>
      </section>
      <p className="promo-terms">El carrito aplica la promoción con mayor ahorro. Las promociones no se acumulan.</p>
    </> : <section className="promo-empty" id="oferta-destacada"><h2>{unavailable ? "No pudimos cargar las promociones." : "Pronto habrá nuevas oportunidades."}</h2><p>{unavailable ? "Volvé a intentarlo en unos minutos." : "Actualmente no hay promociones activas y disponibles."}</p><Link href={preview ? "/vista-previa" : "/catalogo"}>Explorar tienda →</Link></section>}
  </div>;
}
