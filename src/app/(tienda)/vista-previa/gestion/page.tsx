import { CatalogPreview } from "@/components/catalog/preview";
export default function PreviewManagementPage() {
  return (
    <>
      <p className="eyebrow">GESTIÓN DE PRUEBA</p>
      <h1>Gestioná tu catálogo</h1>
      <CatalogPreview mode="manage" />
    </>
  );
}
