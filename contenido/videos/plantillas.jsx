// Plantillas de video (Remotion) para Reels / historias de Tecno Riv. 1080x1920, 30 fps.
// Se previsualizan con @remotion/player y se exportan a MP4 en el navegador con @remotion/web-renderer.
import { AbsoluteFill, Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";

export const FPS = 30;
export const ANCHO = 1080;
export const ALTO = 1920;
const AZUL = "#1EB6FF";
const FUENTE = "'Space Grotesk', 'Inter', system-ui, sans-serif";
const MARCA = "'Michroma', 'Space Grotesk', sans-serif";
export const fmt = (n) => "$" + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const Foto = ({ src, dur, zoomDesde = 1, zoomHasta = 1.14, panX = 0 }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, dur], [zoomDesde, zoomHasta], { extrapolateRight: "clamp" });
  const x = interpolate(f, [0, dur], [0, panX], { extrapolateRight: "clamp" });
  const op = interpolate(f, [0, 8, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: op, overflow: "hidden", backgroundColor: "#05070d" }}>
      {src ? <Img src={src} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${z}) translateX(${x}px)` }} /> : null}
    </AbsoluteFill>
  );
};

const Degradado = ({ desde = 0.15 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(5,7,13,0.55) 0%, rgba(5,7,13,0) ${Math.round(desde * 100)}%, rgba(5,7,13,0) 45%, rgba(5,7,13,0.92) 100%)` }} />
);

const Pastilla = ({ children, desde = 0, color = AZUL }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f - desde, fps, config: { damping: 14 } });
  return (
    <div style={{ position: "absolute", top: 120, left: 70, transform: `translateX(${interpolate(s, [0, 1], [-500, 0])}px)`, opacity: s, background: color, color: "#04121f", fontFamily: FUENTE, fontWeight: 800, fontSize: 40, letterSpacing: 2, padding: "16px 30px", borderRadius: 60, textTransform: "uppercase" }}>{children}</div>
  );
};

const Entra = ({ children, desde = 0, dy = 80, style }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f - desde, fps, config: { damping: 16, mass: 0.8 } });
  return <div style={{ transform: `translateY(${interpolate(s, [0, 1], [dy, 0])}px)`, opacity: s, ...style }}>{children}</div>;
};

const Precio = ({ precio, antes, desde = 0, tam = 150 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f - desde, fps, config: { damping: 9, stiffness: 140 } });
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 26, transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`, transformOrigin: "left bottom", opacity: Math.min(1, s * 1.5) }}>
      <span style={{ fontFamily: FUENTE, fontWeight: 800, fontSize: tam, color: "#fff", letterSpacing: -3 }}>{fmt(precio)}</span>
      {antes ? <span style={{ fontFamily: FUENTE, fontWeight: 600, fontSize: tam * 0.36, color: "#9ca3af", textDecoration: "line-through" }}>{fmt(antes)}</span> : null}
    </div>
  );
};

// Cartel de la marca (TECNO riv) + WhatsApp + envío, para cerrar todos los videos.
export const Cierre = ({ whatsapp, linea = "Pedí por WhatsApp", detalle = "Envío gratis en Río Cuarto" }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 13 } });
  const brillo = interpolate(f % 60, [0, 30, 60], [0.55, 1, 0.55]);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #071226 0%, #05070d 60%, #020409 100%)", alignItems: "center", justifyContent: "center", fontFamily: FUENTE }}>
      <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`, opacity: s, padding: "46px 70px", borderRadius: 40, border: "4px solid rgba(150,205,255,0.85)", background: "linear-gradient(180deg,#141c2c 0%,#070b14 60%,#04070d 100%)", boxShadow: `0 0 ${Math.round(60 * brillo)}px rgba(30,150,255,${0.7 * brillo})` }}>
        <span style={{ fontFamily: MARCA, fontSize: 110, color: "#fff" }}>TECNO</span>
        <span style={{ fontFamily: MARCA, fontSize: 110, color: AZUL, marginLeft: 26 }}>riv</span>
      </div>
      <Entra desde={10} style={{ marginTop: 90, textAlign: "center" }}>
        <div style={{ color: "#fff", fontSize: 64, fontWeight: 800 }}>{linea}</div>
        {whatsapp ? <div style={{ marginTop: 26, display: "inline-block", border: `3px solid ${AZUL}`, color: "#fff", borderRadius: 80, padding: "18px 46px", fontSize: 54, fontWeight: 700 }}>WhatsApp {whatsapp}</div> : null}
        <div style={{ color: "#9ca3af", fontSize: 40, marginTop: 30 }}>{detalle}</div>
      </Entra>
    </AbsoluteFill>
  );
};

