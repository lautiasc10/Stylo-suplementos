"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { CatalogManagement } from "@/components/catalog/management";
import { CatalogPreview } from "@/components/catalog/preview";
import { PromotionsManager } from "@/components/commerce/promotions-manager";
import { ManualOrders } from "@/components/commerce/manual-orders";
import {
  previewCatalog,
  previewPromotions,
} from "@/components/commerce/cart-provider";
import { emptyPromotions } from "@/modules/commerce/promotions";
import type { AdminWorkspaceData } from "@/modules/admin/workspace";
import { refreshAdminWorkspace } from "@/modules/admin/workspace-actions";
import { useWorkspaceNavigation, workspacePaths } from "./workspace-navigation";
import { AdminOverview } from "./overview";

const emptyData: AdminWorkspaceData = {
  catalog: null,
  promotions: null,
  orders: null,
  monthlySales: null,
};

export function AdminWorkspace({
  initial = emptyData,
  imageBase = "",
  preview = false,
  restockAvailable = false,
  children,
}: {
  initial?: AdminWorkspaceData;
  imageBase?: string;
  preview?: boolean;
  restockAvailable?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState("");
  const { setReady } = useWorkspaceNavigation();
  const updatedAt = useRef(Date.now());
  const generation = useRef(0);
  const mounted = useRef(false);
  const pending = useRef(false);
  const queued = useRef(false);

  const refresh = useCallback(
    async (force = false): Promise<void> => {
      if (pending.current) {
        if (force) queued.current = true;
        return;
      }
      if (preview || (!force && Date.now() - updatedAt.current < 30_000))
        return;
      pending.current = true;
      const version = generation.current;
      try {
        const next = await refreshAdminWorkspace();
        if (!mounted.current || version !== generation.current) return;
        setData((previous) => ({
          catalog:
            next.catalog &&
            (!previous.catalog ||
              next.catalog.revision >= previous.catalog.revision)
              ? next.catalog
              : previous.catalog,
          promotions:
            next.promotions &&
            (!previous.promotions ||
              next.promotions.revision >= previous.promotions.revision)
              ? next.promotions
              : previous.promotions,
          orders: next.orders ?? previous.orders,
          monthlySales: next.monthlySales,
        }));
        updatedAt.current = Date.now();
        setNotice(
          next.catalog && next.promotions && next.orders && next.monthlySales
            ? ""
            : "No pudimos actualizar todos los datos. Reintentá para ver los últimos cambios.",
        );
      } catch {
        if (mounted.current && version === generation.current)
          setNotice(
            "No pudimos actualizar los datos. Revisá tu conexión y reintentá.",
          );
      } finally {
        pending.current = false;
        if (queued.current && mounted.current) {
          queued.current = false;
          void refresh(true);
        }
      }
    },
    [preview],
  );

  const invalidateGeneration = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    mounted.current = true;
    setReady(true);
    return () => {
      mounted.current = false;
      invalidateGeneration();
      setReady(false);
    };
  }, [setReady, invalidateGeneration]);
  useEffect(() => {
    generation.current++;
    setData((previous) => ({
      catalog:
        initial.catalog &&
        (!previous.catalog ||
          initial.catalog.revision >= previous.catalog.revision)
          ? initial.catalog
          : previous.catalog,
      promotions:
        initial.promotions &&
        (!previous.promotions ||
          initial.promotions.revision >= previous.promotions.revision)
          ? initial.promotions
          : previous.promotions,
      orders: initial.orders ?? previous.orders,
      monthlySales: initial.monthlySales,
    }));
    updatedAt.current = Date.now();
  }, [initial]);
  useEffect(() => {
    if (!preview) return;
    const read = () =>
      setData((previous) => ({
        ...previous,
        catalog: previewCatalog(),
        promotions: { ...emptyPromotions, promotions: previewPromotions() },
        orders: previous.orders ?? [],
      }));
    read();
    window.addEventListener("stylo-preview-change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("stylo-preview-change", read);
      window.removeEventListener("storage", read);
    };
  }, [preview]);
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);
  useEffect(() => {
    const focus = () => {
      void refresh(true);
    };
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  const task = workspacePaths(preview).indexOf(pathname);
  const available = Boolean(
    task === 3 ||
    (data.catalog &&
      (task === 0 || (data.promotions && (task === 1 || data.orders)))),
  );
  return (
    <>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {task === 0
          ? "Catálogo e inventario"
          : task === 1
            ? "Promociones"
            : task === 2
              ? "Ventas y retiros"
              : "Resumen de la tienda"}
      </p>
      {notice && (
        <div className="ui-notice" role="status">
          <p>{notice}</p>
          <button
            type="button"
            className="button button-outline"
            onClick={() => void refresh(true)}
          >
            Reintentar actualización
          </button>
        </div>
      )}
      <section className="admin-dashboard" key={task}>
        {task === 0 && (
          <>
            <p className="eyebrow">CATÁLOGO STYLO</p>
            <h1>Catálogo e inventario</h1>
          </>
        )}
        {available ? (
          <>
            {task === 3 && <AdminOverview catalog={data.catalog} monthlySales={data.monthlySales} preview={preview} />}
            {task === 0 &&
              (preview ? (
                <CatalogPreview mode="manage" />
              ) : (
                <CatalogManagement
                  initial={data.catalog!}
                  imageBase={imageBase}
                  restockAvailable={restockAvailable}
                  onSaved={(catalog) => {
                    generation.current++;
                    setData((previous) => ({ ...previous, catalog }));
                  }}
                />
              ))}
            {task === 1 && (
              <PromotionsManager
                catalog={data.catalog!}
                initial={data.promotions!}
                preview={preview}
                imageBase={imageBase}
                onSaved={(promotions) => {
                  generation.current++;
                  setData((previous) => ({ ...previous, promotions }));
                }}
              />
            )}
            {task === 2 && (
              <ManualOrders
                catalog={data.catalog!}
                promotions={data.promotions!.promotions}
                orders={data.orders!}
                preview={preview}
                onRecorded={(orders) => {
                  generation.current++;
                  setData((previous) => ({ ...previous, orders }));
                  void refresh(true);
                }}
              />
            )}
          </>
        ) : preview ? (
          <p role="status">Preparando panel de prueba…</p>
        ) : (
          <div className="ui-notice" role="alert">
            <p>
              No pudimos cargar esta sección. Revisá la conexión y las
              migraciones del panel.
            </p>
            <button
              type="button"
              className="button button-outline"
              onClick={() => void refresh(true)}
            >
              Reintentar
            </button>
          </div>
        )}
      </section>
      {children}
    </>
  );
}
