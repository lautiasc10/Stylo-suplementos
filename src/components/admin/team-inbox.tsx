"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  readTeamInbox,
  type TeamInboxData,
} from "@/modules/storefront/team-inbox-actions";
import { reviewTeamApplication } from "@/modules/storefront/team-actions";
import {
  teamKinds,
  teamStatuses,
  type TeamApplication,
} from "@/modules/storefront/team";
import {
  readTeamPreview,
  teamPreviewKey,
} from "@/modules/storefront/team-preview";
import { orderDate } from "@/modules/admin/order-date";
import "../../app/team-inbox.css";

function TeamReview({
  application,
  preview,
  onSaved,
}: {
  application: TeamApplication;
  preview: boolean;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      if (preview) {
        const rows = readTeamPreview().map((row) =>
          row.id === application.id
            ? {
                ...row,
                status: String(form.get("status")) as TeamApplication["status"],
                notes: String(form.get("notes") ?? ""),
                updated_at: new Date().toISOString(),
              }
            : row,
        );
        localStorage.setItem(teamPreviewKey, JSON.stringify(rows));
      } else {
        const result = await reviewTeamApplication(form);
        if (result.error) {
          setMessage(result.error);
          return;
        }
      }
      setMessage("Seguimiento guardado.");
      onSaved();
    } catch {
      setMessage("No pudimos guardar el seguimiento. Reintentá.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="team-review-form">
      <input type="hidden" name="id" value={application.id} />
      <input type="hidden" name="updatedAt" value={application.updated_at} />
      <label>
        Estado
        <select name="status" defaultValue={application.status} disabled={busy}>
          {Object.entries(teamStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notas internas
        <textarea
          name="notes"
          defaultValue={application.notes}
          rows={3}
          maxLength={2000}
          disabled={busy}
        />
      </label>
      <p>
        Las notas son privadas. Guardar un estado no envía mensajes ni emails.
      </p>
      <button className="button button-gold" type="submit" disabled={busy}>
        {busy ? "Guardando…" : "Guardar seguimiento"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

export function TeamInbox({
  initial = { rows: [], total: 0, error: "" },
  preview = false,
}: {
  initial?: TeamInboxData;
  preview?: boolean;
}) {
  const [data, setData] = useState(initial),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("");
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const initialRead = useRef(true);
  const generation = useRef(0);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  const load = useCallback(async () => {
    const token = ++generation.current;
    setBusy(true);
    try {
      let next: TeamInboxData;
      if (preview) {
        const search = query.trim().toLocaleLowerCase("es-AR");
        const rows = readTeamPreview().filter(
          (row) =>
            (!status || row.status === status) &&
            (!search ||
              (search.includes("@") ? row.email : row.name)
                .toLocaleLowerCase("es-AR")
                .includes(search)),
        );
        next = {
          rows: rows.slice((page - 1) * 25, page * 25),
          total: rows.length,
          error: "",
        };
      } else next = await readTeamInbox({ query, status, page });
      if (generation.current === token) setData(next);
    } catch {
      if (generation.current === token)
        setData({
          rows: [],
          total: 0,
          error: "No pudimos cargar las consultas. Reintentá.",
        });
    } finally {
      if (generation.current === token) setBusy(false);
    }
  }, [page, preview, query, status]);
  useEffect(() => {
    if (initialRead.current) {
      initialRead.current = false;
      if (!preview) return;
    }
    const timer = setTimeout(() => void load(), 300);
    return () => {
      clearTimeout(timer);
      invalidate();
    };
  }, [load, preview, invalidate]);
  const pages = Math.max(1, Math.ceil(data.total / 25));
  return (
    <section className="admin-team-inbox" aria-labelledby="team-inbox-title">
      <header className="admin-premium-heading">
        <div>
          <p className="eyebrow">TEAM STYLO</p>
          <h1 id="team-inbox-title">Atletas y profesores</h1>
          <p>Consultas recibidas desde el formulario de la web.</p>
        </div>
        <button
          className="button button-outline"
          type="button"
          onClick={() => void load()}
          disabled={busy}
        >
          Actualizar
        </button>
      </header>
      {preview && (
        <p className="preview-notice">
          Panel de prueba · Solo consultas ficticias de este navegador.
        </p>
      )}
      {saved && (
        <p className="ui-notice" role="status">
          Seguimiento guardado.
        </p>
      )}
      <div className="team-inbox-filters">
        <label>
          Buscar nombre o email
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            maxLength={120}
            placeholder="Nombre o email con @"
          />
        </label>
        <label>
          Filtrar por estado
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(teamStatuses).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="team-inbox-count" role="status">
        {busy
          ? "Cargando consultas…"
          : `${data.total} consulta${data.total === 1 ? "" : "s"}`}
      </p>
      {data.error ? (
        <div className="ui-notice" role="alert">
          <p>{data.error}</p>
          <button className="button button-outline" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className="team-inbox-list" aria-busy={busy}>
          {!data.rows.length && !busy && (
            <div className="team-inbox-empty">
              <h2>
                {query || status
                  ? "No hay coincidencias"
                  : "Todavía no hay consultas"}
              </h2>
              <p>
                {query || status
                  ? "Probá con otro nombre, email o estado."
                  : "Las consultas de atletas y profesores aparecerán acá cuando lleguen."}
              </p>
            </div>
          )}
          {data.rows.map((row) => {
            const date = orderDate(row.created_at);
            const handle = row.instagram.replace(/^@/, "");
            return (
              <details className="team-inbox-item" key={row.id}>
                <summary>
                  <span>
                    <strong>{row.name}</strong>
                    <span>
                      {teamKinds[row.kind]} · {row.discipline}
                    </span>
                  </span>
                  <span className="team-inbox-state" data-state={row.status}>
                    {teamStatuses[row.status]}
                  </span>
                  <time dateTime={row.created_at}>
                    {date.date}
                    <span>{date.time}</span>
                  </time>
                </summary>
                <div className="team-inbox-detail">
                  <div>
                    <dl>
                      <div>
                        <dt>Email</dt>
                        <dd>
                          <a href={`mailto:${encodeURIComponent(row.email)}`}>
                            {row.email}
                          </a>
                        </dd>
                      </div>
                      {row.instagram && (
                        <div>
                          <dt>Instagram</dt>
                          <dd>
                            {/^[A-Za-z0-9._]{1,30}$/.test(handle) ? (
                              <a
                                href={`https://www.instagram.com/${handle}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {row.instagram}
                              </a>
                            ) : (
                              row.instagram
                            )}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>Mensaje</dt>
                        <dd className="team-inbox-message">
                          {row.message || "Sin mensaje adicional."}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <TeamReview
                    key={row.updated_at}
                    application={row}
                    preview={preview}
                    onSaved={() => {
                      setSaved(true);
                      void load();
                    }}
                  />
                </div>
              </details>
            );
          })}
        </div>
      )}
      {pages > 1 && (
        <nav
          className="team-inbox-pagination"
          aria-label="Páginas de consultas"
        >
          <button
            className="button button-outline"
            disabled={busy || page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            className="button button-outline"
            disabled={busy || page >= pages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  );
}
