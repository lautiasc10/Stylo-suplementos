import { HomePromotions } from "@/components/storefront/home-promotions";

export default function OffersPreviewPage() {
  return (
    <>
      <h1 className="sr-only">Vista previa de promociones</h1>
      <p className="preview-notice">
        Publicaciones de prueba guardadas en este navegador. No modifica las
        promociones de la tienda.
      </p>
      <HomePromotions />
    </>
  );
}
