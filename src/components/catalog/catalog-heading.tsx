export function CatalogHeading({
  title,
  description,
  preview = false,
}: {
  title: string;
  description?: string;
  preview?: boolean;
}) {
  return (
    <header className="catalog-campaign">
      <div className="catalog-campaign-copy">
        <p className="eyebrow">
          {preview ? "EXPLORÁ STYLO" : "LA SELECCIÓN STYLO"}
        </p>
        <h1>{title}</h1>
        {description && <p className="page-intro">{description}</p>}
      </div>
    </header>
  );
}
