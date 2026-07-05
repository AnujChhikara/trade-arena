import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AgentDetail from "./pages/AgentDetail";
import Replay from "./pages/Replay";

//
function Header() {
  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: 32,
        background: "#fff",
      }}
    >
      <strong style={{ fontSize: 18, color: "#111827" }}>Trade Arena</strong>
      <nav style={{ display: "flex", gap: 16 }}>
        <NavLink
          to="/"
          style={({ isActive }) => ({
            color: isActive ? "#2563eb" : "#6b7280",
            textDecoration: "none",
            fontWeight: isActive ? 600 : 400,
          })}
          end
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/replay"
          style={({ isActive }) => ({
            color: isActive ? "#2563eb" : "#6b7280",
            textDecoration: "none",
            fontWeight: isActive ? 600 : 400,
          })}
        >
          Replay
        </NavLink>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        color: "#111827",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <Header />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/replay" element={<Replay />} />
        </Routes>
      </main>
    </div>
  );
}
