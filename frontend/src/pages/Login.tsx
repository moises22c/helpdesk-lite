import { useState } from "react";
import { api } from "../api/client";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "Error al iniciar sesión");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <h3 className="mb-3">Iniciar sesión</h3>

      {err && <div className="alert alert-danger">{String(err)}</div>}

      <form onSubmit={onSubmit} className="card card-body">
        <label className="form-label">Email</label>
        <input
          className="form-control mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-control mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="btn btn-primary w-100">Entrar</button>
        <div className="mt-3 text-center">
          <Link to="/register">Crear cuenta</Link>
        </div>
      </form>
    </div>
  );
}
