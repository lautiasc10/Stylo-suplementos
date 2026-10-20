/** Editorial collections for the owner's reference landing, using actual catalog categories. */
export const CATALOG_GOALS = [
  {
    slug: "ganar-musculo",
    number: "01",
    name: "Ganar músculo",
    description: "Proteína, creatina y ganadores de peso.",
    tags: ["Whey", "Creatina", "Gainers"],
    categories: ["proteinas", "creatinas", "ganadores-de-masa"],
    image: "/reference/goal-muscle.jpg",
  },
  {
    slug: "rendir-mas",
    number: "02",
    name: "Rendir más",
    description: "Suplementos para acompañar tus entrenamientos.",
    tags: ["Pre-entreno", "Creatina"],
    categories: ["pre-entrenos", "creatinas"],
    image: "/reference/goal-perform.jpg",
  },
  {
    slug: "recuperarte",
    number: "03",
    name: "Recuperarte",
    description: "Aminoácidos, colágeno y minerales.",
    tags: ["Aminoácidos", "Colágeno", "Minerales"],
    categories: ["aminoacidos", "colageno", "vitaminas-y-minerales"],
    image: "/reference/goal-recover.jpg",
  },
] as const;
