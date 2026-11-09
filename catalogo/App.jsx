import { useState, useEffect, useCallback, useMemo } from "react";
import { Fondo, Marca3D, MiniLogo, card, fieldSt, chipSt, btnFondo } from "../compartido/tema.jsx";

// Catálogo público de Tecno Riv: productos y precios en vivo (misma base que el bot y /gestion).
// El cliente arma su pedido y lo manda por WhatsApp con un toque.

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
  const [verCarrito, setVerCarrito] = useState(false);
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

  return (
    <Shell>
      {/* Barra superior */}
      <div className="tr-glass-bar" style={{ borderBottom: "1px solid", padding: "0 16px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <MiniLogo alto={32} />
          <div className="tr-hide-sm" style={{ color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>Catálogo · {negocio.ciudad.split(",")[0]}</div>
        </div>
        <Btn href={linkWa("¡Hola Tecno Riv! 👋 Tengo una consulta.")} style={{ ...verde, padding: "8px 14px", fontSize: "13px", borderRadius: "100px" }}><Icon name="wa" size={15} /> Escribinos</Btn>
      </div>

      <div style={{ maxWidth: "1040px", margin: "0 auto", width: "100%", padding: "18px 16px 120px", boxSizing: "border-box" }}>
        {/* Portada */}
        <div className="tr-hero" style={card}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ color: "#1EB6FF", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "12px" }}>Catálogo · precios en vivo</div>
            <h1>Tecnología<br /><span>a un mensaje.</span></h1>
            <p style={{ color: "#8b93a7", fontSize: "14px", lineHeight: 1.55, margin: "14px 0 0", maxWidth: "340px" }}>Elegí lo que te gusta, armá tu pedido y mandalo por WhatsApp. Te respondemos al toque.</p>
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
          1. Agregá los productos que quieras.<br />2. Tocá <b style={{ color: "#fff" }}>Pedir por WhatsApp</b>: se arma el mensaje solo.<br />3. Coordinamos envío o retiro y pagás como prefieras.
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
          <button onClick={() => setVerCarrito(true)} style={{ all: "unset", cursor: "pointer", boxSizing: "border-box", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "14px 18px", borderRadius: "18px", ...verde, color: "#fff", fontWeight: 800, fontSize: "15px", boxShadow: "0 18px 40px -12px rgba(0,0,0,.8), 0 8px 22px -8px rgba(37,211,102,.7)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><Icon name="bolsa" size={18} /> Ver pedido ({unidades})</span>
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
                    : <Btn onClick={() => poner(p.id, 1)} style={{ flex: 1 }}>Agregar al pedido</Btn>}
                  <Btn href={linkWa(mensajeProducto(p))} style={{ flex: 1, ...verde }}><Icon name="wa" size={16} /> Consultar</Btn>
                </>}
          </div>
        </Hoja>
      )}

      {/* Pedido */}
      {verCarrito && (
        <Hoja onClose={() => setVerCarrito(false)} titulo="Tu pedido">
          {items.length === 0 ? <p style={{ color: "#6b7280" }}>Todavía no agregaste productos.</p> : <>
            {items.map(({ p: x, n }) => (
              <div key={x.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ width: 56, flexShrink: 0 }}><Foto p={x} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>{x.nombre}</div>
                  <div style={{ color: "#9ca3af", fontSize: "12px" }}>{fmt(x.precio)} c/u</div>
                </div>
                <Cantidad n={n} onMas={() => poner(x.id, n + 1)} onMenos={() => poner(x.id, n - 1)} />
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "14px 0 4px" }}>
              <span style={{ color: "#9ca3af" }}>Total</span>
              <span style={{ fontSize: "26px", fontWeight: 800 }}>{fmt(total)}</span>
            </div>
            {descEf > 0 && totalEfectivo < total && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px", color: "#34d399" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>💵 Pagando en efectivo ({descEf}% OFF)</span>
                <span style={{ fontSize: "20px", fontWeight: 800 }}>{fmt(totalEfectivo)}</span>
              </div>
            )}
            <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "12px" }}>{negocio.envios}. Pagás cuando recibís.</div>
            <Btn href={linkWa(mensajePedido())} style={{ width: "100%", boxSizing: "border-box", ...verde, padding: "15px" }}><Icon name="wa" size={18} /> Pedir por WhatsApp</Btn>
            <button onClick={() => { setCarrito({}); setVerCarrito(false); }} style={{ all: "unset", cursor: "pointer", display: "block", margin: "12px auto 0", color: "#6b7280", fontSize: "12px" }}>Vaciar pedido</button>
          </>}
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
`}</style>
    {children}
  </div>
);
