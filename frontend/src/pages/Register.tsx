import { useState } from "react";
import { api } from "../api/client";
import { Link, useNavigate } from "react-router-dom";

function asErrorMessage(e: any) {
  // backend a veces devuelve { error: "..." } o { error: { fieldErrors... } }
  const data = e?.response?.data;
  if (!data) return "Error inesperado";
  if (typeof data.error === "string") return data.error;
  return JSON.stringify(data.error);
}

export default function Register() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("token", res.data.token);
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(asErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h3 className="mb-3">Crear cuenta</h3>

      {err && <div className="alert alert-danger">{err}</div>}

      <form onSubmit={onSubmit} className="card card-body">
        <label className="form-label">Nombre</label>
        <input
          className="form-control mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
        />

        <label className="form-label">Email</label>
        <input
          className="form-control mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
        />

        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-control mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="mínimo 6 caracteres"
        />

        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "Creando..." : "Crear cuenta"}
        </button>

        <div className="mt-3 text-center">
          <span>¿Ya tenés cuenta? </span>
          <Link to="/login">Iniciar sesión</Link>
        </div>
      </form>
    </div>
  );
}
