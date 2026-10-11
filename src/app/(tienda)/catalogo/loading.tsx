export default function CatalogLoading() {
  return (
    <div
      className="container interior-page"
      role="status"
      aria-label="Cargando catálogo"
    >
      <div className="catalog-skeleton-title" />
      <div className="product-grid">
        {[1, 2, 3].map((id) => (
          <div key={id} className="catalog-skeleton-card" />
        ))}
      </div>
      <span className="sr-only">Cargando catálogo…</span>
    </div>
  );
}
