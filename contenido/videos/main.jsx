// Pestaña "Videos" del Estudio IA (/contenido). Se carga aparte (public/contenido-videos.js) solo cuando se abre.
// Vista previa con @remotion/player y exportación a MP4 en el navegador con @remotion/web-renderer.
import { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { renderMediaOnWeb, canRenderMediaOnWeb } from "@remotion/web-renderer";
import { PLANTILLAS, FPS, ANCHO, ALTO } from "./plantillas.jsx";

const chip = (on) => ({ background: on ? "linear-gradient(135deg,#0066FF,#1EB6FF)" : "rgba(255,255,255,0.05)", color: on ? "#fff" : "#d1d5db", border: on ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
const campo = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none" };
const rotulo = { display: "block", color: "#9ca3af", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "12px 0 6px" };
const tarjeta = { background: "rgba(13,18,30,0.72)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 16 };
const mezclar = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);

function Videos({ datos, api }) {
  const [plantilla, setPlantilla] = useState("reel");
  const [sel, setSel] = useState([]);           // ids de productos
  const [galeria, setGaleria] = useState({});   // id -> [urls]
  const [semilla, setSemilla] = useState(0);
  const [kicker, setKicker] = useState("");
  const [linea, setLinea] = useState("Pedí por WhatsApp");
  const [titulo, setTitulo] = useState("");
  const [render, setRender] = useState(null);   // { progreso, url, error }
  const promo = datos.promo;
  const whatsapp = datos.whatsapp || "358 517-8319";
  const P = PLANTILLAS[plantilla];
  const productos = (datos.productos || []).filter((p) => p.activo !== false && Number(p.precio) > 0);
  const precioDe = (p) => (promo?.descuento ? Math.round(Number(p.precio) * (1 - promo.descuento / 100)) : Number(p.precio));
  const hasta = promo?.hasta ? promo.hasta.split("-").reverse().slice(0, 2).join("/") : "";

  useEffect(() => {
    setKicker(promo?.descuento ? `${promo.descuento}% OFF hasta el ${hasta}` : "Tecno Riv · Río Cuarto");
    setTitulo(promo?.descuento ? `${promo.descuento}% OFF` : "CATÁLOGO");
  }, [promo?.descuento, hasta]);

  // Fotos de la galería de los productos elegidos
  useEffect(() => {
    const faltan = sel.filter((id) => !galeria[id]);
    if (!faltan.length) return;
    api(`/galeria?ids=${faltan.join(",")}`).then((fs) => {
      setGaleria((g) => {
        const n = { ...g };
        for (const id of faltan) n[id] = [...new Set(fs.filter((f) => f.producto_id === id).map((f) => f.url))];
        return n;
      });
    }).catch(() => {});
  }, [sel.join(",")]); // eslint-disable-line

  const elegir = (id) => setSel((s) => (P.multi ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(0, 6)) : [id]));
  useEffect(() => { if (!P.multi) setSel((s) => s.slice(0, 1)); setRender(null); }, [plantilla]); // eslint-disable-line

  const props = useMemo(() => {
    const prods = sel.map((id) => productos.find((p) => p.id === id)).filter(Boolean);
    const fotosDe = (p, n) => {
      const g = galeria[p.id]?.length ? galeria[p.id] : p.imagen_url ? [p.imagen_url] : [];
      return mezclar(g).slice(0, n);
    };
    void semilla;
    const p0 = prods[0];
    const antes = (p) => (promo?.descuento ? Number(p.precio) : null);
    if (plantilla === "reel" && p0) return { nombre: p0.nombre, precio: precioDe(p0), antes: antes(p0), fotos: fotosDe(p0, 3), kicker, linea, whatsapp };
    if (plantilla === "antes" && p0 && !promo?.descuento) return null;
    if (plantilla === "antes" && p0) return { nombre: p0.nombre, precio: precioDe(p0), antes: antes(p0) || Number(p0.precio), foto: fotosDe(p0, 1)[0], kicker, linea, whatsapp };
    if (P.multi && prods.length) {
      const esPromo = plantilla === "promo" && promo?.descuento;
      return {
        titulo: plantilla === "catalogo" ? titulo || "CATÁLOGO" : esPromo ? titulo : (titulo === "CATÁLOGO" ? "OFERTAS" : titulo), subtitulo: plantilla === "catalogo" ? "TECNO RIV" : esPromo ? "EN TODO" : "TECNO RIV", hasta: esPromo ? hasta : "",
        productos: prods.map((p) => ({ nombre: p.nombre, precio: esPromo ? precioDe(p) : Number(p.precio), antes: esPromo ? Number(p.precio) : null, foto: fotosDe(p, 1)[0] })),
        linea, whatsapp,
      };
    }
    return null;
  }, [plantilla, sel.join(","), galeria, semilla, kicker, linea, titulo, promo?.descuento]); // eslint-disable-line

  const duracion = props ? P.duracion(props) : 1;

  const exportar = async () => {
    setRender({ progreso: 0 });
    try {
      const composition = { id: plantilla, component: P.componente, width: ANCHO, height: ALTO, fps: FPS, durationInFrames: duracion };
      let container = "mp4";
      const ok = await canRenderMediaOnWeb({ container: "mp4", videoCodec: "h264", width: ANCHO, height: ALTO }).catch(() => null);
      if (ok && ok.canRender === false) container = "webm";
      const r = await renderMediaOnWeb({ composition, inputProps: props, container, videoCodec: container === "mp4" ? "h264" : "vp8", videoBitrate: "high", onProgress: (p) => setRender({ progreso: p.progress }) });
      const blob = await r.getBlob();
      setRender({ progreso: 1, url: URL.createObjectURL(blob), ext: container });
    } catch (e) {
      setRender({ error: `No se pudo exportar en este navegador (${e.message}). Probá desde Chrome en la compu.` });
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start", color: "#fff", fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}>
      <div style={tarjeta}>
        <span style={{ ...rotulo, marginTop: 0 }}>Plantilla</span>
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(PLANTILLAS).map(([id, t]) => (
            <button key={id} onClick={() => setPlantilla(id)} style={{ textAlign: "left", background: plantilla === id ? "rgba(0,102,255,0.18)" : "rgba(255,255,255,0.03)", border: plantilla === id ? "1px solid #1EB6FF" : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 12px", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.nombre}</div>
              <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        <span style={rotulo}>{P.multi ? "Productos (hasta 6, en orden)" : "Producto"}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 170, overflowY: "auto" }}>
          {productos.map((p) => <button key={p.id} onClick={() => elegir(p.id)} style={chip(sel.includes(p.id))}>{sel.includes(p.id) && P.multi ? `${sel.indexOf(p.id) + 1}. ` : ""}{p.nombre}</button>)}
        </div>

        {(plantilla === "reel" || plantilla === "antes") && <><span style={rotulo}>Texto de arriba</span><input value={kicker} onChange={(e) => setKicker(e.target.value)} style={campo} /></>}
        {P.multi && <><span style={rotulo}>Título de la intro</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={campo} /></>}
        <span style={rotulo}>Frase del cierre</span>
        <input value={linea} onChange={(e) => setLinea(e.target.value)} style={campo} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => setSemilla((x) => x + 1)} disabled={!props} style={chip(false)}>🔀 Otras fotos</button>
        </div>
      </div>

      <div style={tarjeta}>
        {props ? (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Player component={P.componente} inputProps={props} durationInFrames={duracion} fps={FPS} compositionWidth={ANCHO} compositionHeight={ALTO} controls loop autoPlay style={{ width: "100%", maxWidth: 320, aspectRatio: "9 / 16", borderRadius: 14, overflow: "hidden", background: "#000" }} />
            </div>
            <div style={{ color: "#6b7280", fontSize: 12, textAlign: "center", margin: "8px 0 12px" }}>{(duracion / FPS).toFixed(0)} s · 1080×1920 (Reels / historias)</div>
            {!render?.url && (
              <button onClick={exportar} disabled={render && !render.error && render.progreso < 1} style={{ width: "100%", background: "linear-gradient(135deg,#0066FF,#1EB6FF)", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {render && !render.error ? `Exportando… ${Math.round((render.progreso || 0) * 100)}%` : "⬇ Exportar video MP4"}
              </button>
            )}
            {render?.url && (
              <div style={{ display: "grid", gap: 8 }}>
                <a href={render.url} download={`tecnoriv-${plantilla}.${render.ext}`} style={{ display: "block", textAlign: "center", background: "#10b981", color: "#04120c", borderRadius: 10, padding: 12, fontWeight: 800, textDecoration: "none" }}>⬇ Descargar video ({render.ext.toUpperCase()})</a>
                <button onClick={() => setRender(null)} style={chip(false)}>Exportar de nuevo</button>
              </div>
            )}
            {render?.error && <div style={{ color: "#fca5a5", fontSize: 13, marginTop: 8 }}>{render.error}</div>}
            <div style={{ color: "#6b7280", fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>El video se arma en tu navegador (gratis). En la compu con Chrome tarda ~1 minuto; en el celu puede no estar disponible. Subilo a Instagram como Reel o historia.</div>
          </>
        ) : (
          <div style={{ color: "#6b7280", fontSize: 14, textAlign: "center", padding: "60px 10px" }}>{plantilla === "antes" && !promo?.descuento ? "\"Precio antes / después\" necesita una promo con % OFF activa (Gestión → Stock → ⚙️)." : `Elegí ${P.multi ? "uno o más productos" : "un producto"} para ver la vista previa.`}</div>
        )}
      </div>
    </div>
  );
}

window.TRVideos = {
  montar(el, props) {
    const raiz = createRoot(el);
    raiz.render(<Videos {...props} />);
    return () => raiz.unmount();
  },
};
