/** Official public channels supplied by STYLO on 24 October 2026.
 * Address and opening hours are deliberately absent until confirmed. */
export const storeContact = {
  location: "Rosario, Argentina",
  phone: "+54 9 341 531-6456",
  whatsapp: "https://wa.me/5493415316456",
  email: "stylo.suplementos@gmail.com",
  instagram: "https://www.instagram.com/stylo.suplementos/",
  facebook: "https://www.facebook.com/Stylo.Suplementos/",
} as const;

export const contactChannels = [
  {
    name: "WhatsApp",
    value: storeContact.phone,
    href: storeContact.whatsapp,
    action: "Escribinos",
    external: true,
  },
  {
    name: "Email",
    value: storeContact.email,
    href: `mailto:${storeContact.email}`,
    action: "Enviar un email",
    external: false,
  },
  {
    name: "Instagram",
    value: "@stylo.suplementos",
    href: storeContact.instagram,
    action: "Ver Instagram",
    external: true,
  },
  {
    name: "Facebook",
    value: "Stylo.Suplementos",
    href: storeContact.facebook,
    action: "Ver Facebook",
    external: true,
  },
] as const;
