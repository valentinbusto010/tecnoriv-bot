import { useState, useEffect, useCallback, useMemo } from "react";

// Sistema de gestión TecnoRiv conectado al bot.
// Los datos viven en Supabase y pasan por el servidor del bot (/api/gestion),
// así que las ventas que cierra el bot por WhatsApp aparecen acá solas.

// ─── API ───────────────────────────────────────────────────────────────────────
const getClave = () => { try { return localStorage.getItem("clavePanel") || ""; } catch { return ""; } };
const setClaveLS = (v) => { try { localStorage.setItem("clavePanel", v); } catch {} };

async function api(ruta, metodo = "GET", body) {
  const r = await fetch("/api/gestion" + ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json", "x-panel-key": getClave() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error || `Error ${r.status}`); e.status = r.status; throw e; }
  return data;
}

// ─── UTILS ─────────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n) || 0);
const fmtDate = (d) => { if (!d) return ""; const [y, m, dia] = String(d).slice(0, 10).split("-"); return `${dia}/${m}/${y}`; };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
const inicioMes = () => today().slice(0, 8) + "01";
const nombreMes = () => { const s = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }); return s[0].toUpperCase() + s.slice(1); };
const mesCorto = () => nombreMes().split(" ")[0];
const waLink = (tel) => tel ? `https://wa.me/${String(tel).replace(/\D/g, "")}` : null;
const fmtTel = (tel) => tel ? "+" + String(tel).replace(/\D/g, "") : "";

const ESTADO_COLORS = { pendiente: "#f59e0b", "en camino": "#0066FF", entregado: "#10b981", cancelado: "#ef4444" };
const ESTADO_LABELS = ["pendiente", "en camino", "entregado", "cancelado"];
const CATS_PRODUCTO = ["Cables", "Cargadores", "Audio", "Wearables", "Accesorios", "Otro"];
const CATS_GASTO = ["Stock", "Marketing", "Envíos", "Operativo", "Impuestos", "Otro"];
const validos = (pedidos) => pedidos.filter(p => p.estado !== "cancelado");
const sum = (arr, k = "monto") => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0);

// ─── ICONS ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };
  const icons = {
    dashboard: <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    pedidos: <svg {...p}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>,
    stock: <svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    finanzas: <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    clientes: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    plus: <svg {...p} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash: <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    warning: <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    close: <svg {...p} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    trend: <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    wa: <svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
    refresh: <svg {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  };
  return icons[name] || null;
};

// ─── UI ────────────────────────────────────────────────────────────────────────
const card = { background: "#0f1117", border: "1px solid #1e2232", borderRadius: "14px" };
const labelSt = { display: "block", color: "#9ca3af", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" };
const fieldSt = { width: "100%", background: "#161b27", border: "1px solid #1e2232", borderRadius: "8px", color: "#fff", padding: "10px 14px", fontSize: "16px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const iconBtn = { background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "4px", display: "flex" };
const statsRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" };
const sectionLabel = { color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" };

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
    <div style={{ ...card, borderRadius: "16px", width: "100%", maxWidth: "480px", padding: "24px", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={iconBtn}><Icon name="close" size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: "14px" }}>
    {label && <label style={labelSt}>{label}</label>}
    <input {...props} style={{ ...fieldSt, ...(props.style || {}) }} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: "14px" }}>
    {label && <label style={labelSt}>{label}</label>}
    <select {...props} style={fieldSt}>{children}</select>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", disabled, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: variant === "primary" ? "#0066FF" : variant === "danger" ? "#ef444422" : "#1e2232",
    color: variant === "danger" ? "#ef4444" : "#fff", border: variant === "danger" ? "1px solid #ef444444" : "none",
    borderRadius: "8px", padding: "10px 18px", fontSize: "14px", fontWeight: 600, cursor: disabled ? "default" : "pointer",
    display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "inherit", opacity: disabled ? 0.5 : 1, ...style
  }}>{children}</button>
);

const Badge = ({ color, children }) => (
  <span style={{ fontSize: "10px", fontWeight: 700, background: color + "22", color, padding: "2px 7px", borderRadius: "100px", whiteSpace: "nowrap" }}>{children}</span>
);

