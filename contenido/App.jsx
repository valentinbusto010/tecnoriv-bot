import { useState, useEffect, useCallback } from "react";
import { Fondo, Marca3D, card, fieldSt, chipSt, btnFondo } from "../compartido/tema.jsx";

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

const Detalle = ({ id, datos, onClose, onCambio }) => {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [visor, setVisor] = useState(null);
  const [copiado, setCopiado] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [caption, setCaption] = useState("");
  const [editar, setEditar] = useState(null);
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
    <Modal title={p.titulo} onClose={onClose} ancho="760px">
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
      {p.formato === "historias" && <p style={{ color: "#6b7280", fontSize: "12px", margin: "0 0 14px" }}>Subilas en orden. En la última agregá el sticker <b>Enlace</b> con tu WhatsApp (wa.me/5493585764330).</p>}

      {!esMkp && p.guion?.slides && <div style={{ marginBottom: "14px" }}>
        {!editar ? <button onClick={() => setEditar(JSON.parse(JSON.stringify(p.guion.slides)))} style={chipSt(false)}><Icon name="edit" size={12} /> Editar textos de las imágenes</button> : (
          <div style={{ ...card, padding: "14px", background: "rgba(0,0,0,0.28)" }}>
            <div style={{ ...sectionLabel, marginBottom: "10px" }}>Textos de cada slide</div>
            {editar.map((s, i) => (
              <div key={i} style={{ borderTop: i ? "1px solid rgba(255,255,255,0.07)" : "none", padding: "10px 0" }}>
                <div style={{ color: "#1EB6FF", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>{i + 1} · {TIPOS_SLIDE[s.tipo] || s.tipo}</div>
                <input value={s.kicker} onChange={e => setEditar(ed => ed.map((x, k) => k === i ? { ...x, kicker: e.target.value } : x))} placeholder="Rótulo chico" style={{ ...fieldSt, fontSize: "14px", marginBottom: "6px" }} />
                <input value={(s.titular || []).join(" / ")} onChange={e => setEditar(ed => ed.map((x, k) => k === i ? { ...x, titular: e.target.value.split("/").map(t => t.trim()).filter(Boolean) } : x))} placeholder="Titular (separá líneas con /)" style={{ ...fieldSt, fontSize: "14px", marginBottom: "6px" }} />
                {(s.titular || []).length > 1 && <div style={{ display: "flex", gap: "4px", marginBottom: "6px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ color: "#6b7280", fontSize: "11px" }}>Línea en celeste:</span>
                  {s.titular.map((_, k) => <button key={k} onClick={() => setEditar(ed => ed.map((x, j) => j === i ? { ...x, destacada: k } : x))} style={{ ...chipSt(s.destacada === k), padding: "3px 10px" }}>{k + 1}</button>)}
                </div>}
                {["portada", "texto", "producto", "cta"].includes(s.tipo) && <textarea value={s.cuerpo} onChange={e => setEditar(ed => ed.map((x, k) => k === i ? { ...x, cuerpo: e.target.value } : x))} rows={2} placeholder="Texto" style={{ ...fieldSt, fontSize: "14px", resize: "vertical" }} />}
                {["lista", "comparativa"].includes(s.tipo) && <textarea value={(s.items || []).join("\n")} onChange={e => setEditar(ed => ed.map((x, k) => k === i ? { ...x, items: e.target.value.split("\n") } : x))} rows={4} placeholder="Un punto por línea" style={{ ...fieldSt, fontSize: "14px", resize: "vertical" }} />}
                {s.tipo === "comparativa" && <textarea value={(s.items_b || []).join("\n")} onChange={e => setEditar(ed => ed.map((x, k) => k === i ? { ...x, items_b: e.target.value.split("\n") } : x))} rows={3} placeholder="Puntos del segundo producto" style={{ ...fieldSt, fontSize: "14px", resize: "vertical", marginTop: "6px" }} />}
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setEditar(null)}>Cancelar</Btn>
              <Btn onClick={() => hacer("rehacer", async () => { await api(`/piezas/${p.id}/rehacer`, "POST", { slides: editar.map(s => ({ ...s, items: (s.items || []).filter(Boolean), items_b: (s.items_b || []).filter(Boolean) })) }); setEditar(null); })} disabled={ocupado === "rehacer"}>{ocupado === "rehacer" ? "Rehaciendo…" : "Rehacer imágenes"}</Btn>
            </div>
          </div>
        )}
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
  ];

  return (
    <Shell>
      <div className="tr-glass-bar" style={{ borderBottom: "1px solid", padding: "0 16px", height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg,#1a7bff,#0047c2)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "12px", boxShadow: "0 6px 16px -4px rgba(0,102,255,0.7), inset 0 1px 0 rgba(255,255,255,0.25)" }}>TR</div>
          <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em" }}>Contenido</span>
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