// ───── 1) REEL DE PRODUCTO: 3 fotos con zoom + nombre + precio + cierre ─────
export const reelDuracion = (p) => Math.max(1, (p.fotos || []).length) * 90 + 90;
export const ReelProducto = ({ nombre, precio, antes, fotos = [], kicker, linea, whatsapp, extra }) => {
  const lista = fotos.length ? fotos : [null];
  const total = lista.length * 90;
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070d", fontFamily: FUENTE }}>
      {lista.map((src, i) => (
        <Sequence key={i} from={i * 90} durationInFrames={98}><Foto src={src} dur={98} zoomDesde={i % 2 ? 1.14 : 1} zoomHasta={i % 2 ? 1 : 1.14} panX={i % 2 ? -30 : 30} /></Sequence>
      ))}
      <Sequence durationInFrames={total}>
        <Degradado />
        {kicker ? <Pastilla desde={6}>{kicker}</Pastilla> : null}
        <div style={{ position: "absolute", left: 70, right: 70, bottom: 170 }}>
          <Entra desde={14}><div style={{ color: "#fff", fontSize: 104, fontWeight: 800, lineHeight: 1.0, letterSpacing: -2, textTransform: "uppercase" }}>{nombre}</div></Entra>
          {extra ? <Entra desde={26}><div style={{ color: "#cbd5e1", fontSize: 44, marginTop: 22, lineHeight: 1.3 }}>{extra}</div></Entra> : null}
          <div style={{ marginTop: 34 }}><Precio precio={precio} antes={antes} desde={40} /></div>
        </div>
      </Sequence>
      <Sequence from={total} durationInFrames={90}><Cierre whatsapp={whatsapp} linea={linea} /></Sequence>
    </AbsoluteFill>
  );
};

// ───── 2) PROMO / CATÁLOGO: intro + un producto cada 2 s + cierre ─────
export const promoDuracion = (p) => 75 + Math.max(1, (p.productos || []).length) * 60 + 90;
export const Promo = ({ titulo = "20% OFF", subtitulo = "EN TODO", hasta, productos = [], whatsapp, linea }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 8, stiffness: 120 } });
  const n = Math.max(1, productos.length);
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070d", fontFamily: FUENTE }}>
      <Sequence durationInFrames={75}>
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #05070d 0%, #0b3a8a 45%, #05070d 100%)", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.3, 1])}) rotate(${interpolate(s, [0, 1], [-8, 0])}deg)`, color: "#fff", fontSize: 230, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }}>{titulo}</div>
          <Entra desde={12}><div style={{ color: AZUL, fontSize: 110, fontWeight: 800, marginTop: 10 }}>{subtitulo}</div></Entra>
          {hasta ? <Entra desde={24}><div style={{ color: "#e5e7eb", fontSize: 54, marginTop: 40, border: "3px solid rgba(255,255,255,0.35)", borderRadius: 80, padding: "14px 40px" }}>Hasta el {hasta}</div></Entra> : null}
        </AbsoluteFill>
      </Sequence>
      {productos.map((p, i) => (
        <Sequence key={i} from={75 + i * 60} durationInFrames={66}>
          <Foto src={p.foto} dur={66} zoomDesde={1.04} zoomHasta={1.16} panX={i % 2 ? -25 : 25} />
          <Degradado desde={0.1} />
          <div style={{ position: "absolute", top: 120, right: 70, color: "#fff", fontSize: 40, fontWeight: 700, opacity: 0.85 }}>{i + 1}/{n}</div>
          <div style={{ position: "absolute", left: 70, right: 70, bottom: 190 }}>
            <Entra desde={4}><div style={{ color: "#fff", fontSize: 88, fontWeight: 800, lineHeight: 1.02, textTransform: "uppercase" }}>{p.nombre}</div></Entra>
            <div style={{ marginTop: 26 }}><Precio precio={p.precio} antes={p.antes} desde={12} tam={130} /></div>
          </div>
        </Sequence>
      ))}
      <Sequence from={75 + n * 60} durationInFrames={90}><Cierre whatsapp={whatsapp} linea={linea} /></Sequence>
    </AbsoluteFill>
  );
};