const StatCard = ({ label, value, sub, accent, icon }) => (
  <div style={{ ...card, padding: "16px", minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
      <span style={{ color: "#6b7280", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ color: accent || "#0066FF", opacity: 0.8 }}><Icon name={icon || "trend"} size={16} /></span>
    </div>
    <div style={{ fontSize: "20px", fontWeight: 800, color: accent || "#fff", letterSpacing: "-0.02em", overflowWrap: "anywhere" }}>{value}</div>
    {sub && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{sub}</div>}
  </div>
);

const Header = ({ kicker, title, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
    <div>
      <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "4px" }}>{kicker}</div>
      <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#fff" }}>{title}</h2>
    </div>
    {action}
  </div>
);

const Botones = ({ onCancel, onOk, okLabel, disabled }) => (
  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
    <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
    <Btn onClick={onOk} disabled={disabled}>{okLabel}</Btn>
  </div>
);

const Fila = ({ children, last }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: last ? "none" : "1px solid #1e2232", flexWrap: "wrap", gap: "10px" }}>{children}</div>
);

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
const Dashboard = ({ pedidos, productos, gastos, clientes }) => {
  const ini = inicioMes();
  const delMes = validos(pedidos).filter(p => p.fecha >= ini);
  const ventasMes = sum(delMes);
  const gastosMes = sum(gastos.filter(g => g.fecha >= ini));
  const ganancia = ventasMes - gastosMes;
  const pendientes = pedidos.filter(p => p.estado === "pendiente").length;
  const enCamino = pedidos.filter(p => p.estado === "en camino").length;
  const stockBajo = productos.filter(p => p.activo !== false && p.stock <= p.alerta);
  const delBot = delMes.filter(p => p.origen === "bot").length;
  const nuevosClientes = clientes.filter(c => (c.created_at || "").slice(0, 10) >= ini).length;

  return (
    <div>
      <Header kicker="Resumen general · TecnoRiv" title="Dashboard" />
      <div style={statsRow}>
        <StatCard label="Ventas del mes" value={fmt(ventasMes)} sub={`${nombreMes()} · ${delMes.length} pedidos`} accent="#10b981" />
        <StatCard label="Ganancia estimada" value={fmt(ganancia)} sub={`Gastos: ${fmt(gastosMes)}`} accent={ganancia >= 0 ? "#0066FF" : "#ef4444"} icon="finanzas" />
        <StatCard label="Pendientes" value={pendientes} sub={`${enCamino} en camino`} accent="#f59e0b" icon="pedidos" />
        <StatCard label="Ventas del bot" value={delBot} sub={`${nuevosClientes} clientes nuevos este mes`} accent="#a78bfa" icon="wa" />
      </div>

      {stockBajo.length > 0 && (
        <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", display: "flex", gap: "10px" }}>
          <span style={{ color: "#f59e0b", flexShrink: 0, marginTop: "2px" }}><Icon name="warning" size={16} /></span>
          <div>
            <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>Stock bajo en {stockBajo.length} producto{stockBajo.length > 1 ? "s" : ""}</div>
            <div style={{ color: "#9ca3af", fontSize: "12px" }}>{stockBajo.map(p => `${p.nombre} (${p.stock} ud.)`).join(" · ")}</div>
          </div>
        </div>
      )}

      <div style={{ ...card, padding: "20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>Últimos pedidos</h3>
        {pedidos.length === 0 ? <p style={{ color: "#6b7280", fontSize: "14px" }}>Sin pedidos aún.</p> : pedidos.slice(0, 6).map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e2232", gap: "10px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{p.origen === "bot" && "🤖 "}{p.cliente || fmtTel(p.telefono)}</div>
              <div style={{ color: "#6b7280", fontSize: "12px" }}>{p.cantidad > 1 ? `${p.cantidad}x ` : ""}{p.producto} · {fmtDate(p.fecha)}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ color: "#10b981", fontWeight: 700, fontSize: "14px" }}>{fmt(p.monto)}</div>
              <Badge color={ESTADO_COLORS[p.estado] || "#6b7280"}>{p.estado}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── PEDIDOS ───────────────────────────────────────────────────────────────────
const pedidoVacio = () => ({ cliente: "", telefono: "", producto_id: "", cantidad: 1, monto: "", estado: "pendiente", fecha: today(), canal: "Instagram", entrega: "", pago: "" });

const Pedidos = ({ pedidos, productos, accion }) => {
  const [modal, setModal] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState(pedidoVacio);
  const lista = filtro === "todos" ? pedidos : filtro === "bot" ? pedidos.filter(p => p.origen === "bot") : pedidos.filter(p => p.estado === filtro);

  const elegirProducto = (id, cantidad = form.cantidad) => {
    const prod = productos.find(p => String(p.id) === String(id));
    setForm({ ...form, producto_id: id, cantidad, monto: prod ? Number(prod.precio) * (Number(cantidad) || 1) : form.monto });
  };

  const guardar = async () => {
    if (!form.cliente || !form.producto_id || !form.monto) return;
    const ok = await accion(() => api("/pedidos", "POST", form));
    if (ok) { setModal(false); setForm(pedidoVacio()); }
  };

  return (
    <div>
      <Header kicker="Gestión de pedidos" title="Pedidos" action={<Btn onClick={() => setModal(true)}><Icon name="plus" size={16} /> Nuevo pedido</Btn>} />
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["todos", "bot", ...ESTADO_LABELS].map(e => (
          <button key={e} onClick={() => setFiltro(e)} style={{ background: filtro === e ? "#0066FF" : "#1e2232", color: filtro === e ? "#fff" : "#9ca3af", border: "none", borderRadius: "100px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{e === "bot" ? "🤖 del bot" : e}</button>
        ))}
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        {lista.length === 0 ? <p style={{ color: "#6b7280", fontSize: "14px", padding: "20px", margin: 0 }}>Sin pedidos.</p> : lista.map((p, i) => (
          <Fila key={p.id} last={i === lista.length - 1}>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {p.origen === "bot" && <span title="Venta cerrada por el bot">🤖</span>}
                {p.cliente || fmtTel(p.telefono)}
                {p.telefono && <a href={waLink(p.telefono)} target="_blank" rel="noreferrer" style={{ color: "#10b981", display: "flex" }}><Icon name="wa" size={14} /></a>}
              </div>
              <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "2px" }}>{p.cantidad > 1 ? `${p.cantidad}x ` : ""}{p.producto}{!p.producto_id && p.origen === "bot" && <> <Badge color="#f59e0b">sin vincular al stock</Badge></>}</div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{[p.canal, fmtDate(p.fecha), p.entrega, p.pago].filter(Boolean).join(" · ")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#10b981", fontWeight: 800, fontSize: "15px" }}>{fmt(p.monto)}</span>
              <select value={p.estado} onChange={e => accion(() => api(`/pedidos/${p.id}`, "PATCH", { estado: e.target.value }))} style={{ background: (ESTADO_COLORS[p.estado] || "#6b7280") + "22", color: ESTADO_COLORS[p.estado], border: `1px solid ${ESTADO_COLORS[p.estado]}44`, borderRadius: "100px", padding: "4px 10px", fontSize: "12px", fontWeight: 700, cursor: "pointer", outline: "none" }}>
                {ESTADO_LABELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => confirm("¿Borrar este pedido?") && accion(() => api(`/pedidos/${p.id}`, "DELETE"))} style={iconBtn}><Icon name="trash" size={14} /></button>
            </div>
          </Fila>
        ))}
      </div>

      {modal && (
        <Modal title="Nuevo pedido" onClose={() => setModal(false)}>
          <Input label="Cliente" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} placeholder="Nombre del cliente" />
          <Input label="WhatsApp (opcional)" inputMode="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="5493584123456" />
          <Select label="Producto" value={form.producto_id} onChange={e => elegirProducto(e.target.value)}>
            <option value="">Seleccionar...</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({fmt(p.precio)} · {p.stock} ud.)</option>)}
          </Select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <Input label="Cantidad" type="number" min="1" value={form.cantidad} onChange={e => elegirProducto(form.producto_id, e.target.value)} />
            <Input label="Monto total ($)" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
          </div>
          <Select label="Canal" value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })}>
            {["Instagram", "WhatsApp", "Marketplace", "Web", "Presencial"].map(c => <option key={c}>{c}</option>)}
          </Select>
          <Input label="Entrega (opcional)" value={form.entrega} onChange={e => setForm({ ...form, entrega: e.target.value })} placeholder="Envío a ... / retiro" />
          <Input label="Pago (opcional)" value={form.pago} onChange={e => setForm({ ...form, pago: e.target.value })} placeholder="Transferencia, efectivo..." />
          <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
          <Botones onCancel={() => setModal(false)} onOk={guardar} okLabel="Guardar pedido" disabled={!form.cliente || !form.producto_id || !form.monto} />
        </Modal>
      )}
    </div>
  );
};

