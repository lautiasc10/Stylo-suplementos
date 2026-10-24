import { expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductGallery } from "../../src/components/catalog/product-gallery";

test("una tarjeta con un frente normalizado conserva foto, enlace y tamaños sin duplicar el envase", () => {
  const html = renderToStaticMarkup(
    createElement(ProductGallery, {
      mode: "card",
      transition: "turn",
      href: "/producto/creatina?variante=sku-1",
      linkLabel: "Ver Creatina",
      images: [
        {
          id: "front",
          src: "/creatina-600.webp",
          srcSet: "/creatina-320.webp 320w, /creatina-600.webp 600w",
          sizes: "50vw",
          alt: "Creatina de frente",
          normalized: true,
        },
      ],
    }),
  );
  expect(html.match(/<img\b/g)).toHaveLength(1);
  expect(html).toContain('href="/producto/creatina?variante=sku-1"');
  expect(html).toContain('aria-label="Ver Creatina"');
  expect(html).toContain('alt="Creatina de frente"');
  expect(html).toContain('sizes="50vw"');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('width="720" height="720"');
});
