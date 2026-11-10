import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Fondo, Marca3D, MiniLogo, card, fieldSt, chipSt, btnFondo } from "../compartido/tema.jsx";
import Asistente from "../compartido/Asistente.jsx";

// Estudio de contenido Tecno Riv: crear, guardar, programar y publicar
// carruseles, posts, historias y publicaciones de Marketplace.
// Mismo servidor, misma base y misma contraseña que /gestion.

// ─── API ───────────────────────────────────────────────────────────────────────
const getClave = () => { try { return localStorage.getItem("clavePanel") || ""; } catch { return ""; } };
const setClaveLS = (v) => { try { localStorage.setItem("clavePanel", v); } catch {} };

async function api(ruta, metodo = "GET", body) {
  const r = await fetch("/api/contenido" + ruta, {
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
const TZ = "America/Argentina/Buenos_Aires";
const diaDe = (ts) => ts ? new Date(ts).toLocaleDateString("en-CA", { timeZone: TZ }) : "";
const horaDe = (ts) => ts ? new Date(ts).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }) : "";
const fechaLarga = (dia) => { const s = new Date(dia + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" }); return s[0].toUpperCase() + s.slice(1); };
const sumarDias = (dia, n) => { const d = new Date(dia + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
// "2026-11-05" + "19:30" (hora de Argentina) -> ISO
const aISO = (dia, hora) => new Date(`${dia}T${hora || "20:00"}:00-03:00`).toISOString();
const copiarTexto = async (t) => {
  try { await navigator.clipboard.writeText(t); } catch {
    const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch {} a.remove();
  }
};

const FORMATOS = [
  { id: "carrusel", label: "Carrusel", sub: "6 a 9 slides · 4:5" },
  { id: "post", label: "Post", sub: "1 imagen · 4:5" },
  { id: "historias", label: "Historias", sub: "3 a 5 · 9:16" },
  { id: "marketplace", label: "Marketplace", sub: "Imagen + título + descripción" },
];
const PLANTILLAS = [
  { id: "producto", label: "Producto destacado", sub: "Vendé 1 producto: gancho, beneficios, precio", min: 1 },
  { id: "coleccion", label: "Colección", sub: "Varios productos, uno por slide", min: 1 },
  { id: "comparativa", label: "Comparativa", sub: "¿Cuál te conviene? Entre 2 productos", min: 2 },
  { id: "tips", label: "Tips / Educativo", sub: "Contenido de valor que se guarda y comparte", min: 0 },
  { id: "promo", label: "Promo", sub: "Usa la promo vigente de /gestion", min: 0 },
  { id: "libre", label: "Libre", sub: "Escribí la idea y se arma a tu medida", min: 0 },
];
const ESTADO = {
  borrador: { label: "Borrador", color: "#9ca3af" },
  programado: { label: "Programado", color: "#f59e0b" },
  publicado: { label: "Publicado", color: "#10b981" },
};
const nombreFormato = (f) => FORMATOS.find(x => x.id === f)?.label || f;

// ─── ICONS ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    inicio: <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    crear: <svg {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>,
    biblioteca: <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    calendario: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    close: <svg {...p} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    refresh: <svg {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    download: <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    trash: <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    send: <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    plus: <svg {...p} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    ia: <svg {...p}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 15l2.5-3 2 2.5L15 11l3 4"/><path d="M15.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor"/></svg>,
    ig: <svg {...p}><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>,
  };
  return icons[name] || null;
};

// ─── UI (mismo sistema visual que /gestion) ───────────────────────────────────
const labelSt = { display: "block", color: "#9ca3af", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" };
const iconBtn = { background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "4px", display: "flex" };
const sectionLabel = { color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" };
const alertaSt = (c) => ({ background: c + "15", border: `1px solid ${c}44`, borderRadius: "12px", padding: "12px 14px" });

const Btn = ({ children, onClick, variant = "primary", disabled, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    ...btnFondo(variant),
    color: variant === "danger" ? "#ef4444" : "#fff", border: variant === "danger" ? "1px solid #ef444444" : variant === "ghost" ? "1px solid rgba(255,255,255,0.08)" : "none",
    borderRadius: "10px", padding: "10px 18px", fontSize: "14px", fontWeight: 600, cursor: disabled ? "default" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", fontFamily: "inherit", opacity: disabled ? 0.5 : 1, ...style
  }}>{children}</button>
);
const Badge = ({ color, children }) => (
  <span style={{ fontSize: "10px", fontWeight: 700, background: color + "22", color, padding: "2px 7px", borderRadius: "100px", whiteSpace: "nowrap" }}>{children}</span>
);
const StatCard = ({ label, value, sub, accent }) => (
  <div style={{ ...card, padding: "16px", minWidth: 0 }}>
    <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>{label}</div>
    <div style={{ fontSize: "22px", fontWeight: 800, color: accent || "#fff", letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{sub}</div>}
  </div>
);
const Header = ({ kicker, title, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
    <div>
      <div style={{ color: "#1EB6FF", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "6px" }}>{kicker}</div>
      <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>{title}</h2>
    </div>
    {action}
  </div>
);
const Modal = ({ title, onClose, children, ancho }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
    <div style={{ ...card, borderRadius: "16px", width: "100%", maxWidth: ancho || "480px", padding: "22px", maxHeight: "92vh", overflowY: "auto", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={iconBtn}><Icon name="close" size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

// ─── GUARDAR IMÁGENES (igual que /gestion) ─────────────────────────────────────
const nombreArchivo = (n, mime) => (n || "imagen").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + (/png/.test(mime) ? ".png" : ".jpg");
function aArchivo(src, nombre) {
  const [cab, datos] = String(src).split(",");
  const mime = (cab.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(datos || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], nombreArchivo(nombre, mime), { type: mime });
}
const esCelu = () => typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent));
async function guardarImagenes(items, abrirVisor) {
  let archivos;
  try { archivos = items.map(i => aArchivo(i.src, i.nombre)); } catch { abrirVisor?.(items); return "visor"; }
  if (esCelu() && navigator.canShare?.({ files: archivos })) {
    try { await navigator.share({ files: archivos }); return "compartido"; }
    catch (e) { if (e?.name === "AbortError") return "cancelado"; }
  }
  if (!esCelu()) {
    for (const f of archivos) {
      const url = URL.createObjectURL(f);
      const a = document.createElement("a"); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      await new Promise(r => setTimeout(r, 350));
    }
    return "descargado";
  }
  abrirVisor?.(items);
  return "visor";
}
const Visor = ({ items, inicio = 0, onClose }) => {
  const [i, setI] = useState(inicio);
  if (!items?.length) return null;
  const it = items[Math.min(i, items.length - 1)];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.94)", zIndex: 3000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px", gap: "12px" }}>
      <div style={{ color: "#fff", fontSize: "14px", fontWeight: 700, textAlign: "center" }}>Mantené apretada la imagen y elegí <span style={{ color: "#60a5fa" }}>"Guardar imagen"</span></div>
      <img src={it.src} alt={it.nombre} onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: "10px", WebkitTouchCallout: "default", userSelect: "auto" }} />
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {items.length > 1 && <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} style={chipSt(false)}>‹ Anterior</button>}
        {items.length > 1 && <span style={{ color: "#9ca3af", fontSize: "13px" }}>{i + 1} de {items.length}</span>}
        {items.length > 1 && <button onClick={() => setI(Math.min(items.length - 1, i + 1))} disabled={i === items.length - 1} style={chipSt(false)}>Siguiente ›</button>}
      </div>
      <button onClick={onClose} style={chipSt(true)}>Cerrar</button>
    </div>
  );
};

// ─── TARJETA DE PIEZA ──────────────────────────────────────────────────────────
const PiezaCard = ({ p, onOpen }) => (
  <button className="tr-lift" onClick={() => onOpen(p.id)} style={{ ...card, padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "#fff", display: "flex", flexDirection: "column" }}>
    <div style={{ aspectRatio: p.formato === "historias" ? "9 / 16" : p.formato === "marketplace" ? "1 / 1" : "4 / 5", background: "rgba(255,255,255,0.03)", width: "100%", maxHeight: "260px", overflow: "hidden" }}>
      {p.miniatura && <img src={p.miniatura} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
    </div>
    <div style={{ padding: "10px 12px" }}>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "6px" }}>
        <Badge color={ESTADO[p.estado]?.color || "#9ca3af"}>{ESTADO[p.estado]?.label || p.estado}</Badge>
        <Badge color={p.formato === "marketplace" ? "#60a5fa" : "#1EB6FF"}>{nombreFormato(p.formato)}</Badge>
      </div>
      <div style={{ fontSize: "13px", fontWeight: 700, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.titulo}</div>
      <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px" }}>
        {p.estado === "programado" ? `${fechaLarga(diaDe(p.programado_para))} · ${horaDe(p.programado_para)}` : p.estado === "publicado" ? `Publicado ${diaDe(p.publicado_at).split("-").reverse().join("/")}` : `Creado ${diaDe(p.created_at).split("-").reverse().join("/")}`}
      </div>
      {p.error && <div style={{ color: "#fca5a5", fontSize: "11px", marginTop: "4px" }}>⚠️ {p.error.slice(0, 80)}</div>}
    </div>
  </button>
);
const Grilla = ({ piezas, onOpen }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
    {piezas.map(p => <PiezaCard key={p.id} p={p} onOpen={onOpen} />)}
  </div>
);

// ─── INICIO ────────────────────────────────────────────────────────────────────
const Inicio = ({ datos, onOpen, irACrear, irA }) => {
  const { piezas, hoy, instagram, promo } = datos;
  const [plan, setPlan] = useState(() => { try { return JSON.parse(localStorage.getItem("planContenido") || "null"); } catch { return null; } });
  const [armando, setArmando] = useState(false);
  const [error, setError] = useState("");
  const semana = sumarDias(hoy, -6);
  const publicadas = piezas.filter(p => p.estado === "publicado" && diaDe(p.publicado_at) >= semana);
  const programadas = piezas.filter(p => p.estado === "programado").sort((a, b) => String(a.programado_para).localeCompare(String(b.programado_para)));
  const paraHoy = programadas.filter(p => diaDe(p.programado_para) <= hoy);
  const borradores = piezas.filter(p => p.estado === "borrador");
  const proxDias = new Set(programadas.map(p => diaDe(p.programado_para)).filter(d => d >= hoy && d <= sumarDias(hoy, 6)));
  const huecos = [...Array(7)].map((_, i) => sumarDias(hoy, i)).filter(d => !proxDias.has(d)).length;

  const armarPlan = async () => {
    setArmando(true); setError("");
    try { const p = await api("/plan", "POST"); setPlan(p); try { localStorage.setItem("planContenido", JSON.stringify(p)); } catch {} }
    catch (e) { setError(e.message); }
    finally { setArmando(false); }
  };

  return (
    <div>
      <Hero publicadas={publicadas.length} onCrear={() => irACrear({})} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <StatCard label="Publicado (7 días)" value={publicadas.length} sub="Meta: 5 por semana" accent={publicadas.length >= 5 ? "#10b981" : "#fff"} />
        <StatCard label="Programado" value={programadas.length} sub={programadas[0] ? `Próximo: ${fechaLarga(diaDe(programadas[0].programado_para))}` : "Nada en agenda"} accent="#f59e0b" />
        <StatCard label="Borradores" value={borradores.length} sub="Listos para programar" />
        <StatCard label="Días sin contenido" value={huecos} sub="En los próximos 7" accent={huecos > 2 ? "#ef4444" : "#10b981"} />
      </div>

      {datos.instagramError && <div style={{ ...alertaSt("#ef4444"), marginBottom: "16px", color: "#fca5a5", fontSize: "13px", lineHeight: 1.5 }}><b>Instagram no se pudo conectar:</b> {datos.instagramError}</div>}
      {!instagram && !datos.instagramError && <div style={{ ...alertaSt("#0066FF"), marginBottom: "16px", color: "#93c5fd", fontSize: "13px", lineHeight: 1.5 }}>
        <b>Instagram en modo manual.</b> Todo queda listo para descargar y copiar, y el día programado te llega un recordatorio por WhatsApp. Para que publique solo, cargá <code>IG_TOKEN</code> en Render (ver README).
      </div>}
      {promo && <div style={{ ...alertaSt("#E5262B"), marginBottom: "16px", color: "#fca5a5", fontSize: "13px" }}>🔥 Promo vigente: {promo.descuento ? `${promo.descuento}% OFF` : "regalo"} hasta el {promo.hasta.slice(8, 10)}/{promo.hasta.slice(5, 7)}. Los precios de las piezas ya salen con descuento.</div>}

      {paraHoy.length > 0 && <>
        <div style={{ ...sectionLabel, marginBottom: "10px" }}>Para publicar hoy</div>
        <div style={{ marginBottom: "22px" }}><Grilla piezas={paraHoy} onOpen={onOpen} /></div>
      </>}

      <div style={{ ...card, padding: "18px", marginBottom: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: plan?.length ? "14px" : 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "16px" }}>Plan de la semana</div>
            <div style={{ color: "#6b7280", fontSize: "13px" }}>7 ideas armadas con tu stock real. Tocá una y se crea.</div>
          </div>
          <Btn variant={plan?.length ? "ghost" : "primary"} onClick={armarPlan} disabled={armando}><Icon name="crear" size={14} /> {armando ? "Pensando… (~30 s)" : plan?.length ? "Nuevo plan" : "Armar plan"}</Btn>
        </div>
        {error && <div style={{ color: "#fca5a5", fontSize: "13px", marginTop: "10px" }}>{error}</div>}
        {plan?.map((idea, i) => (
          <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 0", display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginBottom: "4px" }}>
                <span style={{ color: "#1EB6FF", fontSize: "12px", fontWeight: 700 }}>{fechaLarga(idea.fecha)} · {idea.hora}</span>
                <Badge color="#9ca3af">{nombreFormato(idea.formato)}</Badge>
                <Badge color="#9ca3af">{PLANTILLAS.find(p => p.id === idea.plantilla)?.label || idea.plantilla}</Badge>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>{idea.tema}</div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{idea.objetivo}</div>
            </div>
            <Btn variant="ghost" onClick={() => irACrear({ formato: idea.formato, plantilla: idea.plantilla, tema: idea.tema, producto_ids: idea.producto_ids, dia: idea.fecha, hora: idea.hora })} style={{ padding: "8px 14px" }}>Crear esto</Btn>
          </div>
        ))}
      </div>

      {programadas.length > 0 && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={sectionLabel}>Próximas publicaciones</span>
          <button onClick={() => irA("calendario")} style={chipSt(false)}>Ver calendario</button>
        </div>
        <Grilla piezas={programadas.slice(0, 6)} onOpen={onOpen} />
      </>}
    </div>
  );
};

// ─── CREAR ─────────────────────────────────────────────────────────────────────
const Crear = ({ datos, inicial, onCreada }) => {
  const [formato, setFormato] = useState(inicial.formato || "carrusel");
  const [plantilla, setPlantilla] = useState(inicial.plantilla || "producto");
  const [tema, setTema] = useState(inicial.tema || "");
  const [sel, setSel] = useState(inicial.producto_ids || []);
  const [buscar, setBuscar] = useState("");
  const [cat, setCat] = useState("Todas");
  const [programar, setProgramar] = useState(Boolean(inicial.dia));
  const [dia, setDia] = useState(inicial.dia || sumarDias(datos.hoy, 1));
  const [hora, setHora] = useState(inicial.hora || "20:00");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const productos = datos.productos.filter(p => p.activo !== false);
  const cats = ["Todas", ...new Set(productos.map(p => p.categoria || "Otro"))];
  const lista = productos
    .filter(p => cat === "Todas" || (p.categoria || "Otro") === cat)
    .filter(p => !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()))
    .sort((a, b) => (sel.includes(b.id) - sel.includes(a.id)) || (b.stock - a.stock));
  const esMkp = formato === "marketplace";
  const pl = PLANTILLAS.find(p => p.id === plantilla);
  const minimo = esMkp ? 1 : pl?.min || 0;
  const maximo = esMkp ? 1 : plantilla === "comparativa" ? 2 : 6;

  const tocar = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : (maximo === 1 ? [id] : s.length >= maximo ? s : [...s, id]));
  const crear = async () => {
    setCreando(true); setError("");
    try {
      const r = await api("/piezas", "POST", { formato, plantilla: esMkp ? "producto" : plantilla, tema, producto_ids: sel, programado_para: programar ? aISO(dia, hora) : null });
      onCreada(r.id);
    } catch (e) { setError(e.message); }
    finally { setCreando(false); }
  };

  return (
    <div>
      <Header kicker="Nueva pieza" title="Crear contenido" />

      <div style={{ ...sectionLabel, marginBottom: "8px" }}>1 · Formato</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {FORMATOS.map(f => (
          <button key={f.id} onClick={() => { setFormato(f.id); if (f.id === "marketplace") setSel(s => s.slice(0, 1)); }} style={{ ...card, padding: "14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "#fff", borderColor: formato === f.id ? "#0066FF" : "rgba(255,255,255,0.07)", background: formato === f.id ? "#0066FF18" : "rgba(14,18,28,0.62)" }}>
            <div style={{ fontWeight: 800, fontSize: "15px" }}>{f.label}</div>
            <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{f.sub}</div>
          </button>
        ))}
      </div>

      {!esMkp && <>
        <div style={{ ...sectionLabel, marginBottom: "8px" }}>2 · Plantilla</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "20px" }}>
          {PLANTILLAS.map(p => (
            <button key={p.id} onClick={() => { setPlantilla(p.id); if (p.id === "comparativa") setSel(s => s.slice(0, 2)); }} disabled={p.id === "promo" && !datos.promo} style={{ ...card, padding: "12px 14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "#fff", opacity: p.id === "promo" && !datos.promo ? 0.4 : 1, borderColor: plantilla === p.id ? "#0066FF" : "rgba(255,255,255,0.07)", background: plantilla === p.id ? "#0066FF18" : "rgba(14,18,28,0.62)" }}>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>{p.label}</div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{p.id === "promo" && !datos.promo ? "Activá una promo en /gestion → Stock → ⚙️" : p.sub}</div>
            </button>
          ))}
        </div>
      </>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px", gap: "8px", flexWrap: "wrap" }}>
        <span style={sectionLabel}>{esMkp ? "2" : "3"} · Productos {minimo ? `(${maximo === 1 ? "elegí 1" : `mín ${minimo}`})` : "(opcional)"}</span>
        <span style={{ color: "#9ca3af", fontSize: "12px" }}>{sel.length} elegido{sel.length === 1 ? "" : "s"}{maximo > 1 ? ` · máx ${maximo}` : ""}</span>
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar producto…" style={{ ...fieldSt, flex: 1, minWidth: "180px" }} />
      </div>
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px", marginBottom: "8px" }}>
        {cats.map(c => <button key={c} onClick={() => setCat(c)} style={chipSt(cat === c)}>{c}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: "8px", maxHeight: "330px", overflowY: "auto", marginBottom: "20px", paddingRight: "2px" }}>
        {lista.map(p => {
          const on = sel.includes(p.id);
          const sinFoto = !p.imagen_url;
          return (
            <button key={p.id} onClick={() => tocar(p.id)} style={{ ...card, padding: "6px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "#fff", borderColor: on ? "#1EB6FF" : "rgba(255,255,255,0.07)", borderWidth: on ? "2px" : "1px", position: "relative" }}>
              <div style={{ aspectRatio: "1", borderRadius: "8px", background: "rgba(255,255,255,0.04)", overflow: "hidden", marginBottom: "6px" }}>
                {p.imagen_url && <img src={p.imagen_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              {on && <span style={{ position: "absolute", top: 10, right: 10, background: "#1EB6FF", color: "#04060c", borderRadius: "100px", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "12px" }}>{sel.indexOf(p.id) + 1}</span>}
              <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.nombre}</div>
              <div style={{ fontSize: "11px", color: p.stock > 0 ? "#6b7280" : "#ef4444", marginTop: "2px" }}>{fmt(p.precio)} · {p.stock > 0 ? `stock ${p.stock}` : "sin stock"}{sinFoto ? " · sin foto" : ""}</div>
            </button>
          );
        })}
      </div>

      <div style={{ ...sectionLabel, marginBottom: "8px" }}>{esMkp ? "3" : "4"} · {esMkp ? "Detalles extra (opcional)" : "Idea o consigna (opcional)"}</div>
      <textarea value={tema} onChange={e => setTema(e.target.value)} rows={3} placeholder={esMkp ? "Ej: viene con malla extra, ideal para regalo…" : "Ej: 3 razones para regalar un smartwatch en Navidad · Errores que arruinan la batería de tu iPhone"} style={{ ...fieldSt, resize: "vertical", marginBottom: "16px" }} />

      <div style={{ ...card, padding: "14px", marginBottom: "16px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
          <input type="checkbox" checked={programar} onChange={e => setProgramar(e.target.checked)} style={{ width: 18, height: 18 }} />
          Programar publicación
        </label>
        {programar && <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
          <input type="date" value={dia} min={datos.hoy} onChange={e => setDia(e.target.value)} style={{ ...fieldSt, flex: 1, minWidth: "150px" }} />
          <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ ...fieldSt, width: "130px" }} />
        </div>}
      </div>

      {error && <div style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
      <Btn onClick={crear} disabled={creando || sel.length < minimo} style={{ width: "100%", padding: "14px", fontSize: "15px" }}>
        <Icon name="crear" size={16} /> {creando ? "Diseñando… (~30-60 s)" : sel.length < minimo ? `Elegí ${minimo - sel.length} producto${minimo - sel.length > 1 ? "s" : ""} más` : `Generar ${nombreFormato(formato).toLowerCase()}`}
      </Btn>
    </div>
  );
};

// ─── BIBLIOTECA ────────────────────────────────────────────────────────────────
const Biblioteca = ({ piezas, onOpen }) => {
  const [filtro, setFiltro] = useState("todos");
  const filtros = [["todos", "Todos"], ["borrador", "Borradores"], ["programado", "Programados"], ["publicado", "Publicados"], ["marketplace", "Marketplace"]];
  const vis = piezas.filter(p => filtro === "todos" || (filtro === "marketplace" ? p.formato === "marketplace" : p.estado === filtro));
  return (
    <div>
      <Header kicker={`${piezas.length} piezas`} title="Biblioteca" />
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px", marginBottom: "14px" }}>
        {filtros.map(([id, l]) => <button key={id} onClick={() => setFiltro(id)} style={chipSt(filtro === id)}>{l}</button>)}
      </div>
      {vis.length ? <Grilla piezas={vis} onOpen={onOpen} /> : <p style={{ color: "#6b7280", fontSize: "14px" }}>No hay piezas acá todavía.</p>}
    </div>
  );
};

// ─── CALENDARIO ────────────────────────────────────────────────────────────────
const Calendario = ({ datos, onOpen, irACrear }) => {
  const [desde, setDesde] = useState(datos.hoy);
  const dias = [...Array(14)].map((_, i) => sumarDias(desde, i));
  const delDia = (d) => datos.piezas
    .filter(p => (p.estado === "programado" && diaDe(p.programado_para) === d) || (p.estado === "publicado" && diaDe(p.publicado_at) === d))
    .sort((a, b) => String(a.programado_para || a.publicado_at).localeCompare(String(b.programado_para || b.publicado_at)));
  return (
    <div>
      <Header kicker="Próximos 14 días" title="Calendario" action={
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => setDesde(sumarDias(desde, -14))} style={chipSt(false)}>‹</button>
          <button onClick={() => setDesde(datos.hoy)} style={chipSt(false)}>Hoy</button>
          <button onClick={() => setDesde(sumarDias(desde, 14))} style={chipSt(false)}>›</button>
        </div>} />
      <div style={{ ...card, overflow: "hidden" }}>
        {dias.map((d, i) => {
          const ps = delDia(d);
          const esHoy = d === datos.hoy;
          return (
            <div key={d} style={{ display: "flex", gap: "12px", padding: "12px 14px", borderBottom: i === dias.length - 1 ? "none" : "1px solid rgba(255,255,255,0.07)", alignItems: "flex-start", background: esHoy ? "#0066FF10" : "transparent" }}>
              <div style={{ width: "84px", flexShrink: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: esHoy ? "#1EB6FF" : "#fff" }}>{fechaLarga(d).split(",")[0]}</div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>{d.slice(8, 10)}/{d.slice(5, 7)}{esHoy ? " · hoy" : ""}</div>
              </div>
              <div style={{ flex: 1, display: "flex", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
                {ps.map(p => (
                  <button key={p.id} onClick={() => onOpen(p.id)} style={{ display: "flex", gap: "8px", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${ESTADO[p.estado].color}44`, borderRadius: "10px", padding: "6px 10px 6px 6px", cursor: "pointer", color: "#fff", fontFamily: "inherit", maxWidth: "100%", textAlign: "left" }}>
                    {p.miniatura && <img src={p.miniatura} alt="" style={{ width: 34, height: 42, objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{p.titulo}</span>
                      <span style={{ fontSize: "11px", color: ESTADO[p.estado].color }}>{horaDe(p.programado_para || p.publicado_at)} · {nombreFormato(p.formato)}{p.estado === "publicado" ? " · ✓" : ""}</span>
                    </span>
                  </button>
                ))}
                {d >= datos.hoy && <button onClick={() => irACrear({ dia: d })} style={{ ...chipSt(false), padding: "6px 10px" }}><Icon name="plus" size={12} /> Crear</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── DETALLE DE UNA PIEZA ──────────────────────────────────────────────────────
const TIPOS_SLIDE = { portada: "Portada", texto: "Texto", lista: "Lista", producto: "Producto", comparativa: "Comparativa", cta: "Cierre / CTA" };

// ─── EDITOR DE SLIDES: textos + foto de cada imagen ──────────────────────────
// Qué slides llevan foto de fondo/producto.
const llevaFoto = (s, formato) => ["portada", "producto", "comparativa"].includes(s.tipo) || (s.tipo === "texto" && Boolean(s.producto_id)) || (s.tipo === "cta" && formato === "historias");

async function achicarImagen(file, lado = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error(`No se pudo leer ${file.name}`)); i.src = url; });
    const k = Math.min(1, lado / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

function ElegirFoto({ productoIds, nombres, actual, onElegir, onClose }) {
  const [fotos, setFotos] = useState(null);
  const [filtro, setFiltro] = useState(productoIds[0] || null);
  const [subiendo, setSubiendo] = useState("");
  const [error, setError] = useState("");
  const cargar = useCallback(() => api(`/galeria?ids=${productoIds.join(",")}`).then(setFotos).catch(e => setError(e.message)), [productoIds.join(",")]); // eslint-disable-line
  useEffect(() => { cargar(); }, [cargar]);
  const subir = async (e) => {
    const archivos = [...(e.target.files || [])]; e.target.value = "";
    if (!filtro) return setError("Elegí primero de qué producto es la foto");
    let ultima = null;
    for (let i = 0; i < archivos.length; i++) {
      setSubiendo(`Subiendo ${i + 1} de ${archivos.length}…`);
      try { ultima = await api(`/galeria/${filtro}`, "POST", { imagen: await achicarImagen(archivos[i]) }); } catch (err) { setError(err.message); }
    }
    setSubiendo(""); await cargar();
    if (ultima?.url && archivos.length === 1) onElegir(ultima.url);
  };
  const lista = (fotos || []).filter(f => !filtro || f.producto_id === filtro);
  // Las fundas comparten fotos entre modelos: no mostrar la misma dos veces.
  const vistas = new Set(); const unicas = lista.filter(f => !vistas.has(f.url) && vistas.add(f.url));
  return createPortal(
    <div style={{ fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif", color: "#fff" }}>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2600, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div onClick={e => e.stopPropagation()} style={{ ...card, background: "#0b0f19", borderRadius: "16px", width: "100%", maxWidth: "640px", maxHeight: "88vh", overflowY: "auto", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "17px" }}>Elegí la foto</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "24px", cursor: "pointer" }}>×</button>
          </div>
          {productoIds.length > 1 && <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
            {productoIds.map(id => <button key={id} onClick={() => setFiltro(id)} style={chipSt(filtro === id)}>{nombres[id] || `#${id}`}</button>)}
          </div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px" }}>
            <label style={{ aspectRatio: "3/4", borderRadius: "10px", border: "1.5px dashed rgba(96,165,250,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", color: "#60a5fa", fontSize: "12px", fontWeight: 600, cursor: subiendo ? "default" : "pointer", textAlign: "center", padding: "6px" }}>
              <span style={{ fontSize: "22px" }}>+</span>{subiendo || "Subir foto"}
              <input type="file" accept="image/*" multiple onChange={subir} disabled={Boolean(subiendo)} style={{ display: "none" }} />
            </label>
            {fotos === null && <div style={{ color: "#6b7280", fontSize: "13px", alignSelf: "center" }}>Cargando…</div>}
            {unicas.map(f => (
              <button key={f.id} onClick={() => onElegir(f.url)} style={{ position: "relative", aspectRatio: "3/4", padding: 0, borderRadius: "10px", overflow: "hidden", cursor: "pointer", background: "#111827", border: f.url === actual ? "3px solid #1EB6FF" : "1px solid rgba(255,255,255,0.1)" }}>
                <img src={f.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <span style={{ position: "absolute", left: 4, bottom: 4, fontSize: "10px", fontWeight: 700, background: "rgba(0,0,0,0.7)", color: "#d1d5db", padding: "1px 6px", borderRadius: "100px" }}>{f.usos ? `usada ${f.usos}×` : "nueva"}</span>
              </button>
            ))}
          </div>
          {fotos && !unicas.length && <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "10px" }}>Este producto no tiene fotos en la galería todavía. Subí una con el botón +.</div>}
          {error && <div style={{ color: "#fca5a5", fontSize: "13px", marginTop: "10px" }}>{error}</div>}
        </div>
      </div>
    </div>, document.body);
}

function EditorSlides({ p, datos, ocupado, onCancelar, onRehacer, onSucio }) {
  const inicial = useMemo(() => JSON.parse(JSON.stringify(p.guion.slides)).map(s => ({ foto: "", ...s })), [p.id]); // eslint-disable-line
  const [ed, setEd] = useState(inicial);
  // El titular se escribe libre (con espacios y "/") y recién se separa en líneas al guardar.
  const [titTxt, setTitTxt] = useState(() => inicial.map(s => (s.titular || []).join(" / ")));
  const partirTitular = (t) => String(t || "").split("/").map(x => x.trim()).filter(Boolean);
  const final = () => ed.map((s, i) => ({ ...s, titular: partirTitular(titTxt[i]), items: (s.items || []).map(x => x.trim()).filter(Boolean), items_b: (s.items_b || []).map(x => x.trim()).filter(Boolean) }));
  const sucio = JSON.stringify(final()) !== JSON.stringify(inicial.map(s => ({ ...s, items: (s.items || []).filter(Boolean), items_b: (s.items_b || []).filter(Boolean) })));
  useEffect(() => { onSucio?.(sucio); }, [sucio]); // eslint-disable-line
  const cancelar = () => { if (!sucio || confirm("Tenés cambios sin guardar. ¿Descartarlos?")) onCancelar(); };
  const [eligiendo, setEligiendo] = useState(null);
  const set = (i, cambios) => setEd(x => x.map((s, k) => k === i ? { ...s, ...cambios } : s));
  const nombres = Object.fromEntries((datos.productos || []).map(x => [x.id, x.nombre]));
  const idsPieza = (p.producto_ids || []).map(Number);
  const idsDe = (s) => { const ids = [s.producto_id, s.producto_id_b].filter(Boolean).map(Number); return ids.length ? ids : idsPieza; };
  const altoMini = p.formato === "historias" ? 150 : 118;
  return (
    <div style={{ ...card, padding: "14px", background: "rgba(0,0,0,0.28)" }}>
      <div style={{ ...sectionLabel, marginBottom: "4px" }}>Editar imágenes</div>
      <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "8px" }}>Cambiá textos o fotos de cada slide y tocá <b>💾 Guardar cambios</b> (abajo): se redibujan con el diseño de la marca.</div>
      {ed.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: "12px", borderTop: i ? "1px solid rgba(255,255,255,0.07)" : "none", padding: "12px 0", flexWrap: "wrap" }}>
          <div style={{ flexShrink: 0, width: altoMini * (p.formato === "historias" ? 9 / 16 : 4 / 5) }}>
            {p.imagenes[i] && <img src={p.imagenes[i].imagen} alt="" style={{ width: "100%", borderRadius: "8px", display: "block" }} />}
            {llevaFoto(s, p.formato) && (
              <button onClick={() => setEligiendo(i)} style={{ marginTop: "6px", width: "100%", position: "relative", padding: 0, borderRadius: "8px", overflow: "hidden", cursor: "pointer", border: s.foto ? "2px solid #1EB6FF" : "1px dashed rgba(96,165,250,0.6)", background: "rgba(0,102,255,0.08)", color: "#60a5fa", fontSize: "11px", fontWeight: 700, fontFamily: "inherit" }}>
                {s.foto ? <img src={s.foto} alt="" style={{ width: "100%", height: 54, objectFit: "cover", display: "block" }} /> : <div style={{ padding: "8px 4px" }}>📷 Cambiar foto</div>}
                {s.foto && <span style={{ position: "absolute", inset: "auto 0 0 0", background: "rgba(0,0,0,0.65)", color: "#fff", padding: "2px" }}>📷 Cambiar</span>}
              </button>
            )}
            {s.foto && <button onClick={() => set(i, { foto: "" })} style={{ marginTop: "4px", width: "100%", background: "none", border: "none", color: "#9ca3af", fontSize: "10px", cursor: "pointer", fontFamily: "inherit" }}>Volver a automática</button>}
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ color: "#1EB6FF", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>{i + 1} · {TIPOS_SLIDE[s.tipo] || s.tipo}{s.producto_id ? ` · ${nombres[s.producto_id] || ""}` : ""}</div>
            <input value={s.kicker} onChange={e => set(i, { kicker: e.target.value })} placeholder="Rótulo chico" style={{ ...fieldSt, fontSize: "14px", marginBottom: "6px" }} />
            <input value={titTxt[i] ?? ""} onChange={e => { const v = e.target.value; setTitTxt(x => x.map((t, k) => k === i ? v : t)); }} placeholder="Titular (separá líneas con /)" style={{ ...fieldSt, fontSize: "14px", marginBottom: "6px" }} />
            {partirTitular(titTxt[i]).length > 1 && <div style={{ display: "flex", gap: "4px", marginBottom: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#6b7280", fontSize: "11px" }}>Línea en celeste:</span>
              {partirTitular(titTxt[i]).map((_, k) => <button key={k} onClick={() => set(i, { destacada: k })} style={{ ...chipSt(s.destacada === k), padding: "3px 10px" }}>{k + 1}</button>)}
            </div>}
            {["portada", "texto", "producto", "cta"].includes(s.tipo) && <textarea value={s.cuerpo} onChange={e => set(i, { cuerpo: e.target.value })} rows={2} placeholder="Texto" style={{ ...fieldSt, fontSize: "14px", resize: "vertical" }} />}
            {["lista", "comparativa"].includes(s.tipo) && <textarea value={(s.items || []).join("\n")} onChange={e => set(i, { items: e.target.value.split("\n") })} rows={4} placeholder="Un punto por línea" style={{ ...fieldSt, fontSize: "14px", resize: "vertical" }} />}
            {s.tipo === "comparativa" && <textarea value={(s.items_b || []).join("\n")} onChange={e => set(i, { items_b: e.target.value.split("\n") })} rows={3} placeholder="Puntos del segundo producto" style={{ ...fieldSt, fontSize: "14px", resize: "vertical", marginTop: "6px" }} />}
          </div>
        </div>
      ))}
      {/* Barra fija abajo: siempre visible mientras editás, para no olvidarse de guardar */}
      <div style={{ position: "sticky", bottom: "-22px", margin: "0 -14px -14px", padding: "12px 14px", background: "rgba(10,14,24,0.97)", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "0 0 12px 12px", display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", zIndex: 2 }}>
        <span style={{ flex: 1, minWidth: "140px", fontSize: "12px", color: ocupado ? "#93c5fd" : sucio ? "#fcd34d" : "#6b7280" }}>{ocupado ? "Guardando y redibujando… (20-40 s, no cierres)" : sucio ? "● Cambios sin guardar" : "Sin cambios"}</span>
        <Btn variant="ghost" onClick={cancelar} disabled={ocupado}>Cancelar</Btn>
        <Btn onClick={() => onRehacer(final())} disabled={ocupado || !sucio}>{ocupado ? "Guardando…" : "💾 Guardar cambios"}</Btn>
      </div>
      {eligiendo !== null && <ElegirFoto productoIds={idsDe(ed[eligiendo])} nombres={nombres} actual={ed[eligiendo].foto} onElegir={url => { set(eligiendo, { foto: url }); setEligiendo(null); }} onClose={() => setEligiendo(null)} />}
    </div>
  );
}

const Detalle = ({ id, datos, onClose, onCambio }) => {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [visor, setVisor] = useState(null);
  const [copiado, setCopiado] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [caption, setCaption] = useState("");
  const [editar, setEditar] = useState(null);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState("");
  const cerrar = () => { if (sucio && !confirm("Tenés cambios sin guardar en las imágenes. ¿Cerrar igual?")) return; onClose(); };
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("20:00");

  const cargar = useCallback(async () => {
    try {
      const d = await api(`/piezas/${id}`);
      setP(d); setCaption(d.caption || "");
      setDia(d.programado_para ? diaDe(d.programado_para) : datos.hoy);
      if (d.programado_para) setHora(horaDe(d.programado_para));
    } catch (e) { setError(e.message); }
  }, [id, datos.hoy]);
  useEffect(() => { cargar(); }, [cargar]);

  const hacer = async (clave, fn) => {
    setOcupado(clave); setError("");
    try { await fn(); await cargar(); onCambio(); } catch (e) { setError(e.message); } finally { setOcupado(""); }
  };
  const copiar = async (clave, t) => { await copiarTexto(t); setCopiado(clave); setTimeout(() => setCopiado(""), 1500); };

  if (!p) return <Modal title="Cargando…" onClose={onClose}>{error ? <div style={{ color: "#fca5a5" }}>{error}</div> : <p style={{ color: "#6b7280" }}>Cargando…</p>}</Modal>;

  const items = p.imagenes.map((im, i) => ({ src: im.imagen, nombre: `${p.titulo}-${String(i + 1).padStart(2, "0")}` }));
  const esMkp = p.formato === "marketplace";
  const altoMini = p.formato === "historias" ? "280px" : "220px";
  const captionCambio = caption !== (p.caption || "");

  return (
    <Modal title={p.titulo} onClose={cerrar} ancho="760px">
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "-6px 0 14px" }}>
        <Badge color={ESTADO[p.estado].color}>{ESTADO[p.estado].label}{p.estado === "programado" ? ` · ${fechaLarga(diaDe(p.programado_para))} ${horaDe(p.programado_para)}` : ""}</Badge>
        <Badge color="#1EB6FF">{nombreFormato(p.formato)}</Badge>
        {p.plantilla && !esMkp && <Badge color="#9ca3af">{PLANTILLAS.find(x => x.id === p.plantilla)?.label}</Badge>}
        {p.ig_permalink && <a href={p.ig_permalink} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#60a5fa" }}>Ver en Instagram ↗</a>}
      </div>
      {p.error && <div style={{ ...alertaSt("#ef4444"), color: "#fca5a5", fontSize: "13px", marginBottom: "12px" }}>Último error al publicar: {p.error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={sectionLabel}>{items.length > 1 ? `${items.length} imágenes · en este orden` : "Imagen"}</span>
        <button onClick={() => guardarImagenes(items, setVisor)} style={chipSt(true)}><Icon name="download" size={12} /> Guardar {items.length > 1 ? `las ${items.length}` : "imagen"}</button>
      </div>
      <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px", marginBottom: "14px" }}>
        {items.map((it, i) => (
          <img key={i} src={it.src} alt="" onClick={() => setVisor({ items, i })} style={{ height: altoMini, borderRadius: "8px", cursor: "zoom-in", flexShrink: 0 }} />
        ))}
      </div>

      {esMkp && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={sectionLabel}>Título de Marketplace</span>
          <button onClick={() => copiar("t", p.titulo_mkp || "")} style={chipSt(true)}>{copiado === "t" ? "✓ Copiado" : "Copiar título"}</button>
        </div>
        <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600, background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px", marginBottom: "14px" }}>{p.titulo_mkp}</div>
      </>}

      {p.formato !== "historias" && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", gap: "8px" }}>
          <span style={sectionLabel}>{esMkp ? "Descripción" : "Caption"}</span>
          <span style={{ display: "flex", gap: "6px" }}>
            {captionCambio && <button onClick={() => hacer("cap", () => api(`/piezas/${p.id}`, "PATCH", { caption }))} style={chipSt(false)}>{ocupado === "cap" ? "Guardando…" : "Guardar cambios"}</button>}
            <button onClick={() => copiar("c", caption)} style={chipSt(true)}>{copiado === "c" ? "✓ Copiado" : "Copiar"}</button>
          </span>
        </div>
        <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={7} style={{ ...fieldSt, fontSize: "14px", color: "#d1d5db", resize: "vertical", marginBottom: "14px" }} />
      </>}
      {p.formato === "historias" && <p style={{ color: "#6b7280", fontSize: "12px", margin: "0 0 14px" }}>Subilas en orden. En la última agregá el sticker <b>Enlace</b> con tu WhatsApp (wa.me/5493585178319).</p>}

      {!esMkp && p.guion?.slides && <div style={{ marginBottom: "14px" }}>
        {!editar
          ? <Btn variant="ghost" onClick={() => setEditar(true)} style={{ width: "100%", justifyContent: "center" }}><Icon name="edit" size={14} /> Editar imágenes (textos y fotos)</Btn>
          : <EditorSlides p={p} datos={datos} ocupado={ocupado === "rehacer"} onSucio={setSucio} onCancelar={() => { setEditar(null); setSucio(false); }} onRehacer={(slides) => hacer("rehacer", async () => { await api(`/piezas/${p.id}/rehacer`, "POST", { slides }); setEditar(null); setSucio(false); setAviso("✓ Cambios guardados. Las imágenes ya están actualizadas."); setTimeout(() => setAviso(""), 6000); })} />}
        {aviso && <div style={{ color: "#6ee7b7", fontSize: "13px", marginTop: "8px", textAlign: "center" }}>{aviso}</div>}
        {editar && error && <div style={{ color: "#fca5a5", fontSize: "13px", marginTop: "8px" }}>No se guardó: {error}</div>}
      </div>}

      <div style={{ ...card, padding: "14px", marginBottom: "14px", background: "rgba(0,0,0,0.28)" }}>
        <div style={{ ...sectionLabel, marginBottom: "10px" }}>Publicación</div>
        {p.estado !== "publicado" && <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
          <input type="date" value={dia} min={datos.hoy} onChange={e => setDia(e.target.value)} style={{ ...fieldSt, flex: 1, minWidth: "140px" }} />
          <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ ...fieldSt, width: "120px" }} />
          <Btn variant="ghost" onClick={() => hacer("prog", () => api(`/piezas/${p.id}`, "PATCH", { programado_para: aISO(dia, hora) }))} disabled={ocupado === "prog"}>{p.estado === "programado" ? "Cambiar fecha" : "Programar"}</Btn>
          {p.estado === "programado" && <Btn variant="ghost" onClick={() => hacer("desprog", () => api(`/piezas/${p.id}`, "PATCH", { programado_para: null }))}>Quitar de agenda</Btn>}
        </div>}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {!esMkp && p.estado !== "publicado" && datos.instagram && <Btn onClick={() => { if (confirm("¿Publicar ahora en Instagram?")) hacer("pub", () => api(`/piezas/${p.id}/publicar`, "POST")); }} disabled={Boolean(ocupado)}><Icon name="ig" size={14} /> {ocupado === "pub" ? "Publicando… (~30 s)" : "Publicar ahora en Instagram"}</Btn>}
          {p.estado !== "publicado"
            ? <Btn variant="ok" onClick={() => hacer("listo", () => api(`/piezas/${p.id}`, "PATCH", { estado: "publicado" }))} disabled={Boolean(ocupado)}>✓ Ya lo publiqué</Btn>
            : <Btn variant="ghost" onClick={() => hacer("vuelta", () => api(`/piezas/${p.id}`, "PATCH", { estado: "borrador" }))}>Volver a borrador</Btn>}
        </div>
        {!datos.instagram && !esMkp && p.estado !== "publicado" && <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>Modo manual: guardá las imágenes, copiá el caption y subilo desde la app de Instagram. Después tocá "Ya lo publiqué".</div>}
        {esMkp && <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>Marketplace: guardá la imagen, copiá título y descripción y pegalos en Facebook. Facebook no permite publicar ahí de forma automática.</div>}
      </div>

      {error && <div style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
        <Btn variant="danger" onClick={async () => { if (confirm("¿Borrar esta pieza?")) { try { await api(`/piezas/${p.id}`, "DELETE"); onCambio(); onClose(); } catch (e) { setError(e.message); } } }}><Icon name="trash" size={14} /> Borrar</Btn>
        <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
      </div>
      {visor && <Visor items={visor.items} inicio={visor.i} onClose={() => setVisor(null)} />}
    </Modal>
  );
};

// ─── ESTUDIO IA: crear y editar imágenes (gratis con FLUX.2 de Cloudflare o Pro con Nano Banana) ───
const FORMATOS_IA = [["4:5", "Post"], ["9:16", "Historia / Reel"], ["1:1", "Cuadrada"], ["16:9", "Horizontal"]];
const IDEAS_CREAR = [
  "Foto de producto sobre una mesa de madera clara con luz natural de ventana",
  "En la muñeca de una persona caminando por la ciudad de noche, luces de neón azules",
  "Flat lay prolijo con el producto y accesorios tecnológicos, vista desde arriba",
  "Producto flotando sobre fondo oscuro con reflejo y luces azules estilo Tecno Riv",
  "Persona joven usándolo en un parque de Río Cuarto al atardecer, foto lifestyle",
];
const IDEAS_EDITAR = [
  "Sacá el fondo y poné un fondo blanco liso de estudio",
  "Cambiá el fondo por uno oscuro con luces azules de neón",
  "Mejorá la luz, el contraste y la nitidez como foto profesional",
  "Poné el producto en la mano de una persona, fondo desenfocado",
  "Agregá una sombra y reflejo realistas debajo del producto",
];

function ResultadoIA({ im, productos, onEditar, onCambio }) {
  const [pid, setPid] = useState(im.producto_id || "");
  const [msg, setMsg] = useState("");
  const conFoto = productos.filter(p => p.activo !== false);
  const aGaleria = async () => {
    if (!pid) return setMsg("Elegí el producto");
    try { await api(`/ia/historial/${im.id}/galeria`, "POST", { producto_id: Number(pid) }); setMsg("✓ Agregada a la galería del producto"); onCambio?.(); }
    catch (e) { setMsg(e.message); }
  };
  return (
    <div style={{ ...card, padding: "14px", background: "rgba(0,0,0,0.28)" }}>
      <img src={im.url} alt="" style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "10px", display: "block", background: "#05070d" }} />
      <div style={{ color: "#6b7280", fontSize: "11px", margin: "8px 0" }}>{im.modelo_nombre || im.modelo} · {im.formato} · “{String(im.prompt || "").slice(0, 120)}”</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <a href={im.url} download target="_blank" rel="noreferrer" style={{ ...chipSt(true), textDecoration: "none" }}><Icon name="download" size={12} /> Descargar</a>
        {onEditar && <button onClick={() => onEditar(im.url)} style={chipSt(false)}><Icon name="edit" size={12} /> Editar con IA</button>}
        <select value={pid} onChange={e => setPid(e.target.value)} style={{ ...fieldSt, width: "auto", padding: "6px 10px", fontSize: "13px" }}>
          <option value="">Producto…</option>
          {conFoto.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button onClick={aGaleria} style={chipSt(false)}>+ Galería del producto</button>
      </div>
      {msg && <div style={{ fontSize: "12px", marginTop: "6px", color: msg.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>{msg}</div>}
    </div>
  );
}

// Videos con Remotion: el paquete pesado (public/contenido-videos.js) se baja solo al abrir esta pestaña.
function VideosRemotion({ datos }) {
  const ref = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let desmontar = null, vivo = true;
    const montar = () => { if (vivo && ref.current && window.TRVideos) desmontar = window.TRVideos.montar(ref.current, { datos, api }); };
    if (window.TRVideos) montar();
    else {
      const sc = document.createElement("script");
      sc.src = "/contenido-videos.js?v=1";
      sc.onload = montar;
      sc.onerror = () => setError("No se pudo cargar el editor de videos. Revisá la conexión y volvé a abrir la pestaña.");
      document.body.appendChild(sc);
    }
    return () => { vivo = false; desmontar?.(); };
  }, []); // eslint-disable-line
  return <div>{error ? <div style={{ color: "#fca5a5" }}>{error}</div> : <div ref={ref}><div style={{ ...card, padding: "40px", textAlign: "center", color: "#6b7280" }}>Cargando editor de videos…</div></div>}</div>;
}

function EstudioIA({ datos }) {
  const [modo, setModo] = useState("crear");
  const [estado, setEstado] = useState(null);
  const [motor, setMotor] = useState(() => { try { return localStorage.getItem("trMotorIA") || ""; } catch { return ""; } });
  const [hist, setHist] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [formato, setFormato] = useState("4:5");
  const [tamano, setTamano] = useState("2K");
  const [estilo, setEstilo] = useState(true);
  const [pid, setPid] = useState("");
  const [refs, setRefs] = useState([]);       // referencias (crear) o [base] (editar)
  const [eligiendo, setEligiendo] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const productos = datos.productos || [];
  const nombres = Object.fromEntries(productos.map(x => [x.id, x.nombre]));

  const cargarHist = useCallback(() => api("/ia/historial").then(setHist).catch(e => setError(e.message)), []);
  useEffect(() => { api("/ia/estado").then(setEstado).catch(() => setEstado({ gemini: false, gratis: false })); cargarHist(); }, [cargarHist]);
  // Motor por defecto: el gratis si está conectado.
  const motorReal = motor || (estado?.gratis || !estado?.gemini ? "gratis" : "pro");
  const elegirMotor = (m) => { setMotor(m); try { localStorage.setItem("trMotorIA", m); } catch {} };
  const motorListo = !estado || (motorReal === "gratis" ? estado.gratis : estado.gemini);

  const cambiarModo = (m, base) => { setModo(m); setResultado(null); setError(""); setRefs(base ? [base] : []); setPrompt(""); window.scrollTo(0, 0); };
  const subirBase = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    const d = await achicarImagen(f, 1600);
    setRefs(r => modo === "editar" ? [d] : [...r, d].slice(0, 4));
  };
  const generar = async () => {
    setError(""); setGenerando(true); setResultado(null);
    try {
      const r = await api("/ia/imagen", "POST", { prompt, referencias: refs, formato, tamano, estilo, editar: modo === "editar", producto_id: pid ? Number(pid) : null, motor: motorReal });
      setResultado(r); cargarHist();
    } catch (e) { setError(e.message); } finally { setGenerando(false); }
  };

  const sub = (id, label) => <button onClick={() => cambiarModo(id)} style={{ ...chipSt(modo === id), padding: "8px 16px", fontSize: "14px" }}>{label}</button>;
  const thumb = (src, onQuitar, k) => (
    <div key={k} style={{ position: "relative", width: 76, height: 76, borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <button onClick={onQuitar} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.75)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: "12px", lineHeight: 1 }}>×</button>
    </div>
  );

  return (
    <div>
      <Header kicker={motorReal === "gratis" ? "FLUX.2 · Cloudflare (gratis)" : "Nano Banana Pro · Google Gemini"} title="Estudio IA" />
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {sub("crear", "✨ Crear imagen")}{sub("editar", "🪄 Editar con IA")}{sub("videos", "🎬 Videos")}
      </div>

      {modo !== "videos" && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600 }}>MOTOR</span>
          <button onClick={() => elegirMotor("gratis")} style={chipSt(motorReal === "gratis")}>🆓 Gratis · FLUX.2{estado && !estado.gratis ? " (sin conectar)" : ""}</button>
          <button onClick={() => elegirMotor("pro")} style={chipSt(motorReal === "pro")}>⭐ Pro · Nano Banana{estado && !estado.gemini ? " (sin conectar)" : ""}</button>
        </div>
      )}

      {estado && motorReal === "gratis" && !estado.gratis && modo !== "videos" && (
        <div style={{ ...card, padding: "14px", marginBottom: "16px", borderColor: "#f59e0b55", color: "#fcd34d", fontSize: "13px", lineHeight: 1.6 }}>
          <b>Falta conectar Cloudflare (gratis).</b> 1) Creá una cuenta en <b>dash.cloudflare.com</b> y copiá el <b>Account ID</b>. 2) My Profile → API Tokens → Create Token → plantilla <b>Workers AI</b>. 3) En Render → Environment agregá <code>CF_ACCOUNT_ID</code> y <code>CF_API_TOKEN</code> y guardá.
        </div>
      )}
      {estado && motorReal === "pro" && !estado.gemini && modo !== "videos" && (
        <div style={{ ...card, padding: "14px", marginBottom: "16px", borderColor: "#f59e0b55", color: "#fcd34d", fontSize: "13px", lineHeight: 1.6 }}>
          <b>Falta conectar Gemini.</b> 1) Entrá a <b>aistudio.google.com</b> → <b>Get API key</b> → Crear clave. 2) Para Nano Banana Pro activá la facturación del proyecto. 3) En Render → Environment agregá <code>GEMINI_API_KEY</code> con esa clave y guardá. En 2-3 minutos queda andando.
        </div>
      )}

      {modo === "videos" ? <VideosRemotion datos={datos} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", alignItems: "start" }}>
          <div style={{ ...card, padding: "16px" }}>
            {modo === "editar" ? (
              <>
                <label style={labelSt}>Imagen a editar</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
                  {refs[0] ? thumb(refs[0], () => setRefs([]), "b") : <span style={{ color: "#6b7280", fontSize: "13px" }}>Elegí una de la galería, del historial (abajo) o subila.</span>}
                </div>
              </>
            ) : (
              <>
                <label style={labelSt}>Fotos de referencia (tu producto real)</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
                  {refs.map((r, i) => thumb(r, () => setRefs(x => x.filter((_, k) => k !== i)), i))}
                  {!refs.length && <span style={{ color: "#6b7280", fontSize: "12px" }}>Opcional: con fotos, la IA respeta el producto real (recomendado).</span>}
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              <select value={pid} onChange={e => setPid(e.target.value)} style={{ ...fieldSt, flex: 1, minWidth: "160px", padding: "8px 10px", fontSize: "13px" }}>
                <option value="">Producto…</option>
                {productos.filter(p => p.activo !== false).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <button onClick={() => pid ? setEligiendo(true) : setError("Elegí primero el producto")} style={chipSt(false)}>📷 De la galería</button>
              <label style={{ ...chipSt(false), cursor: "pointer" }}>⬆ Subir<input type="file" accept="image/*" onChange={subirBase} style={{ display: "none" }} /></label>
            </div>

            <label style={labelSt}>{modo === "editar" ? "¿Qué cambio querés?" : "¿Qué imagen querés?"}</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder={modo === "editar" ? "Ej: cambiá el fondo por una mesa de madera con luz cálida" : "Ej: el smartwatch D20 en la muñeca de un chico corriendo en el parque al atardecer"} style={{ ...fieldSt, resize: "vertical", marginBottom: "8px" }} />
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
              {(modo === "editar" ? IDEAS_EDITAR : IDEAS_CREAR).map(t => <button key={t} onClick={() => setPrompt(t)} style={{ ...chipSt(false), fontSize: "11px", padding: "5px 10px", textAlign: "left", whiteSpace: "normal", maxWidth: "100%", lineHeight: 1.3 }}>{t}</button>)}
            </div>

            <label style={labelSt}>Formato</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
              {FORMATOS_IA.map(([f, l]) => <button key={f} onClick={() => setFormato(f)} style={chipSt(formato === f)}>{l} · {f}</button>)}
            </div>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", marginBottom: "14px" }}>
              {motorReal === "pro" && <span style={{ display: "flex", gap: "6px", alignItems: "center" }}><span style={{ color: "#9ca3af", fontSize: "12px" }}>Calidad</span>
                {["1K", "2K", "4K"].map(t => <button key={t} onClick={() => setTamano(t)} style={{ ...chipSt(tamano === t), padding: "4px 10px" }}>{t}</button>)}</span>}
              {modo === "crear" && <label style={{ display: "flex", gap: "6px", alignItems: "center", color: "#d1d5db", fontSize: "13px", cursor: "pointer" }}><input type="checkbox" checked={estilo} onChange={e => setEstilo(e.target.checked)} /> Estilo Tecno Riv</label>}
            </div>
            <Btn onClick={generar} disabled={generando || !prompt.trim() || (modo === "editar" && !refs.length) || !motorListo} style={{ width: "100%", justifyContent: "center" }}>
              {generando ? (motorReal === "gratis" ? "Generando… (10-30 s)" : "Generando… (20-60 s)") : modo === "editar" ? "🪄 Editar imagen" : "✨ Crear imagen"}
            </Btn>
            <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "8px" }}>{motorReal === "gratis" ? "Gratis: ~50 imágenes por día (se renueva a las 21:00). Con fotos de referencia respeta mejor tu producto. Para piezas clave usá Pro." : "Cada imagen consume tu cuota de Gemini (4K cuesta más)."} Todo lo que generes queda en el historial.</div>
            {error && <div style={{ color: "#fca5a5", fontSize: "13px", marginTop: "10px" }}>{error}</div>}
          </div>

          <div>
            {generando && <div style={{ ...card, padding: "40px", textAlign: "center", color: "#9ca3af" }}><div className="tr-ia-gen" style={{ fontSize: "34px", marginBottom: "8px" }}>✨</div>{motorReal === "gratis" ? "FLUX.2" : "Nano Banana"} está creando tu imagen…</div>}
            {resultado && !generando && <ResultadoIA im={resultado} productos={productos} onEditar={u => cambiarModo("editar", u)} onCambio={cargarHist} />}
            {!resultado && !generando && <div style={{ ...card, padding: "30px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>Acá aparece tu imagen.</div>}
          </div>
        </div>
      )}

      {modo !== "videos" && hist.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ ...sectionLabel, marginBottom: "10px" }}>Historial · {hist.length}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px" }}>
            {hist.map(h => (
              <div key={h.id} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0b0f19" }}>
                <img src={h.url} alt="" loading="lazy" onClick={() => setResultado(h)} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", cursor: "pointer" }} />
                <div style={{ display: "flex", gap: "4px", padding: "4px" }}>
                  <button onClick={() => cambiarModo("editar", h.url)} title="Editar con IA" style={{ ...chipSt(false), flex: 1, padding: "3px", fontSize: "10px", justifyContent: "center" }}>🪄</button>
                  {modo === "crear" && <button onClick={() => setRefs(r => [...r, h.url].slice(0, 4))} title="Usar como referencia" style={{ ...chipSt(false), flex: 1, padding: "3px", fontSize: "10px", justifyContent: "center" }}>+ref</button>}
                  <button onClick={async () => { if (confirm("¿Borrar del historial?")) { await api(`/ia/historial/${h.id}`, "DELETE").catch(() => {}); cargarHist(); } }} title="Borrar" style={{ ...chipSt(false), padding: "3px 6px", fontSize: "10px" }}><Icon name="trash" size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {eligiendo && pid && <ElegirFoto productoIds={[Number(pid)]} nombres={nombres} actual={null} onElegir={url => { setRefs(r => modo === "editar" ? [url] : [...r, url].slice(0, 4)); setEligiendo(false); }} onClose={() => setEligiendo(false)} />}
      <style>{`@keyframes trIaGen{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.25) rotate(20deg)}}.tr-ia-gen{display:inline-block;animation:trIaGen 1.4s ease-in-out infinite}`}</style>
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
const Login = ({ onOk, error }) => {
  const [clave, setClave] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ ...card, padding: "8px 28px 28px", width: "100%", maxWidth: "400px", boxSizing: "border-box" }}>
        <Marca3D alto={260} />
        <h2 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.03em" }}>Contenido <span style={{ color: "#1EB6FF" }}>Tecno Riv</span></h2>
        <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>Usá la misma contraseña del panel y de /gestion.</p>
        <form onSubmit={e => { e.preventDefault(); setClaveLS(clave); onOk(); }}>
          <label style={labelSt}>Contraseña</label>
          <input type="password" value={clave} onChange={e => setClave(e.target.value)} autoFocus style={{ ...fieldSt, marginBottom: "14px" }} />
          {error && <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
          <Btn style={{ width: "100%" }}>Entrar</Btn>
        </form>
      </div>
    </div>
  );
};

// ─── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("inicio");
  const [datos, setDatos] = useState(null);
  const [auth, setAuth] = useState(getClave() ? "probando" : "no");
  const [loginError, setLoginError] = useState("");
  const [aviso, setAviso] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [inicialCrear, setInicialCrear] = useState({});
  const [claveCrear, setClaveCrear] = useState(0);
  const instalar = useInstalar();

  const cargar = useCallback(async () => {
    try { const d = await api("/estado"); setDatos(d); setAuth("ok"); setLoginError(""); }
    catch (e) {
      if (e.status === 401) { setAuth("no"); setLoginError(getClave() ? "Contraseña incorrecta" : ""); }
      else { setAuth(a => a === "probando" ? "ok" : a); setAviso(e.message); }
    }
  }, []);
  useEffect(() => { if (auth === "probando") cargar(); }, [auth, cargar]);
  useEffect(() => {
    if (auth !== "ok") return;
    const t = setInterval(() => { if (!document.hidden) cargar(); }, 60000);
    return () => clearInterval(t);
  }, [auth, cargar]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(t); }, [aviso]);

  const irA = (t) => { setTab(t); window.scrollTo(0, 0); };
  const irACrear = (ini) => { setInicialCrear(ini || {}); setClaveCrear(k => k + 1); irA("crear"); };

  if (auth === "no") return <Shell><Login error={loginError} onOk={() => setAuth("probando")} /></Shell>;
  if (!datos) return <Shell><div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>{aviso ? <span style={{ color: "#ef4444" }}>{aviso}</span> : "Cargando…"}</div></Shell>;

  const programadas = datos.piezas.filter(p => p.estado === "programado" && diaDe(p.programado_para) <= datos.hoy).length;
  const tabs = [
    { id: "inicio", label: "Inicio", icon: "inicio" },
    { id: "crear", label: "Crear", icon: "crear" },
    { id: "biblioteca", label: "Biblioteca", icon: "biblioteca" },
    { id: "calendario", label: "Calendario", icon: "calendario" },
    { id: "ia", label: "IA", icon: "ia" },
  ];

  return (
    <Shell>
      <div className="tr-glass-bar" style={{ borderBottom: "1px solid", padding: "0 16px", height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <MiniLogo alto={30} />
          <span className="tr-hide-sm" style={{ fontWeight: 600, fontSize: "13px", color: "#9ca3af" }}>Contenido</span>
          <span title={datos.instagram ? "Instagram conectado: publica solo" : "Instagram en modo manual"} style={{ color: datos.instagram ? "#10b981" : datos.instagramError ? "#ef4444" : "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>● {datos.instagram ? (datos.instagramUsuario ? `@${datos.instagramUsuario}` : "IG auto") : datos.instagramError ? "IG con error" : "IG manual"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {instalar.visible && <button onClick={instalar.abrir} style={{ background: "#0066FF22", color: "#60a5fa", border: "1px solid #0066FF44", borderRadius: "100px", padding: "4px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px" }}><Icon name="download" size={12} /> App</button>}
          <a href="/gestion" style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "100px", padding: "4px 10px", whiteSpace: "nowrap" }}>Gestión</a>
          <button onClick={cargar} title="Actualizar" style={iconBtn}><Icon name="refresh" size={16} /></button>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: "900px", margin: "0 auto", width: "100%", padding: "24px 16px 120px", boxSizing: "border-box" }}>
        {datos.faltaTabla && <div style={{ ...alertaSt("#f59e0b"), color: "#fcd34d", fontSize: "13px", marginBottom: "16px" }}>{datos.faltaTabla}</div>}
        {tab === "inicio" && <Inicio datos={datos} onOpen={setAbierta} irACrear={irACrear} irA={irA} />}
        {tab === "crear" && <Crear key={claveCrear} datos={datos} inicial={inicialCrear} onCreada={async (id) => { await cargar(); setAbierta(id); irA("biblioteca"); }} />}
        {tab === "biblioteca" && <Biblioteca piezas={datos.piezas} onOpen={setAbierta} />}
        {tab === "calendario" && <Calendario datos={datos} onOpen={setAbierta} irACrear={irACrear} />}
        {tab === "ia" && <EstudioIA datos={datos} />}
      </div>

      {abierta && <Detalle id={abierta} datos={datos} onClose={() => setAbierta(null)} onCambio={cargar} />}

      {instalar.ayudaIOS && (
        <Modal title="Instalar en iPhone" onClose={instalar.cerrar}>
          <ol style={{ color: "#d1d5db", fontSize: "15px", lineHeight: 1.7, paddingLeft: "20px", margin: "0 0 16px" }}>
            <li>Abrí esta página en <b>Safari</b>.</li>
            <li>Tocá el botón <b>Compartir</b> (el cuadrado con la flecha ↑).</li>
            <li>Elegí <b>Agregar a inicio</b> y tocá <b>Agregar</b>.</li>
          </ol>
          <Btn onClick={instalar.cerrar} style={{ width: "100%" }}>Entendido</Btn>
        </Modal>
      )}

      {aviso && <div style={{ position: "fixed", bottom: "100px", left: "16px", right: "16px", maxWidth: "480px", margin: "0 auto", background: "#ef4444", color: "#fff", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", zIndex: 2000 }}>{aviso}</div>}

      <Asistente app="contenido" onCambio={cargar} />

      <div className="tr-dock">
        {tabs.map(t => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => t.id === "crear" ? irACrear({}) : irA(t.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: tab === t.id ? "#0066FF" : "#6b7280", fontFamily: "inherit", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "4px 8px", position: "relative" }}>
            <Icon name={t.icon} size={20} />
            {t.label}
            {t.id === "inicio" && programadas > 0 && <span style={{ position: "absolute", top: 0, right: 4, minWidth: "16px", height: "16px", background: "#f59e0b", borderRadius: "100px", fontSize: "9px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}>{programadas}</span>}
          </button>
        ))}
      </div>
    </Shell>
  );
}

function useInstalar() {
  const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone);
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [prompt, setPrompt] = useState(() => window.__promptInstalar || null);
  const [ayudaIOS, setAyudaIOS] = useState(false);
  useEffect(() => {
    const listo = () => setPrompt(window.__promptInstalar);
    const instalada = () => setPrompt(null);
    window.addEventListener("promptinstalar", listo);
    window.addEventListener("appinstalled", instalada);
    return () => { window.removeEventListener("promptinstalar", listo); window.removeEventListener("appinstalled", instalada); };
  }, []);
  return {
    visible: !standalone && (Boolean(prompt) || ios),
    ayudaIOS,
    cerrar: () => setAyudaIOS(false),
    abrir: async () => {
      if (prompt) { prompt.prompt(); await prompt.userChoice.catch(() => {}); setPrompt(null); window.__promptInstalar = null; }
      else if (ios) setAyudaIOS(true);
    },
  };
}

const Shell = ({ children }) => (
  <div style={{ minHeight: "100vh", background: "#05070d", fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif", color: "#fff", display: "flex", flexDirection: "column", position: "relative", isolation: "isolate" }}>
    <Fondo />
    {children}
  </div>
);

const Hero = ({ publicadas, onCrear }) => {
  return (
    <div className="tr-hero" style={card}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ color: "#1EB6FF", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "12px" }}>Estudio de contenido</div>
        <h1>Creá. Programá.<br /><span>Publicá.</span></h1>
        <p style={{ color: "#8b93a7", fontSize: "14px", lineHeight: 1.55, margin: "14px 0 18px", maxWidth: "320px" }}>Carruseles, historias y Marketplace con la identidad de Tecno Riv. {publicadas ? `${publicadas} publicada${publicadas > 1 ? "s" : ""} esta semana.` : "Arrancá la semana con tu primer post."}</p>
        <Btn onClick={onCrear} style={{ padding: "12px 20px" }}><Icon name="plus" size={16} /> Nueva pieza</Btn>
      </div>
      <Marca3D />
    </div>
  );
};
