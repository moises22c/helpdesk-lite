import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Link, useNavigate } from "react-router-dom";

type Role = "REQUESTER" | "AGENT" | "ADMIN";

type MeResponse = {
  user: { id: string; name: string; email: string; role: Role };
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: string;
  createdAt: string;
  updatedAt: string;
  requester?: { id: string; name: string; email: string };
  assignedTo?: { id: string; name: string; email: string } | null;
};

type TicketListResponse = {
  items: Ticket[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function asErrorMessage(e: any) {
  const data = e?.response?.data;
  if (!data) return "Error inesperado";
  if (typeof data.error === "string") return data.error;
  return JSON.stringify(data.error);
}

export default function Dashboard() {
  const nav = useNavigate();

  const [me, setMe] = useState<MeResponse["user"] | null>(null);

  // filtros
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [q, setQ] = useState<string>("");

  // paginación
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  // data
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal create
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newPriority, setNewPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  >("MEDIUM");
  const [creating, setCreating] = useState(false);

  const canSeeAll = useMemo(
    () => me?.role === "AGENT" || me?.role === "ADMIN",
    [me?.role],
  );

  async function loadMe() {
    const res = await api.get<MeResponse>("/auth/me");
    setMe(res.data.user);
  }

  async function loadTickets() {
    setLoading(true);
    setErr(null);
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (q.trim()) params.q = q.trim();

      const res = await api.get<TicketListResponse>("/tickets", { params });
      setData(res.data);
    } catch (e: any) {
      setErr(asErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // cargar user (rol) y luego tickets
    (async () => {
      try {
        await loadMe();
      } catch (e: any) {
        // si token expiró o no existe
        localStorage.removeItem("token");
        nav("/login", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // cada vez que cambien filtros/página => recarga
    if (!me) return;
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, page, status, priority]);

  async function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadTickets();
  }

  function logout() {
    localStorage.removeItem("token");
    nav("/login", { replace: true });
  }

  async function createTicket() {
    setCreating(true);
    setErr(null);
    try {
      const res = await api.post<Ticket>("/tickets", {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
      });

      // reset modal
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewCategory("General");
      setNewPriority("MEDIUM");

      // refrescar lista y opcional: ir al detalle
      await loadTickets();
      nav(`/tickets/${res.data.id}`);
    } catch (e: any) {
      setErr(asErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container py-4">
      {/* top bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-1">HelpDesk Lite</h3>
          <div className="text-muted">
            {me ? (
              <>
                {me.name} —{" "}
                <span className="badge text-bg-secondary">{me.role}</span>{" "}
                {canSeeAll ? (
                  <span className="ms-2 badge text-bg-info">Vista global</span>
                ) : (
                  <span className="ms-2 badge text-bg-light">Mis tickets</span>
                )}
              </>
            ) : (
              "Cargando usuario..."
            )}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => setShowCreate(true)}
          >
            + Nuevo ticket
          </button>
          <button className="btn btn-outline-danger" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {/* filtros */}
      <div className="card card-body mb-3">
        <form className="row g-2 align-items-end" onSubmit={onSearchSubmit}>
          <div className="col-12 col-md-3">
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Prioridad</label>
            <select
              className="form-select"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Buscar</label>
            <input
              className="form-control"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Título o descripción..."
            />
          </div>

          <div className="col-12 col-md-2 d-grid">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "Buscando..." : "Aplicar"}
            </button>
          </div>
        </form>
      </div>

      {/* tabla */}
      <div className="card">
        <div className="card-body">
          {loading && <div className="text-muted">Cargando tickets...</div>}

          {!loading && data?.items?.length === 0 && (
            <div className="text-muted">No hay tickets con esos filtros.</div>
          )}

          {!loading && data && data.items.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Categoría</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Actualizado</th>
                    {canSeeAll && <th>Requester</th>}
                    {canSeeAll && <th>Asignado</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.title}</td>
                      <td>{t.category}</td>
                      <td>
                        <span className="badge text-bg-light">
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className="badge text-bg-secondary">
                          {t.status}
                        </span>
                      </td>
                      <td className="text-muted">{formatDate(t.updatedAt)}</td>
                      {canSeeAll && <td>{t.requester?.name ?? "-"}</td>}
                      {canSeeAll && <td>{t.assignedTo?.name ?? "-"}</td>}
                      <td className="text-end">
                        <Link
                          className="btn btn-sm btn-outline-primary"
                          to={`/tickets/${t.id}`}
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* paginación */}
          {data && data.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted">
                Página {data.page} de {data.totalPages} — Total: {data.total}
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={page >= data.totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* modal crear ticket (Bootstrap sin JS extra) */}
      {showCreate && (
        <>
          <div className="modal show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Nuevo ticket</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowCreate(false)}
                  />
                </div>

                <div className="modal-body">
                  <label className="form-label">Título</label>
                  <input
                    className="form-control mb-2"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />

                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-control mb-2"
                    rows={4}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Categoría</label>
                      <input
                        className="form-control"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Prioridad</label>
                      <select
                        className="form-select"
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-muted mt-2" style={{ fontSize: 13 }}>
                    Tip: el backend valida con Zod. Si enviás vacío te va a
                    responder 400 con detalles.
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCreate(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={createTicket}
                    disabled={
                      creating || !newTitle.trim() || newDesc.trim().length < 5
                    }
                  >
                    {creating ? "Creando..." : "Crear"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" />
        </>
      )}
    </div>
  );
}