// ─── STOCK ─────────────────────────────────────────────────────────────────────
const productoVacio = { nombre: "", categoria: "Cables", precio: "", costo: "", stock: "", alerta: "3", descripcion: "", cuotas_sin_interes: "0", imagen_url: "", activo: true };

const Stock = ({ productos, accion }) => {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(productoVacio);

  const abrir = (p) => {
    setEditando(p ? p.id : null);
    setForm(p ? { ...productoVacio, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])) } : productoVacio);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre || form.precio === "" || form.stock === "") return;
    const body = { nombre: form.nombre, categoria: form.categoria, precio: form.precio, costo: form.costo, stock: form.stock, alerta: form.alerta, descripcion: form.descripcion, cuotas_sin_interes: form.cuotas_sin_interes || 0, imagen_url: form.imagen_url, activo: form.activo };
    const ok = await accion(() => editando ? api(`/productos/${editando}`, "PATCH", body) : api("/productos", "POST", body));
    if (ok) setModal(false);
  };

  const activos = productos.filter(p => p.activo !== false);
  const cats = [...new Set(productos.map(p => p.categoria || "Otro"))];
  const conCosto = activos.filter(p => p.costo);

  return (
    <div>
      <Header kicker="Inventario · el bot vende lo que está acá" title="Stock" action={<Btn onClick={() => abrir(null)}><Icon name="plus" size={16} /> Agregar producto</Btn>} />
      <div style={statsRow}>
        <StatCard label="Productos activos" value={activos.length} icon="stock" />
        <StatCard label="Stock total" value={sum(activos, "stock") + " ud."} icon="stock" />
        <StatCard label="Valor a precio venta" value={fmt(activos.reduce((a, p) => a + Number(p.precio) * p.stock, 0))} sub={conCosto.length ? `A costo: ${fmt(conCosto.reduce((a, p) => a + Number(p.costo) * p.stock, 0))}` : null} accent="#a78bfa" icon="finanzas" />
        <StatCard label="Alertas stock" value={activos.filter(p => p.stock <= p.alerta).length} accent="#f59e0b" icon="warning" />
      </div>

      {productos.length === 0 && <p style={{ color: "#6b7280" }}>Todavía no cargaste productos.</p>}
      {cats.map(cat => {
        const items = productos.filter(p => (p.categoria || "Otro") === cat);
        return (
          <div key={cat} style={{ marginBottom: "20px" }}>
            <div style={{ ...sectionLabel, marginBottom: "8px" }}>{cat}</div>
            <div style={{ ...card, overflow: "hidden" }}>
              {items.map((p, i) => (
                <Fila key={p.id} last={i === items.length - 1}>
                  <div style={{ flex: 1, minWidth: "160px", opacity: p.activo === false ? 0.5 : 1 }}>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {p.nombre}
                      {p.activo !== false && p.stock <= p.alerta && <Badge color="#f59e0b">BAJO</Badge>}
                      {p.activo === false && <Badge color="#6b7280">OCULTO AL BOT</Badge>}
                      {p.cuotas_sin_interes > 0 && <Badge color="#10b981">{p.cuotas_sin_interes} cuotas</Badge>}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{fmt(p.precio)} por unidad{p.costo ? ` · costo ${fmt(p.costo)}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button onClick={() => accion(() => api(`/productos/${p.id}/stock`, "POST", { delta: -1 }))} style={stockBtn}>−</button>
                      <span style={{ color: p.stock <= p.alerta ? "#f59e0b" : "#fff", fontWeight: 800, fontSize: "16px", minWidth: "28px", textAlign: "center" }}>{p.stock}</span>
                      <button onClick={() => accion(() => api(`/productos/${p.id}/stock`, "POST", { delta: 1 }))} style={stockBtn}>+</button>
                    </div>
                    <button onClick={() => abrir(p)} style={iconBtn}><Icon name="edit" size={14} /></button>
                    <button onClick={() => confirm(`¿Borrar ${p.nombre}? Si solo no lo vendés más, mejor editalo y ocultalo.`) && accion(() => api(`/productos/${p.id}`, "DELETE"))} style={iconBtn}><Icon name="trash" size={14} /></button>
                  </div>
                </Fila>
              ))}
            </div>
          </div>
        );
      })}

      {modal && (
        <Modal title={editando ? "Editar producto" : "Nuevo producto"} onClose={() => setModal(false)}>
          <Input label="Nombre (así lo nombra el bot)" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Cable USB-C 2m" />
          <Select label="Categoría" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
            {[...new Set([...CATS_PRODUCTO, form.categoria])].map(c => <option key={c}>{c}</option>)}
          </Select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Input label="Precio venta ($)" type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="0" />
            <Input label="Costo ($, opcional)" type="number" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} placeholder="0" />
            <Input label="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" />
            <Input label="Alerta (mín.)" type="number" value={form.alerta} onChange={e => setForm({ ...form, alerta: e.target.value })} placeholder="3" />
          </div>
          <Input label="Detalle para el bot" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Bluetooth 5.3, 30 hs, negro y blanco" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <Input label="Cuotas s/int." type="number" value={form.cuotas_sin_interes} onChange={e => setForm({ ...form, cuotas_sin_interes: e.target.value })} />
            <Input label="URL de foto (opcional)" value={form.imagen_url} onChange={e => setForm({ ...form, imagen_url: e.target.value })} placeholder="https://..." />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9ca3af", fontSize: "14px", marginBottom: "14px" }}>
            <input type="checkbox" checked={form.activo !== false} onChange={e => setForm({ ...form, activo: e.target.checked })} /> El bot lo puede vender
          </label>
          <Botones onCancel={() => setModal(false)} onOk={guardar} okLabel={editando ? "Guardar cambios" : "Agregar producto"} disabled={!form.nombre || form.precio === "" || form.stock === ""} />
        </Modal>
      )}
    </div>
  );
};
const stockBtn = { width: 30, height: 30, background: "#1e2232", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" };

// ─── FINANZAS ──────────────────────────────────────────────────────────────────
const Finanzas = ({ pedidos, gastos, accion }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ descripcion: "", monto: "", categoria: "Stock", fecha: today() });
  const ini = inicioMes();

  const ingresos = sum(validos(pedidos));
  const totalGastos = sum(gastos);
  const ingresosMes = sum(validos(pedidos).filter(p => p.fecha >= ini));
  const gastosMesLista = gastos.filter(g => g.fecha >= ini);
  const gastosMes = sum(gastosMesLista);
  const catGastos = gastosMesLista.reduce((acc, g) => { acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.monto); return acc; }, {});

  const guardar = async () => {
    if (!form.descripcion || !form.monto) return;
    const ok = await accion(() => api("/gastos", "POST", form));
    if (ok) { setModal(false); setForm({ descripcion: "", monto: "", categoria: "Stock", fecha: today() }); }
  };

  return (
    <div>
      <Header kicker="Caja y movimientos" title="Finanzas" action={<Btn onClick={() => setModal(true)}><Icon name="plus" size={16} /> Registrar gasto</Btn>} />
      <div style={statsRow}>
        <StatCard label={`Resultado ${mesCorto()}`} value={fmt(ingresosMes - gastosMes)} sub={`Ing: ${fmt(ingresosMes)} / Gas: ${fmt(gastosMes)}`} accent={ingresosMes - gastosMes >= 0 ? "#0066FF" : "#ef4444"} />
        <StatCard label="Ingresos totales" value={fmt(ingresos)} accent="#10b981" />
        <StatCard label="Gastos totales" value={fmt(totalGastos)} accent="#ef4444" icon="finanzas" />
        <StatCard label="Ganancia neta" value={fmt(ingresos - totalGastos)} sub="Histórico" accent={ingresos - totalGastos >= 0 ? "#a78bfa" : "#ef4444"} icon="finanzas" />
      </div>

      {gastosMes > 0 && (
        <div style={{ ...card, padding: "18px", marginBottom: "20px" }}>
          <div style={{ ...sectionLabel, marginBottom: "14px" }}>Gastos de {mesCorto()} por categoría</div>
          {Object.entries(catGastos).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
            const pct = Math.round((total / gastosMes) * 100);
            return (
              <div key={cat} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#9ca3af", fontSize: "13px" }}>{cat}</span>
                  <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>{fmt(total)} <span style={{ color: "#6b7280" }}>({pct}%)</span></span>
                </div>
                <div style={{ height: "4px", background: "#1e2232", borderRadius: "100px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#0066FF", borderRadius: "100px" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e2232" }}>
          <span style={sectionLabel}>Gastos registrados</span>
          <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>Tip: desde tu WhatsApp mandale al bot "gasto 15000 marketing Meta Ads"</div>
        </div>
        {gastos.length === 0 ? <p style={{ color: "#6b7280", fontSize: "14px", padding: "20px", margin: 0 }}>Sin gastos registrados.</p> :
          gastos.map((g, i) => (
            <Fila key={g.id} last={i === gastos.length - 1}>
              <div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>{g.descripcion} {g.origen === "whatsapp" && <Badge color="#10b981">WhatsApp</Badge>}</div>
                <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{g.categoria} · {fmtDate(g.fecha)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "14px" }}>−{fmt(g.monto)}</span>
                <button onClick={() => confirm("¿Borrar este gasto?") && accion(() => api(`/gastos/${g.id}`, "DELETE"))} style={iconBtn}><Icon name="trash" size={14} /></button>
              </div>
            </Fila>
          ))}
      </div>

      {modal && (
        <Modal title="Registrar gasto" onClose={() => setModal(false)}>
          <Input label="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Reposición cables" />
          <Input label="Monto ($)" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} placeholder="0" />
          <Select label="Categoría" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
            {CATS_GASTO.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Input label="Fecha" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
          <Botones onCancel={() => setModal(false)} onOk={guardar} okLabel="Guardar gasto" disabled={!form.descripcion || !form.monto} />
        </Modal>
      )}
    </div>
  );
};

// ─── CLIENTES ──────────────────────────────────────────────────────────────────
const Clientes = ({ clientes, pedidos, accion }) => {
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ id: null, nombre: "", telefono: "", notas: "" });
  const [orden, setOrden] = useState("total");

  const filas = useMemo(() => {
    const porCliente = {};
    for (const p of validos(pedidos)) {
      const k = p.cliente_id || (p.telefono ? "t" + p.telefono : null);
      if (!k) continue;
      (porCliente[k] = porCliente[k] || []).push(p);
    }
    return clientes.map(c => {
      const ps = porCliente[c.id] || [];
      return { ...c, pedidos: ps, total: sum(ps), ultima: ps.reduce((m, p) => (p.fecha > m ? p.fecha : m), "") };
    });
  }, [clientes, pedidos]);

  const compradores = filas.filter(f => f.pedidos.length > 0);
  const recompra = compradores.filter(f => f.pedidos.length > 1).length;
  const ticket = compradores.length ? sum(compradores, "total") / compradores.reduce((a, f) => a + f.pedidos.length, 0) : 0;

  const q = busca.trim().toLowerCase();
  const lista = filas
    .filter(f => !q || (f.nombre || "").toLowerCase().includes(q) || (f.telefono || "").includes(q.replace(/\D/g, "") || "§"))
    .sort((a, b) => orden === "total" ? b.total - a.total || (b.ultimo_contacto || "").localeCompare(a.ultimo_contacto || "") : (b.ultimo_contacto || "").localeCompare(a.ultimo_contacto || ""));

  const abrir = (c) => { setForm(c ? { id: c.id, nombre: c.nombre || "", telefono: c.telefono || "", notas: c.notas || "" } : { id: null, nombre: "", telefono: "", notas: "" }); setModal(true); };
  const guardar = async () => {
    const body = { nombre: form.nombre, telefono: form.telefono, notas: form.notas };
    const ok = await accion(() => form.id ? api(`/clientes/${form.id}`, "PATCH", body) : api("/clientes", "POST", { ...body, origen: "Panel" }));
    if (ok) setModal(false);
  };

  return (
    <div>
      <Header kicker="Todos los que escribieron al bot o compraron" title="Clientes" action={<Btn onClick={() => abrir(null)}><Icon name="plus" size={16} /> Nuevo cliente</Btn>} />
      <div style={statsRow}>
        <StatCard label="Contactos" value={clientes.length} sub={`${clientes.length - compradores.length} sin compra todavía`} icon="clientes" />
        <StatCard label="Compradores" value={compradores.length} accent="#10b981" icon="clientes" />
        <StatCard label="Recompra" value={compradores.length ? Math.round(recompra / compradores.length * 100) + "%" : "—"} sub={`${recompra} compraron 2+ veces`} accent="#a78bfa" />
        <StatCard label="Ticket promedio" value={fmt(ticket)} accent="#0066FF" icon="finanzas" />
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nombre o teléfono" style={{ ...fieldSt, flex: 1, minWidth: "200px" }} />
        <select value={orden} onChange={e => setOrden(e.target.value)} style={{ ...fieldSt, width: "auto" }}>
          <option value="total">Más compraron</option>
          <option value="reciente">Último contacto</option>
        </select>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        {lista.length === 0 ? <p style={{ color: "#6b7280", fontSize: "14px", padding: "20px", margin: 0 }}>Sin clientes todavía. Aparecen solos cuando alguien le escribe al bot.</p> : lista.map((c, i) => (
          <div key={c.id} style={{ borderBottom: i === lista.length - 1 ? "none" : "1px solid #1e2232" }}>
            <div onClick={() => setAbierto(abierto === c.id ? null : c.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", gap: "10px", cursor: "pointer", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "160px" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {c.nombre || fmtTel(c.telefono) || "Sin nombre"}
                  {c.pedidos.length > 1 && <Badge color="#a78bfa">recompra</Badge>}
                  {c.pedidos.length === 0 && <Badge color="#6b7280">consulta</Badge>}
                </div>
                <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>
                  {[c.nombre && fmtTel(c.telefono), `${c.pedidos.length} pedido${c.pedidos.length === 1 ? "" : "s"}`, c.ultima ? `última compra ${fmtDate(c.ultima)}` : `escribió ${fmtDate(c.ultimo_contacto)}`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: c.total ? "#10b981" : "#6b7280", fontWeight: 800, fontSize: "15px" }}>{fmt(c.total)}</span>
                {c.telefono && <a href={waLink(c.telefono)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ ...iconBtn, color: "#10b981" }}><Icon name="wa" size={16} /></a>}
                <button onClick={e => { e.stopPropagation(); abrir(c); }} style={iconBtn}><Icon name="edit" size={14} /></button>
              </div>
            </div>
            {abierto === c.id && (
              <div style={{ padding: "0 18px 14px", color: "#9ca3af", fontSize: "13px" }}>
                {c.notas && <div style={{ marginBottom: "8px", color: "#d1d5db" }}>📝 {c.notas}</div>}
                {c.pedidos.length === 0 ? <div>Todavía no compró.</div> : c.pedidos.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #1e2232", gap: "10px" }}>
                    <span>{fmtDate(p.fecha)} · {p.cantidad > 1 ? `${p.cantidad}x ` : ""}{p.producto}</span>
                    <span style={{ color: "#fff", whiteSpace: "nowrap" }}>{fmt(p.monto)} <Badge color={ESTADO_COLORS[p.estado]}>{p.estado}</Badge></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={form.id ? "Editar cliente" : "Nuevo cliente"} onClose={() => setModal(false)}>
          <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          <Input label="WhatsApp" inputMode="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="5493584123456" />
          <Input label="Notas" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Ej: usa iPhone 13, prefiere retiro" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", gap: "10px" }}>
            {form.id ? <Btn variant="danger" onClick={async () => { if (confirm("¿Borrar cliente? Sus pedidos quedan.") && await accion(() => api(`/clientes/${form.id}`, "DELETE"))) setModal(false); }}>Borrar</Btn> : <span />}
            <div style={{ display: "flex", gap: "10px" }}>
              <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn onClick={guardar} disabled={!form.nombre && !form.telefono}>Guardar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
const Login = ({ onOk, error }) => {
  const [clave, setClave] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ ...card, padding: "28px", width: "100%", maxWidth: "380px" }}>
        <div style={{ width: "36px", height: "36px", background: "#0066FF", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, marginBottom: "16px" }}>TR</div>
        <h2 style={{ margin: "0 0 6px", fontSize: "22px" }}>Gestión TecnoRiv</h2>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>Usá la misma contraseña del panel (PANEL_PASSWORD).</p>
        <form onSubmit={e => { e.preventDefault(); setClaveLS(clave); onOk(); }}>
          <Input label="Contraseña" type="password" value={clave} onChange={e => setClave(e.target.value)} autoFocus />
          {error && <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
          <Btn style={{ width: "100%", justifyContent: "center" }}>Entrar</Btn>
        </form>
      </div>
    </div>
  );
};

// ─── APP SHELL ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [datos, setDatos] = useState(null);
  const [auth, setAuth] = useState(getClave() ? "probando" : "no");
  const [loginError, setLoginError] = useState("");
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const d = await api("/datos");
      setDatos(d); setAuth("ok"); setLoginError("");
    } catch (e) {
      if (e.status === 401) { setAuth("no"); setLoginError(getClave() ? "Contraseña incorrecta" : ""); }
      else { setAuth(a => a === "probando" ? "ok" : a); setAviso({ tipo: "error", texto: e.message }); }
    }
  }, []);

  useEffect(() => { if (auth === "probando") cargar(); }, [auth, cargar]);
  // Refresca solo cada 20 s para que entren las ventas del bot.
  useEffect(() => {
    if (auth !== "ok") return;
    const t = setInterval(() => { if (!document.hidden) cargar(); }, 20000);
    const vis = () => { if (!document.hidden) cargar(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [auth, cargar]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 4000); return () => clearTimeout(t); }, [aviso]);

  // Ejecuta un cambio y recarga. Devuelve true si salió bien.
  const accion = useCallback(async (fn) => {
    try { await fn(); await cargar(); return true; }
    catch (e) { setAviso({ tipo: "error", texto: e.message }); return false; }
  }, [cargar]);

  if (auth === "no") return <Shell><Login error={loginError} onOk={() => setAuth("probando")} /></Shell>;
  if (!datos) return <Shell><div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>{aviso ? <span style={{ color: "#ef4444" }}>{aviso.texto}</span> : "Cargando…"}</div></Shell>;

  const { pedidos, productos, gastos, clientes } = datos;
  const pendientesCount = pedidos.filter(p => p.estado === "pendiente").length;
  const tabs = [
    { id: "dashboard", label: "Inicio", icon: "dashboard" },
    { id: "pedidos", label: "Pedidos", icon: "pedidos" },
    { id: "clientes", label: "Clientes", icon: "clientes" },
    { id: "stock", label: "Stock", icon: "stock" },
    { id: "finanzas", label: "Finanzas", icon: "finanzas" },
  ];

  return (
    <Shell>
      <div style={{ background: "#0d1120", borderBottom: "1px solid #1e2232", padding: "0 16px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "28px", height: "28px", background: "#0066FF", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "12px" }}>TR</div>
          <span style={{ fontWeight: 800, fontSize: "15px" }}>TecnoRiv</span>
          <span style={{ color: "#10b981", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>● en vivo</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {pendientesCount > 0 && <div style={{ background: "#f59e0b22", color: "#f59e0b", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "100px", border: "1px solid #f59e0b44" }}>{pendientesCount} pendiente{pendientesCount > 1 ? "s" : ""}</div>}
          <button onClick={cargar} title="Actualizar" style={iconBtn}><Icon name="refresh" size={16} /></button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: "900px", margin: "0 auto", width: "100%", padding: "24px 16px 100px", boxSizing: "border-box" }}>
        {tab === "dashboard" && <Dashboard pedidos={pedidos} productos={productos} gastos={gastos} clientes={clientes} />}
        {tab === "pedidos" && <Pedidos pedidos={pedidos} productos={productos.filter(p => p.activo !== false)} accion={accion} />}
        {tab === "clientes" && <Clientes clientes={clientes} pedidos={pedidos} accion={accion} />}
        {tab === "stock" && <Stock productos={productos} accion={accion} />}
        {tab === "finanzas" && <Finanzas pedidos={pedidos} gastos={gastos} accion={accion} />}
      </div>

      {aviso && <div style={{ position: "fixed", bottom: "84px", left: "16px", right: "16px", maxWidth: "480px", margin: "0 auto", background: "#ef4444", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", zIndex: 2000 }}>{aviso.texto}</div>}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d1120", borderTop: "1px solid #1e2232", display: "flex", justifyContent: "space-around", padding: "8px 0 12px", zIndex: 100 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: tab === t.id ? "#0066FF" : "#6b7280", fontFamily: "inherit", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "4px 8px", position: "relative" }}>
            <Icon name={t.icon} size={20} />
            {t.label}
            {t.id === "pedidos" && pendientesCount > 0 && <span style={{ position: "absolute", top: 0, right: 4, minWidth: "16px", height: "16px", background: "#f59e0b", borderRadius: "100px", fontSize: "9px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}>{pendientesCount}</span>}
          </button>
        ))}
      </div>
    </Shell>
  );
}

const Shell = ({ children }) => (
  <div style={{ minHeight: "100vh", background: "#080b12", fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif", color: "#fff", display: "flex", flexDirection: "column" }}>{children}</div>
);
