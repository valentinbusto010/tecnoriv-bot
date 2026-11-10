import { useState, useEffect, useCallback, useMemo } from "react";
import { Fondo, Marca3D, MiniLogo, card, fieldSt, chipSt, btnFondo } from "../compartido/tema.jsx";

// Catálogo público de Tecno Riv: productos y precios en vivo (misma base que el bot y /gestion).
// El cliente suma productos al carrito (sección aparte), deja sus datos y elige cómo pagar:
// tarjeta (Mercado Pago), transferencia o efectivo. El pedido entra solo a /gestion (ver src/checkout.js).

const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n) || 0);
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const hace = (iso) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? "recién" : s < 3600 ? `hace ${Math.round(s / 60)} min` : "hace un rato";
};
const pct = (p) => p.precio_anterior ? Math.round((1 - p.precio / p.precio_anterior) * 100) : 0;

const Icon = ({ name, size = 18 }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const i = {
    wa: <svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
    buscar: <svg {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    bolsa: <svg {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    close: <svg {...p} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    camion: <svg {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    escudo: <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    tarjeta: <svg {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    ig: <svg {...p}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>,
    caja: <svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    carrito: <svg {...p}><circle cx="9" cy="21" r="1.4"/><circle cx="19" cy="21" r="1.4"/><path d="M1 2h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 7H6"/></svg>,
    atras: <svg {...p} strokeWidth="2.4"><polyline points="15 18 9 12 15 6"/></svg>,
    banco: <svg {...p}><path d="M3 10 12 4l9 6"/><line x1="4" y1="20" x2="20" y2="20"/><line x1="6" y1="10" x2="6" y2="17"/><line x1="10" y1="10" x2="10" y2="17"/><line x1="14" y1="10" x2="14" y2="17"/><line x1="18" y1="10" x2="18" y2="17"/></svg>,
    billete: <svg {...p}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>,
    check: <svg {...p} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
    alerta: <svg {...p} strokeWidth="2.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    tacho: <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  };
  return i[name] || null;
};

const Btn = ({ children, onClick, variant = "primary", disabled, style = {}, href }) => {
  const st = { ...btnFondo(variant), color: "#fff", border: variant === "ghost" ? "1px solid rgba(255,255,255,0.1)" : "none", borderRadius: "12px", padding: "12px 18px", fontSize: "15px", fontWeight: 700, cursor: disabled ? "default" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", opacity: disabled ? 0.45 : 1, textDecoration: "none", ...style };
  return href ? <a href={href} target="_blank" rel="noreferrer" style={st}>{children}</a> : <button onClick={onClick} disabled={disabled} style={st}>{children}</button>;
};
const verde = { background: "linear-gradient(135deg,#25d366,#128c4a)", boxShadow: "0 8px 22px -8px rgba(37,211,102,0.7)" };

const Etiqueta = ({ color, children }) => (
  <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.04em", background: color, color: "#fff", padding: "3px 8px", borderRadius: "100px", whiteSpace: "nowrap", boxShadow: "0 4px 10px -4px rgba(0,0,0,.6)" }}>{children}</span>
);

const Foto = ({ p, alto }) => (
  <div style={{ position: "relative", aspectRatio: "1", background: "rgba(255,255,255,0.03)", borderRadius: "12px", overflow: "hidden", ...(alto ? { height: alto, aspectRatio: "auto" } : {}) }}>
    {p.imagen ? <img src={p.imagen} alt={p.nombre} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: p.estado === "agotado" ? "grayscale(.8) brightness(.6)" : "none" }} />
      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}><Icon name="caja" size={42} /></div>}
    <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: "4px", flexWrap: "wrap" }}>
      {pct(p) > 0 && <Etiqueta color="#E5262B">{pct(p)}% OFF</Etiqueta>}
      {p.estado === "ultimas" && <Etiqueta color="#d97706">ÚLTIMAS UNIDADES</Etiqueta>}
      {p.estado === "agotado" && <Etiqueta color="#475569">AGOTADO</Etiqueta>}
      {p.regalo && <Etiqueta color="#0066FF">🎁 CON REGALO</Etiqueta>}
    </div>
  </div>
);

const Precio = ({ p, grande, descEfectivo }) => (
  <div>
    {p.precio_anterior && <div style={{ color: "#6b7280", fontSize: grande ? "15px" : "12px", textDecoration: "line-through" }}>{fmt(p.precio_anterior)}</div>}
    <div style={{ fontSize: grande ? "30px" : "19px", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>{fmt(p.precio)}</div>
    {descEfectivo > 0 && p.precio_efectivo < p.precio && (
      <div style={{ marginTop: grande ? "6px" : "4px", display: "inline-flex", flexDirection: "column", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: "8px", padding: grande ? "6px 10px" : "4px 7px" }}>
        <span style={{ color: "#34d399", fontSize: grande ? "17px" : "13px", fontWeight: 800, letterSpacing: "-0.01em" }}>{fmt(p.precio_efectivo)}</span>
        <span style={{ color: "#6ee7b7", fontSize: grande ? "12px" : "10px", fontWeight: 600 }}>💵 {descEfectivo}% OFF en efectivo</span>
      </div>
    )}
    {p.cuotas > 0 && <div style={{ color: "#10b981", fontSize: grande ? "14px" : "11px", fontWeight: 700 }}>{p.cuotas} cuotas sin interés</div>}
  </div>
);

const Cantidad = ({ n, onMas, onMenos }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "3px" }}>
    <button onClick={onMenos} style={{ width: 30, height: 30, border: "none", borderRadius: "8px", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "17px", cursor: "pointer" }}>−</button>
    <span style={{ minWidth: 22, textAlign: "center", fontWeight: 800 }}>{n}</span>
    <button onClick={onMas} style={{ width: 30, height: 30, border: "none", borderRadius: "8px", background: "rgba(0,102,255,0.35)", color: "#fff", fontSize: "17px", cursor: "pointer" }}>+</button>
  </div>
);

export default function App() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [buscar, setBuscar] = useState("");
  const [cat, setCat] = useState("Todo");
  const [carrito, setCarrito] = useState(() => leer("carritoTR", {}));
  // ?p=42 abre ese producto (lo usan los links del catálogo de WhatsApp/Instagram)
  const [abierto, setAbierto] = useState(() => { try { return Number(new URLSearchParams(window.location.search).get("p")) || null; } catch { return null; } });
  // Vuelta de Mercado Pago: /catalogo?pago=ok&c=W-XXXXXX
  const vuelta = useMemo(() => { try { const q = new URLSearchParams(window.location.search); const c = (q.get("c") || "").toUpperCase(); return /^W-[A-Z2-9]{6}$/.test(c) ? { codigo: c, pago: q.get("pago") } : null; } catch { return null; } }, []);
  // Secciones: catálogo | carrito | datos (entrega y pago) | listo (confirmación)
  const [vista, setVista] = useState(vuelta ? "listo" : "catalogo");
  const [form, setForm] = useState(() => ({ nombre: "", telefono: "", entrega: "envio", direccion: "", nota: "", pago: "", ...leer("datosTR", {}) }));
  const [pedido, setPedido] = useState(() => (vuelta ? null : leer("pedidoTR", null)));
  const [verificando, setVerificando] = useState(Boolean(vuelta));
  const [enviando, setEnviando] = useState(false);
  const [errPedido, setErrPedido] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [, setTic] = useState(0);

  // Se actualiza solo: al abrir, cada 60 s y al volver a la pestaña.
  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/catalogo", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      setDatos(d); setError("");
    } catch (e) { setError(e.message || "No se pudo cargar"); }
  }, []);
  useEffect(() => {
    cargar();
    const t = setInterval(() => { if (!document.hidden) cargar(); }, 60000);
    const t2 = setInterval(() => setTic(x => x + 1), 30000);
    const vis = () => { if (!document.hidden) cargar(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); clearInterval(t2); document.removeEventListener("visibilitychange", vis); };
  }, [cargar]);
  useEffect(() => guardar("carritoTR", carrito), [carrito]);
  useEffect(() => guardar("datosTR", form), [form]);
  useEffect(() => { if (pedido) guardar("pedidoTR", { ...pedido, init_point: undefined }); }, [pedido]);
  // El botón "atrás" del celu vuelve al catálogo en vez de salir de la página.
  useEffect(() => {
    const pop = () => setVista("catalogo");
    const show = (e) => { if (e.persisted) setEnviando(false); };
    window.addEventListener("popstate", pop); window.addEventListener("pageshow", show);
    return () => { window.removeEventListener("popstate", pop); window.removeEventListener("pageshow", show); };
  }, []);
  // Al volver de Mercado Pago preguntamos al servidor cómo quedó el pago (él lo verifica con Mercado Pago).
  useEffect(() => {
    if (!vuelta) return;
    let vivo = true, n = 0, t;
    const ver = async () => {
      try {
        const r = await fetch(`/api/catalogo/pedido/${vuelta.codigo}`, { cache: "no-store" });
        const d = await r.json();
        if (!vivo) return;
        if (r.ok) {
          setPedido({ ...d, guardado: Date.now() });
          if (d.pago_estado === "aprobado") setCarrito({});
          // Mercado Pago puede tardar unos segundos en confirmar: reintentamos un par de veces.
          if (d.pago_estado === "esperando" && !d.cancelado && vuelta.pago === "ok" && n++ < 4) { t = setTimeout(ver, 2500); return; }
        }
      } catch {}
      if (vivo) setVerificando(false);
    };
    ver();
    try { window.history.replaceState(null, "", window.location.pathname); } catch {}
    return () => { vivo = false; clearTimeout(t); };
  }, [vuelta]);
  // Si un producto se agota o desaparece, sale del carrito.
  useEffect(() => {
    if (!datos) return;
    setCarrito(c => Object.fromEntries(Object.entries(c).filter(([id]) => datos.productos.some(p => String(p.id) === id && p.estado !== "agotado"))));
  }, [datos]);

  const productos = datos?.productos || [];
  const cats = useMemo(() => ["Todo", ...new Set(productos.map(p => p.categoria))], [productos]);
  const lista = productos
    .filter(p => cat === "Todo" || p.categoria === cat)
    .filter(p => !buscar || (p.nombre + " " + p.descripcion + " " + p.categoria).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(buscar.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")));
  const items = Object.entries(carrito).map(([id, n]) => ({ p: productos.find(x => String(x.id) === id), n })).filter(x => x.p);
  const total = items.reduce((a, x) => a + x.p.precio * x.n, 0);
  const totalEfectivo = items.reduce((a, x) => a + (x.p.precio_efectivo ?? x.p.precio) * x.n, 0);
  const descEf = datos?.negocio?.descuento_efectivo || 0;
  const unidades = items.reduce((a, x) => a + x.n, 0);
  const poner = (id, n) => setCarrito(c => { const k = String(id); const o = { ...c }; if (n <= 0) delete o[k]; else o[k] = Math.min(n, 20); return o; });
  const wa = datos?.negocio?.wa;
  const linkWa = (texto) => `https://wa.me/${wa}?text=${encodeURIComponent(texto)}`;
  const mensajePedido = () => [
    "¡Hola Tecno Riv! 👋 Quiero hacer este pedido del catálogo:",
    "",
    ...items.map(x => `• ${x.n > 1 ? x.n + "x " : ""}${x.p.nombre} — ${fmt(x.p.precio * x.n)}`),
    "",
    `Total: ${fmt(total)}${descEf && totalEfectivo < total ? ` (en efectivo: ${fmt(totalEfectivo)}, ${descEf}% OFF)` : ""}`,
    "¿Me confirman disponibilidad y cómo seguimos?",
  ].join("\n");
  const ir = (v) => {
    if (v !== "catalogo" && vista === "catalogo") { try { window.history.pushState({ tr: 1 }, "", "#carrito"); } catch {} }
    setErrPedido(""); setVista(v); window.scrollTo(0, 0);
  };
  const volver = () => { if (window.location.hash === "#carrito") window.history.back(); else setVista("catalogo"); window.scrollTo(0, 0); };
  // Regalo de la promo: uno por cada producto de la categoría (lo confirma el servidor según el stock).
  const regalos = datos?.promo?.regalo ? items.filter(x => x.p.regalo).reduce((a, x) => a + x.n, 0) : 0;
  const totalPago = form.pago === "efectivo" ? totalEfectivo : total;
  const campo = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const confirmar = async () => {
    setErrPedido("");
    if (form.nombre.trim().length < 3) return setErrPedido("Escribí tu nombre y apellido.");
    if (form.telefono.replace(/\D/g, "").length < 10) return setErrPedido("Escribí tu WhatsApp con característica (ej: 358 4123456).");
    if (form.entrega === "envio" && form.direccion.trim().length < 4) return setErrPedido("Escribí la dirección de entrega.");
    if (!form.pago) return setErrPedido("Elegí cómo querés pagar.");
    setEnviando(true);
    try {
      const r = await fetch("/api/catalogo/pedido", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, items: items.map(x => ({ id: x.p.id, n: x.n })) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No pudimos procesar el pedido. Probá de nuevo.");
      setPedido({ ...d, guardado: Date.now() });
      if (d.init_point) { window.location.href = d.init_point; return; } // a Mercado Pago; el carrito se vacía cuando el pago se aprueba
      setCarrito({}); setVista("listo"); window.scrollTo(0, 0);
    } catch (e) { setErrPedido(e.message); cargar(); }
    setEnviando(false);
  };
  const reintentarPago = async () => {
    setErrPedido(""); setEnviando(true);
    try {
      const r = await fetch(`/api/catalogo/pedido/${pedido.codigo}/pagar`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.init_point) { window.location.href = d.init_point; return; }
      if (r.status === 410) setPedido(p => ({ ...p, cancelado: true })); else setErrPedido(d.error || "No se pudo abrir Mercado Pago. Probá de nuevo.");
    } catch { setErrPedido("No se pudo abrir Mercado Pago. Revisá tu conexión."); }
    setEnviando(false);
  };
  const copiarAlias = async (alias) => { try { await navigator.clipboard.writeText(alias); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {} };
  const mensajeProducto = (p) => `¡Hola Tecno Riv! 👋 Me interesa el ${p.nombre} (${fmt(p.precio)}) que vi en el catálogo. ¿Está disponible?`;

  if (!datos) return (
    <Shell>
      <div style={{ padding: "30vh 16px 0", textAlign: "center", color: error ? "#fca5a5" : "#6b7280" }}>
        {error ? <>{error}<div style={{ marginTop: 14 }}><Btn variant="ghost" onClick={cargar}>Reintentar</Btn></div></> : "Cargando catálogo…"}
      </div>
    </Shell>
  );

  const { negocio, promo } = datos;
  const p = abierto && productos.find(x => x.id === abierto);

  // ───────── CARRITO: sección aparte (carrito → datos y pago → listo) ─────────
  if (vista !== "catalogo") {
    const pagos = datos.pagos || { tarjeta: "link", transferencia: true, efectivo: true };
    const medios = [
      pagos.tarjeta && { id: "tarjeta", ic: "tarjeta", t: "Tarjeta de crédito o débito", s: pagos.tarjeta === "online" ? "Pagás ahora, seguro con Mercado Pago" : "Te mandamos el link de pago por WhatsApp" },
      pagos.transferencia && { id: "transferencia", ic: "banco", t: "Transferencia", s: "Te mostramos el alias al confirmar" },
      pagos.efectivo && { id: "efectivo", ic: "billete", t: "Efectivo", s: descEf > 0 && totalEfectivo < total ? `${descEf}% OFF: pagás ${fmt(totalEfectivo)} al recibir` : "Pagás al recibir o retirar" },
    ].filter(Boolean);
    const paso = vista === "carrito" ? 1 : vista === "datos" ? 2 : 3;
    const P = pedido;
    const est = !P ? "" : P.cancelado || P.pago_estado === "vencido" ? "vencido" : P.pago_estado;
    const waPedido = P && {
      aprobado: `¡Hola Tecno Riv! 👋 Pagué con tarjeta el pedido ${P.codigo} del catálogo (${fmt(P.total)}). ¿Coordinamos la entrega?`,
      a_confirmar: `¡Hola Tecno Riv! 👋 Hice el pedido ${P.codigo} en el catálogo y pago por transferencia (${fmt(P.total)}). Te mando el comprobante.`,
      contraentrega: `¡Hola Tecno Riv! 👋 Hice el pedido ${P.codigo} en el catálogo (${fmt(P.total)}, pago en efectivo). ¿Coordinamos la entrega?`,
      link: `¡Hola Tecno Riv! 👋 Hice el pedido ${P.codigo} en el catálogo (${fmt(P.total)}). ¿Me pasan el link para pagar con tarjeta?`,
    }[est];
    const titulo = { fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 14px" };
    const sub = { color: "#1EB6FF", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", margin: "20px 0 10px" };
    const rotulo = { display: "block", color: "#9ca3af", fontSize: "13px", margin: "0 0 6px" };
    const campoSt = { ...fieldSt, borderRadius: "12px", padding: "13px 14px", marginBottom: "12px" };
    const opcion = (on) => ({ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex", gap: "12px", alignItems: "center", width: "100%", padding: "13px 14px", borderRadius: "14px", marginBottom: "8px", border: on ? "1.5px solid #1EB6FF" : "1px solid rgba(255,255,255,0.1)", background: on ? "rgba(0,102,255,0.16)" : "rgba(255,255,255,0.03)" });
    const punto = (on) => ({ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, boxSizing: "border-box", border: on ? "6px solid #1EB6FF" : "2px solid rgba(255,255,255,0.3)", background: on ? "#fff" : "transparent" });
    const Resumen = ({ lineas, tot }) => (
      <div style={{ ...card, padding: "14px 16px" }}>
        {lineas.map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px", padding: "5px 0", color: "#d1d5db" }}>
            <span>{l.regalo ? "🎁 " : ""}{l.cantidad > 1 ? `${l.cantidad}x ` : ""}{l.producto}</span>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap", color: l.regalo ? "#93c5fd" : "#fff" }}>{l.regalo ? "Gratis" : fmt(l.monto)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "5px 0", color: "#d1d5db" }}><span>Envío en Río Cuarto</span><span style={{ fontWeight: 700, color: "#34d399" }}>Gratis</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "8px", paddingTop: "10px" }}>
          <span style={{ color: "#9ca3af" }}>Total</span><span style={{ fontSize: "26px", fontWeight: 800 }}>{fmt(tot)}</span>
        </div>
      </div>
    );
    const lineasCarrito = [...items.map(x => ({ producto: x.p.nombre, cantidad: x.n, monto: (form.pago === "efectivo" ? (x.p.precio_efectivo ?? x.p.precio) : x.p.precio) * x.n })), ...(regalos ? [{ producto: promo.regalo.nombre, cantidad: regalos, regalo: true }] : [])];

    return (
      <Shell>
        <div className="tr-glass-bar" style={{ borderBottom: "1px solid", padding: "0 8px 0 4px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <button className="tr-op" onClick={vista === "datos" ? () => ir("carrito") : volver} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: "12px", color: "#fff", fontWeight: 700, fontSize: "14px" }}>
            <Icon name="atras" size={18} /> {vista === "datos" ? "Carrito" : "Seguir comprando"}
          </button>
          <div style={{ paddingRight: "8px" }}><MiniLogo alto={28} /></div>
        </div>

        <div style={{ maxWidth: "560px", margin: "0 auto", width: "100%", padding: "18px 16px 60px", boxSizing: "border-box" }}>
          {/* Pasos */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }} aria-label={`Paso ${paso} de 3`}>
            {["Carrito", "Datos y pago", "Listo"].map((t, i) => (
              <div key={t} style={{ flex: 1 }}>
                <div style={{ height: 4, borderRadius: 2, background: i < paso ? "#1EB6FF" : "rgba(255,255,255,0.12)" }} />
                <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "6px", color: i < paso ? "#fff" : "#6b7280" }}>{i + 1}. {t}</div>
              </div>
            ))}
          </div>

          {/* 1 · Carrito */}
          {vista === "carrito" && (items.length === 0 ? (
            <div style={{ ...card, padding: "36px 20px", textAlign: "center" }}>
              <div style={{ color: "#334155", display: "flex", justifyContent: "center", marginBottom: "10px" }}><Icon name="carrito" size={44} /></div>
              <div style={{ fontWeight: 800, fontSize: "18px", marginBottom: "6px" }}>Tu carrito está vacío</div>
              <div style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "18px" }}>Sumá los productos que te gusten y volvé acá para comprarlos.</div>
              <Btn onClick={volver}>Ver productos</Btn>
            </div>
          ) : <>
            <h2 style={titulo}>Tu carrito</h2>
            <div style={{ ...card, padding: "4px 14px" }}>
              {items.map(({ p: x, n }, i) => (
                <div key={x.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px 0", borderBottom: i < items.length - 1 || regalos ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                  <div style={{ width: 64, flexShrink: 0 }}><Foto p={{ ...x, precio_anterior: null, estado: "disponible", regalo: false }} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.3 }}>{x.nombre}</div>
                    <div style={{ color: "#9ca3af", fontSize: "12px", margin: "2px 0 8px" }}>{fmt(x.precio)} c/u</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Cantidad n={n} onMas={() => poner(x.id, n + 1)} onMenos={() => poner(x.id, n - 1)} />
                      <button className="tr-op" onClick={() => poner(x.id, 0)} aria-label={`Quitar ${x.nombre}`} style={{ all: "unset", cursor: "pointer", color: "#6b7280", padding: "8px", display: "flex" }}><Icon name="tacho" size={16} /></button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "16px", whiteSpace: "nowrap" }}>{fmt(x.precio * n)}</div>
                </div>
              ))}
              {regalos > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "12px 0", fontSize: "14px", color: "#93c5fd" }}>
                  <span>🎁 {regalos > 1 ? `${regalos}x ` : ""}{promo.regalo.nombre} de regalo</span><span style={{ fontWeight: 800 }}>Gratis</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "16px 2px 4px" }}>
              <span style={{ color: "#9ca3af" }}>Total</span>
              <span style={{ fontSize: "28px", fontWeight: 800 }}>{fmt(total)}</span>
            </div>
            {descEf > 0 && totalEfectivo < total && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 2px 4px", color: "#34d399" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>💵 Pagando en efectivo ({descEf}% OFF)</span>
                <span style={{ fontSize: "18px", fontWeight: 800 }}>{fmt(totalEfectivo)}</span>
              </div>
            )}
            <div style={{ color: "#6b7280", fontSize: "12px", margin: "4px 2px 16px" }}>Envío gratis dentro de Río Cuarto o retiro. {negocio.garantia}.</div>
            <Btn onClick={() => ir("datos")} style={{ width: "100%", boxSizing: "border-box", padding: "15px" }}>Continuar con la compra</Btn>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "14px", flexWrap: "wrap" }}>
              <a href={linkWa(mensajePedido())} target="_blank" rel="noreferrer" style={{ color: "#34d399", fontSize: "13px", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 0" }}><Icon name="wa" size={14} /> Prefiero pedir por WhatsApp</a>
              <button className="tr-op" onClick={() => setCarrito({})} style={{ all: "unset", cursor: "pointer", color: "#6b7280", fontSize: "13px", padding: "8px 0" }}>Vaciar carrito</button>
            </div>
          </>)}

          {/* 2 · Datos, entrega y pago */}
          {vista === "datos" && (items.length === 0 ? <div style={{ textAlign: "center", padding: "30px 0" }}><p style={{ color: "#9ca3af" }}>Tu carrito está vacío.</p><Btn onClick={volver}>Ver productos</Btn></div> : <>
            <h2 style={titulo}>Datos y pago</h2>
            <div style={{ ...sub, marginTop: 0 }}>Tus datos</div>
            <label style={rotulo} htmlFor="tr-nombre">Nombre y apellido</label>
            <input id="tr-nombre" autoComplete="name" value={form.nombre} onChange={campo("nombre")} placeholder="Ej: Juan Pérez" style={campoSt} />
            <label style={rotulo} htmlFor="tr-tel">Tu WhatsApp</label>
            <input id="tr-tel" type="tel" inputMode="tel" autoComplete="tel" value={form.telefono} onChange={campo("telefono")} placeholder="Ej: 358 4123456" style={campoSt} />

            <div style={sub}>Entrega</div>
            {[["envio", "Envío a domicilio", "Gratis dentro de Río Cuarto"], ["retiro", "Retiro", "Coordinamos día y lugar por WhatsApp"]].map(([id, t, s2]) => (
              <button key={id} className="tr-op" onClick={() => setForm(f => ({ ...f, entrega: id }))} aria-pressed={form.entrega === id} style={opcion(form.entrega === id)}>
                <span style={punto(form.entrega === id)} />
                <span><span style={{ display: "block", fontWeight: 700, fontSize: "15px" }}>{t}</span><span style={{ display: "block", color: "#9ca3af", fontSize: "13px" }}>{s2}</span></span>
              </button>
            ))}
            {form.entrega === "envio" && <>
              <label style={{ ...rotulo, marginTop: "6px" }} htmlFor="tr-dir">Dirección en Río Cuarto</label>
              <input id="tr-dir" autoComplete="street-address" value={form.direccion} onChange={campo("direccion")} placeholder="Calle y número, piso o depto" style={campoSt} />
            </>}
            <label style={{ ...rotulo, marginTop: form.entrega === "envio" ? 0 : "6px" }} htmlFor="tr-nota">Aclaración (opcional)</label>
            <input id="tr-nota" value={form.nota} onChange={campo("nota")} placeholder="Ej: entregar después de las 18 h" maxLength={200} style={campoSt} />

            <div style={sub}>¿Cómo querés pagar?</div>
            {medios.map(m => (
              <button key={m.id} className="tr-op" onClick={() => { setForm(f => ({ ...f, pago: m.id })); setErrPedido(""); }} aria-pressed={form.pago === m.id} style={opcion(form.pago === m.id)}>
                <span style={punto(form.pago === m.id)} />
                <span style={{ flex: 1 }}><span style={{ display: "block", fontWeight: 700, fontSize: "15px" }}>{m.t}</span><span style={{ display: "block", color: m.id === "efectivo" && descEf > 0 && totalEfectivo < total ? "#34d399" : "#9ca3af", fontSize: "13px" }}>{m.s}</span></span>
                <span style={{ color: form.pago === m.id ? "#1EB6FF" : "#6b7280", display: "flex" }}><Icon name={m.ic} size={20} /></span>
              </button>
            ))}

            <div style={sub}>Resumen</div>
            <Resumen lineas={lineasCarrito} tot={totalPago} />
            {errPedido && <div role="alert" style={{ display: "flex", gap: "8px", alignItems: "flex-start", color: "#fca5a5", fontSize: "14px", marginTop: "12px", lineHeight: 1.4 }}><span style={{ flexShrink: 0, marginTop: "1px" }}><Icon name="alerta" size={16} /></span>{errPedido}</div>}
            <Btn onClick={confirmar} disabled={enviando} style={{ width: "100%", boxSizing: "border-box", padding: "15px", marginTop: "14px" }}>
              {enviando ? (form.pago === "tarjeta" && pagos.tarjeta === "online" ? "Abriendo Mercado Pago…" : "Confirmando…") : form.pago === "tarjeta" && pagos.tarjeta === "online" ? `Pagar ${fmt(totalPago)}` : `Confirmar pedido · ${fmt(totalPago)}`}
            </Btn>
            <div style={{ color: "#6b7280", fontSize: "12px", textAlign: "center", marginTop: "10px", lineHeight: 1.5 }}>Al confirmar reservamos tus productos. Usamos tus datos solo para coordinar este pedido.</div>
          </>)}

          {/* 3 · Confirmación */}
          {vista === "listo" && (verificando ? <div style={{ ...card, padding: "40px 20px", textAlign: "center", color: "#9ca3af" }}>Verificando tu pago…</div> : !P ? (
            <div style={{ ...card, padding: "32px 20px", textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: "18px", marginBottom: "6px" }}>No encontramos ese pedido</div>
              <div style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "16px" }}>Si ya pagaste, escribinos por WhatsApp y lo revisamos.</div>
              <Btn href={linkWa("¡Hola Tecno Riv! 👋 Tengo una consulta por un pedido del catálogo.")} style={verde}><Icon name="wa" size={16} /> Escribinos</Btn>
            </div>
          ) : <>
            <div style={{ ...card, padding: "24px 18px", textAlign: "center", marginBottom: "12px" }}>
              {["esperando", "vencido"].includes(est)
                ? <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(245,158,11,0.16)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Icon name="alerta" size={30} /></div>
                : <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#1a7bff,#1EB6FF)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Icon name="check" size={30} /></div>}
              <h2 style={{ ...titulo, margin: "0 0 6px" }}>{{ aprobado: "¡Pago aprobado!", a_confirmar: "¡Pedido reservado!", contraentrega: "¡Pedido confirmado!", link: "¡Pedido recibido!", esperando: "El pago no se completó", vencido: "El pedido venció" }[est] || "Pedido registrado"}</h2>
              <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "12px" }}>Pedido <b style={{ color: "#fff", letterSpacing: "0.04em" }}>{P.codigo}</b></div>
              <p style={{ color: "#d1d5db", fontSize: "15px", lineHeight: 1.55, margin: "0 0 4px" }}>{{
                aprobado: "Recibimos tu pago con tarjeta. Escribinos por WhatsApp y coordinamos la entrega.",
                a_confirmar: `Transferí ${fmt(P.total)} a esta cuenta y mandanos el comprobante por WhatsApp para confirmarlo.`,
                contraentrega: `Pagás ${fmt(P.total)} en efectivo cuando lo recibís. Escribinos por WhatsApp y coordinamos la entrega.`,
                link: "Escribinos por WhatsApp y te pasamos el link para pagar con tarjeta.",
                esperando: "No te cobramos nada. Tus productos siguen reservados unos minutos: podés intentar de nuevo.",
                vencido: "No se completó el pago y liberamos los productos. Podés armar el pedido de nuevo.",
              }[est]}</p>
              {est === "a_confirmar" && P.transferencia && (
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "14px", margin: "14px 0 4px", textAlign: "left" }}>
                  <div style={{ color: "#9ca3af", fontSize: "12px" }}>Alias</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                    <span style={{ fontSize: "20px", fontWeight: 800, wordBreak: "break-all" }}>{P.transferencia.alias}</span>
                    <button onClick={() => copiarAlias(P.transferencia.alias)} style={{ ...chipSt(copiado), padding: "9px 14px" }}>{copiado ? "Copiado ✓" : "Copiar"}</button>
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "8px" }}>Titular: <span style={{ color: "#fff" }}>{P.transferencia.titular}</span> · {P.transferencia.banco}</div>
                  <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "2px" }}>Monto: <span style={{ color: "#fff", fontWeight: 700 }}>{fmt(P.total)}</span></div>
                </div>
              )}
              {waPedido && <Btn href={linkWa(waPedido)} style={{ ...verde, width: "100%", boxSizing: "border-box", padding: "15px", marginTop: "14px" }}><Icon name="wa" size={18} /> {{ a_confirmar: "Enviar comprobante por WhatsApp", link: "Pedir el link de pago", aprobado: "Coordinar entrega por WhatsApp", contraentrega: "Coordinar entrega por WhatsApp" }[est]}</Btn>}
              {est === "esperando" && <>
                <Btn onClick={reintentarPago} disabled={enviando} style={{ width: "100%", boxSizing: "border-box", padding: "15px", marginTop: "14px" }}>{enviando ? "Abriendo Mercado Pago…" : `Reintentar pago · ${fmt(P.total)}`}</Btn>
                <Btn variant="ghost" onClick={() => setVista("carrito")} style={{ width: "100%", boxSizing: "border-box", marginTop: "8px" }}>Elegir otro medio de pago</Btn>
              </>}
              {est === "vencido" && <Btn onClick={() => setVista(items.length ? "carrito" : "catalogo")} style={{ width: "100%", boxSizing: "border-box", padding: "15px", marginTop: "14px" }}>{items.length ? "Volver al carrito" : "Volver al catálogo"}</Btn>}
              {errPedido && <div role="alert" style={{ color: "#fca5a5", fontSize: "14px", marginTop: "10px" }}>{errPedido}</div>}
            </div>
            <Resumen lineas={P.lineas} tot={P.total} />
            {!["esperando", "vencido"].includes(est) && <Btn variant="ghost" onClick={volver} style={{ width: "100%", boxSizing: "border-box", marginTop: "12px" }}>Seguir mirando el catálogo</Btn>}
          </>)}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Barra superior */}
      <div className="tr-glass-bar" style={{ borderBottom: "1px solid", padding: "0 16px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <MiniLogo alto={32} />
          <div className="tr-hide-sm" style={{ color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>Catálogo · {negocio.ciudad.split(",")[0]}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Btn href={linkWa("¡Hola Tecno Riv! 👋 Tengo una consulta.")} style={{ ...verde, padding: "8px 14px", fontSize: "13px", borderRadius: "100px" }}><Icon name="wa" size={15} /> Escribinos</Btn>
          <button className="tr-op" onClick={() => ir("carrito")} aria-label={`Ver carrito (${unidades} producto${unidades === 1 ? "" : "s"})`} style={{ all: "unset", cursor: "pointer", position: "relative", width: 44, height: 44, borderRadius: "14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <Icon name="carrito" size={19} />
            {unidades > 0 && <span style={{ position: "absolute", top: -6, right: -6, minWidth: 20, height: 20, padding: "0 5px", boxSizing: "border-box", borderRadius: "10px", background: "#1EB6FF", color: "#04121C", fontSize: "11px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{unidades}</span>}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1040px", margin: "0 auto", width: "100%", padding: "18px 16px 120px", boxSizing: "border-box" }}>
        {/* Portada */}
        <div className="tr-hero" style={card}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ color: "#1EB6FF", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "12px" }}>Catálogo · precios en vivo</div>
            <h1>Tecnología<br /><span>a un mensaje.</span></h1>
            <p style={{ color: "#8b93a7", fontSize: "14px", lineHeight: 1.55, margin: "14px 0 0", maxWidth: "340px" }}>Elegí lo que te gusta, sumalo al carrito y pagá con tarjeta, transferencia o efectivo.</p>
          </div>
          <Marca3D alto={210} />
        </div>

        {/* Beneficios */}
        <div className="tr-beneficios">
          {[["camion", "Envío gratis", "Dentro de Río Cuarto"], ["escudo", negocio.garantia, "En todos los productos"], ["tarjeta", negocio.descuento_efectivo ? `${negocio.descuento_efectivo}% OFF en efectivo` : "Todos los medios de pago", negocio.descuento_efectivo ? "También transferencia, MP y tarjetas" : "Efectivo, transferencia, MP y tarjetas"]].map(([ic, t, s]) => (
            <div key={t} style={{ ...card, padding: "12px 14px", display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
              <span style={{ color: "#1EB6FF", flexShrink: 0 }}><Icon name={ic} size={20} /></span>
              <div><div style={{ fontWeight: 700, fontSize: "13px" }}>{t}</div><div style={{ color: "#6b7280", fontSize: "12px" }}>{s}</div></div>
            </div>
          ))}
        </div>

        {promo && (
          <div style={{ ...card, padding: "14px 16px", marginBottom: "16px", border: "1px solid rgba(229,38,43,0.45)", background: "linear-gradient(135deg, rgba(229,38,43,0.18), rgba(14,18,28,0.7))" }}>
            <div style={{ fontWeight: 800, fontSize: "16px" }}>🔥 {promo.descuento ? `${promo.descuento}% OFF en todo` : "Promo"} hasta el {promo.hasta}</div>
            {promo.regalo && <div style={{ color: "#fca5a5", fontSize: "13px", marginTop: "2px" }}>🎁 {promo.regalo.nombre} de regalo con cada {promo.regalo.categoria.toLowerCase()} (hasta agotar stock)</div>}
          </div>
        )}

        {/* Pedido en curso (ej: falta mandar el comprobante de la transferencia) */}
        {pedido && !pedido.cancelado && ["a_confirmar", "link"].includes(pedido.pago_estado) && Date.now() - (pedido.guardado || 0) < 2 * 864e5 && (
          <button className="tr-op" onClick={() => ir("listo")} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", ...card, padding: "12px 16px", marginBottom: "16px", border: "1px solid rgba(30,182,255,0.4)" }}>
            <span style={{ fontSize: "14px" }}><b>Tu pedido {pedido.codigo}</b><span style={{ color: "#9ca3af" }}> · {pedido.pago_estado === "a_confirmar" ? "falta enviar el comprobante" : "falta el pago"}</span></span>
            <span style={{ color: "#1EB6FF", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap" }}>Ver →</span>
          </button>
        )}

        {/* Buscador y categorías */}
        <div style={{ position: "sticky", top: 60, zIndex: 50, padding: "10px 0", margin: "0 -16px 6px", paddingLeft: 16, paddingRight: 16, background: "linear-gradient(180deg, rgba(5,7,13,.92) 70%, rgba(5,7,13,0))" }}>
          <div style={{ position: "relative", marginBottom: "10px" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}><Icon name="buscar" size={17} /></span>
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar: smartwatch, cargador, funda…" style={{ ...fieldSt, paddingLeft: "42px", borderRadius: "12px" }} />
          </div>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {cats.map(c => <button key={c} onClick={() => setCat(c)} style={chipSt(cat === c)}>{c}</button>)}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "4px 2px 10px", color: "#6b7280", fontSize: "12px" }}>
          <span>{lista.length} producto{lista.length === 1 ? "" : "s"}</span>
          <span>● Precios actualizados {hace(datos.actualizado)}</span>
        </div>

        {/* Productos */}
        {lista.length === 0 ? <p style={{ color: "#6b7280", textAlign: "center", padding: "30px 0" }}>No encontramos productos con esa búsqueda.</p> : (
          <div className="tr-grilla">
            {lista.map(x => {
              const n = carrito[String(x.id)] || 0;
              return (
                <div key={x.id} className="tr-lift" style={{ ...card, padding: "8px", display: "flex", flexDirection: "column", gap: "8px", opacity: x.estado === "agotado" ? 0.75 : 1 }}>
                  <button onClick={() => setAbierto(x.id)} style={{ all: "unset", cursor: "pointer", display: "block" }}><Foto p={x} /></button>
                  <button onClick={() => setAbierto(x.id)} style={{ all: "unset", cursor: "pointer", fontSize: "13px", fontWeight: 700, lineHeight: 1.3, minHeight: "34px", padding: "0 4px" }}>{x.nombre}</button>
                  <div style={{ padding: "0 4px", marginTop: "auto" }}><Precio p={x} descEfectivo={descEf} /></div>
                  {x.estado === "agotado"
                    ? <Btn href={linkWa(`¡Hola Tecno Riv! 👋 ¿Cuándo vuelve a entrar el ${x.nombre}?`)} variant="ghost" style={{ padding: "9px", fontSize: "12px" }}>Avisame cuando entre</Btn>
                    : n ? <div style={{ display: "flex", justifyContent: "center" }}><Cantidad n={n} onMas={() => poner(x.id, n + 1)} onMenos={() => poner(x.id, n - 1)} /></div>
                    : <Btn onClick={() => poner(x.id, 1)} style={{ padding: "9px", fontSize: "13px" }}>Agregar</Btn>}
                </div>
              );
            })}
          </div>
        )}

        {/* Pie */}
        <div style={{ ...card, padding: "18px", marginTop: "24px", color: "#9ca3af", fontSize: "13px", lineHeight: 1.7 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px", marginBottom: "6px" }}>¿Cómo comprar?</div>
          1. Agregá los productos que quieras al carrito.<br />2. Tocá <b style={{ color: "#fff" }}>Ver carrito</b>, completá tus datos y elegí cómo pagar: tarjeta, transferencia o efectivo.<br />3. Coordinamos el envío gratis en Río Cuarto o el retiro.
          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {negocio.envios}. {negocio.garantia}. Horario: {negocio.horario}.
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
            <Btn href={linkWa("¡Hola Tecno Riv! 👋 Tengo una consulta.")} style={{ ...verde, padding: "9px 14px", fontSize: "13px" }}><Icon name="wa" size={15} /> WhatsApp {negocio.whatsapp}</Btn>
            <Btn href={`https://instagram.com/${negocio.instagram.replace("@", "")}`} variant="ghost" style={{ padding: "9px 14px", fontSize: "13px" }}><Icon name="ig" size={15} /> {negocio.instagram}</Btn>
          </div>
        </div>
      </div>

      {/* Barra del pedido */}
      {unidades > 0 && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(14px + env(safe-area-inset-bottom))", width: "min(520px, calc(100% - 24px))", zIndex: 200 }}>
          <button className="tr-op" onClick={() => ir("carrito")} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "14px 18px", borderRadius: "18px", background: "linear-gradient(135deg,#1a7bff,#0050d8)", color: "#fff", fontWeight: 800, fontSize: "15px", boxShadow: "0 18px 40px -12px rgba(0,0,0,.8), 0 8px 22px -8px rgba(0,102,255,.7)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><Icon name="carrito" size={18} /> Ver carrito ({unidades})</span>
            <span>{fmt(total)}</span>
          </button>
        </div>
      )}

      {/* Detalle del producto */}
      {p && (
        <Hoja onClose={() => setAbierto(null)}>
          <Foto p={p} />
          <div style={{ color: "#1EB6FF", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", margin: "14px 0 4px" }}>{p.categoria}</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "22px", letterSpacing: "-0.02em" }}>{p.nombre}</h2>
          <Precio p={p} grande descEfectivo={descEf} />
          {p.descripcion && <p style={{ color: "#9ca3af", fontSize: "14px", lineHeight: 1.6, margin: "12px 0 0" }}>{p.descripcion}</p>}
          {p.regalo && promo?.regalo && <p style={{ color: "#93c5fd", fontSize: "13px", margin: "10px 0 0" }}>🎁 Te llevás de regalo: {promo.regalo.nombre} (hasta agotar stock).</p>}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
            {p.estado === "agotado"
              ? <Btn href={linkWa(`¡Hola Tecno Riv! 👋 ¿Cuándo vuelve a entrar el ${p.nombre}?`)} style={{ flex: 1, ...verde }}><Icon name="wa" size={16} /> Avisame cuando entre</Btn>
              : <>
                  {carrito[String(p.id)] ? <Cantidad n={carrito[String(p.id)]} onMas={() => poner(p.id, carrito[String(p.id)] + 1)} onMenos={() => poner(p.id, carrito[String(p.id)] - 1)} />
                    : <Btn onClick={() => poner(p.id, 1)} style={{ flex: 1 }}>Agregar al carrito</Btn>}
                  <Btn href={linkWa(mensajeProducto(p))} style={{ flex: 1, ...verde }}><Icon name="wa" size={16} /> Consultar</Btn>
                </>}
          </div>
        </Hoja>
      )}

    </Shell>
  );
}

// Panel que sube desde abajo en el celu y aparece centrado en la compu.
const Hoja = ({ children, onClose, titulo }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} className="tr-hoja-fondo">
    <div onClick={e => e.stopPropagation()} className="tr-hoja" style={{ ...card, background: "rgba(12,16,26,0.97)", width: "100%", maxWidth: "480px", maxHeight: "92vh", overflowY: "auto", padding: "18px 18px calc(18px + env(safe-area-inset-bottom))", boxSizing: "border-box", borderRadius: "22px 22px 0 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: titulo ? "8px" : "10px" }}>
        <span style={{ fontWeight: 800, fontSize: "18px" }}>{titulo || ""}</span>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "100px", width: 34, height: 34, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const Shell = ({ children }) => (
  <div style={{ minHeight: "100vh", background: "#05070d", fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif", color: "#fff", display: "flex", flexDirection: "column", position: "relative", isolation: "isolate" }}>
    <Fondo />
    <style>{`
.tr-grilla{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.tr-beneficios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}
@media (max-width:640px){.tr-beneficios{display:flex;overflow-x:auto;margin:0 -16px 14px;padding:0 16px 4px;scrollbar-width:none}.tr-beneficios>div{min-width:230px}
  .tr-hero .tr-marca{height:170px!important}.tr-hero{padding-bottom:0!important}}
@media (min-width:640px){.tr-grilla{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}
@media (min-width:920px){.tr-grilla{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (min-width:640px){.tr-hoja-fondo{align-items:center!important}.tr-hoja{border-radius:22px!important}}
.tr-op:focus-visible{outline:2px solid #1EB6FF!important;outline-offset:2px}
`}</style>
    {children}
  </div>
);