// ───── 3) PRECIO ANTES / DESPUÉS: el precio viejo se tacha y aparece el nuevo ─────
export const antesDuracion = () => 210;
export const AntesDespues = ({ nombre, precio, antes, foto, kicker, whatsapp, linea }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const tacha = interpolate(f, [40, 58], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const nuevo = spring({ frame: f - 62, fps, config: { damping: 7, stiffness: 160 } });
  const pct = antes ? Math.round((1 - precio / antes) * 100) : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070d", fontFamily: FUENTE }}>
      <Sequence durationInFrames={130}>
        <Foto src={foto} dur={130} zoomDesde={1.02} zoomHasta={1.12} />
        <Degradado desde={0.12} />
        {kicker ? <Pastilla desde={4}>{kicker}</Pastilla> : null}
        <div style={{ position: "absolute", left: 70, right: 70, bottom: 200 }}>
          <Entra desde={6}><div style={{ color: "#fff", fontSize: 96, fontWeight: 800, lineHeight: 1.02, textTransform: "uppercase" }}>{nombre}</div></Entra>
          <div style={{ position: "relative", display: "inline-block", marginTop: 30 }}>
            <span style={{ color: "#e5e7eb", fontSize: 110, fontWeight: 700, opacity: interpolate(f, [58, 80], [1, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{fmt(antes || precio)}</span>
            <div style={{ position: "absolute", left: 0, top: "52%", height: 12, width: `${tacha}%`, background: "#ef4444", borderRadius: 6, transform: "rotate(-4deg)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 10, transform: `scale(${interpolate(nuevo, [0, 1], [0.4, 1])})`, transformOrigin: "left center", opacity: Math.min(1, nuevo * 1.6) }}>
            <span style={{ color: "#fff", fontSize: 180, fontWeight: 800, letterSpacing: -4 }}>{fmt(precio)}</span>
            {pct > 0 ? <span style={{ background: "#ef4444", color: "#fff", fontSize: 58, fontWeight: 800, padding: "10px 24px", borderRadius: 24 }}>-{pct}%</span> : null}
          </div>
        </div>
      </Sequence>
      <Sequence from={130} durationInFrames={80}><Cierre whatsapp={whatsapp} linea={linea} /></Sequence>
    </AbsoluteFill>
  );
};

export const PLANTILLAS = {
  reel: { nombre: "Reel de producto", desc: "Fotos con zoom, nombre, precio y cierre con tu WhatsApp. 10-15 s.", componente: ReelProducto, duracion: reelDuracion, multi: false },
  promo: { nombre: "Promo / oferta", desc: "\"20% OFF EN TODO\" + varios productos con precio + fecha límite.", componente: Promo, duracion: promoDuracion, multi: true },
  antes: { nombre: "Precio antes / después", desc: "El precio viejo se tacha y aparece el precio promo. Ideal historias.", componente: AntesDespues, duracion: antesDuracion, multi: false },
  catalogo: { nombre: "Catálogo animado", desc: "Recorrido por varios productos con precio, sin promo. Para destacadas.", componente: Promo, duracion: promoDuracion, multi: true },
};
