"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/commerce/cart-provider";
import { PaymentSelector } from "@/components/commerce/payment-selector";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { addPromotionAndRedirect } from "@/modules/commerce/actions";
import { productOffers } from "@/modules/commerce/product-offers";
import { promotionPrice } from "@/modules/commerce/promotion-cart";
import {
  formatPrice,
  variantLabel,
  type Catalog,
} from "@/modules/catalog/model";
import { galleryPhotos } from "@/components/catalog/gallery-images";
import { catalogMediaSource } from "@/modules/catalog/media-source";
import { Icon } from "@/components/ui/icon";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";

export function HomePromotions({
  unavailable = false,
  imageBase = "",
  catalog: initialCatalog,
}: {
  unavailable?: boolean;
  imageBase?: string;
  catalog?: Catalog;
}) {
  const {
    promotions,
    catalog: cartCatalog,
    imageUrls,
    preview,
    paymentMethod,
    addPromotion,
    busy,
    error,
  } = useCart();
  const catalog = initialCatalog ?? cartCatalog;
  const prefix = preview ? "/vista-previa" : "";
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [added, setAdded] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState("");
  const addingRef = useRef(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(""), 1800);
    return () => clearTimeout(timer);
  }, [added]);
  useEffect(() => {
    const boundary = promotions
      .flatMap((p) => [p.startsAt, p.endsAt])
      .filter(Boolean)
      .map((d) => Date.parse(d!))
      .filter((t) => t > now)
      .sort((a, b) => a - b)[0];
    if (!boundary) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(0, boundary - Date.now() + 20), 2147483647),
    );
    return () => clearTimeout(timer);
  }, [promotions, now]);
  const offers = [
    ...new Map(
      promotions
        .flatMap((p) =>
          p.components[0]
            ? productOffers(catalog, [p], p.components[0].variantId, now)
            : [],
        )
        .map((p) => [p.id, p]),
    ).values(),
  ];

  return (
    <section
      id="promociones"
      className="home-collection home-promotions"
      aria-labelledby="promociones-title"
    >
      <div className="container">
        <RevealGroup
          as="header"
          className="home-section-heading home-promotions-heading"
        >
          <RevealItem>
            <h2 id="promociones-title">Promociones</h2>
            <p className="home-promotions-intro">
              Precios por producto, combo o cantidad. Elegí cómo pagar y
              encontrá tu mejor precio.
            </p>
          </RevealItem>
          <RevealItem className="home-promotions-tools" direction="none">
            <PaymentSelector label="Ver promociones con" />
            <Link href={preview ? prefix : "/catalogo"} className="text-link">
              Explorar tienda <Icon name="arrow" />
            </Link>
          </RevealItem>
        </RevealGroup>
        <p className="sr-only" role="status">
          {message}
        </p>
        {error && (
          <p className="ui-notice" role="alert">
            {error}
          </p>
        )}
        {offers.length ? (
          <>
            <RevealGroup
              className="home-offer-grid"
              data-count={offers.length}
              delay={0.16}
            >
              {offers.map((offer) => {
                const current = promotionPrice(offer, paymentMethod);
                const alternativeMethod =
                  paymentMethod === "transferencia"
                    ? "mercado-pago"
                    : "transferencia";
                const alternative = promotionPrice(offer, alternativeMethod);
                const first = offer.components[0];
                const bundleImage =
                  offer.kind === "bundle" && offer.imagePath
                    ? imageUrls[offer.imagePath] ||
                      (imageBase
                        ? catalogMediaSource(
                            `${imageBase}/${offer.imagePath}`,
                            imageBase,
                            "card",
                          )
                        : "")
                    : "";
                const shownComponents =
                  offer.kind === "bundle" && !bundleImage
                    ? offer.components.slice(0, 3)
                    : [first];
                const href = `${prefix}/producto/${first.product!.slug}?variante=${first.variantId}`;
                const label =
                  offer.kind === "bundle"
                    ? "Combo"
                    : offer.kind === "quantity"
                      ? `Desde ${first.quantity} unidades`
                      : "Precio rebajado";
                return (
                  <RevealItem
                    as="article"
                    className="home-offer"
                    direction="none"
                    key={offer.id}
                    aria-labelledby={`offer-${offer.id}`}
                  >
                    <Link
                      className="home-offer-media"
                      href={href}
                      aria-label={`Ver promoción ${offer.name}`}
                      tabIndex={-1}
                    >
                      <div
                        className="home-offer-products"
                        data-count={bundleImage ? 1 : shownComponents.length}
                      >
                        {bundleImage ? (
                          <Image
                            src={bundleImage}
                            alt={`Combo ${offer.name}`}
                            width={600}
                            height={600}
                            sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 380px"
                            unoptimized
                            loading="lazy"
                          />
                        ) : (
                          shownComponents.map((component) => {
                            const product = component.product!;
                            const photo =
                              galleryPhotos(
                                product,
                                component.variantId,
                                imageBase,
                                imageUrls,
                                "card",
                              )[0] ??
                              product.variants.flatMap((variant) =>
                                galleryPhotos(
                                  product,
                                  variant.id,
                                  imageBase,
                                  imageUrls,
                                  "card",
                                ),
                              )[0];
                            return photo ? (
                              <Image
                                key={component.variantId}
                                src={photo.src}
                                alt={photo.alt || product.name}
                                width={600}
                                height={600}
                                unoptimized
                                loading="lazy"
                                sizes="(max-width: 600px) 80vw, (max-width: 1000px) 40vw, 360px"
                              />
                            ) : (
                              <span
                                className="home-offer-media-empty"
                                key={component.variantId}
                                role="img"
                                aria-label={`Foto pendiente de ${product.name}`}
                              >
                                <Icon name="bag" />
                              </span>
                            );
                          })
                        )}
                      </div>
                      <span className="home-offer-kind">{label}</span>
                      {current.percentage > 0 && (
                        <span className="home-offer-discount">
                          −{current.percentage}%
                        </span>
                      )}
                    </Link>
                    <div className="home-offer-body">
                      <h3 id={`offer-${offer.id}`}>{offer.name}</h3>
                      <ul>
                        {offer.components.map((component) => (
                          <li key={component.variantId}>
                            {component.quantity} × {component.product!.name} ·{" "}
                            {variantLabel(component.variant!)}
                          </li>
                        ))}
                      </ul>
                      <div
                        className="home-offer-pricing"
                        aria-label={`Precios de ${offer.name}`}
                      >
                        <p className="home-offer-price">
                          <strong>
                            <AnimatedAmount value={current.price} />
                          </strong>
                          {current.saving > 0 && (
                            <del>{formatPrice(current.original, 0)}</del>
                          )}
                        </p>
                        <p className="home-offer-saving">
                          {current.saving > 0 && (
                            <>
                              Ahorrás <AnimatedAmount value={current.saving} />
                              {offer.kind === "quantity" ? " por unidad" : ""}
                            </>
                          )}
                        </p>
                        <p className="home-offer-alternative">
                          {paymentMethod === "transferencia"
                            ? "Con Mercado Pago"
                            : "Con transferencia"}
                          :{" "}
                          <strong>
                            <AnimatedAmount value={alternative.price} />
                          </strong>
                          {offer.kind === "quantity" && (
                            <span>
                              {" "}
                              · {current.quantity} u. ={" "}
                              <strong>
                                <AnimatedAmount
                                  value={current.price * current.quantity}
                                />
                              </strong>
                            </span>
                          )}
                        </p>
                        <p className="home-offer-condition">
                          {offer.kind === "quantity"
                            ? "Precio por unidad al alcanzar la cantidad indicada."
                            : offer.kind === "bundle"
                              ? "Precio por combo completo."
                              : "Descuento incluido en el precio."}
                        </p>
                      </div>
                      <div className="home-offer-actions">
                        <Link className="home-offer-link" href={href}>
                          Ver promoción <Icon name="arrow" />
                        </Link>
                        <form
                          action={addPromotionAndRedirect}
                          onSubmit={async (event) => {
                            event.preventDefault();
                            if (addingRef.current) return;
                            addingRef.current = true;
                            setAdding(offer.id);
                            setMessage("");
                            const origin = event.currentTarget
                              .querySelector('button[type="submit"]')
                              ?.getBoundingClientRect();
                            try {
                              if (await addPromotion(offer.id, origin)) {
                                setAdded(offer.id);
                                setMessage(
                                  `Promoción ${offer.name} agregada al carrito.`,
                                );
                              }
                            } finally {
                              addingRef.current = false;
                              setAdding("");
                            }
                          }}
                        >
                          <input
                            type="hidden"
                            name="promotionId"
                            value={offer.id}
                          />
                          <button
                            className="home-offer-add premium-cta"
                            type="submit"
                            disabled={
                              busy || added === offer.id || (preview && !ready)
                            }
                            aria-label={`Agregar promoción ${offer.name} al carrito`}
                            aria-busy={adding === offer.id}
                            data-added={added === offer.id}
                          >
                            {added === offer.id ? (
                              <span aria-hidden="true">✓</span>
                            ) : (
                              <Icon name="plus" />
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  </RevealItem>
                );
              })}
            </RevealGroup>
            <p className="home-promotions-note">
              El carrito aplica la promoción con mayor ahorro. Las promociones
              no se acumulan.
            </p>
            <noscript>
              <p>
                Precios mostrados con transferencia. Podés agregar una promoción
                o consultar su producto.
              </p>
            </noscript>
          </>
        ) : (
          <Reveal className="home-collection-empty">
            <p>
              {unavailable
                ? "No pudimos cargar las promociones. Volvé a intentarlo en la tienda."
                : "Actualmente no hay promociones activas."}
            </p>
            <Link href={preview ? prefix : "/catalogo"} className="text-link">
              Ver productos <Icon name="arrow" />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}
