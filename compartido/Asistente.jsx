import { useState, useEffect, useRef } from "react";

// Asistente IA flotante, compartido por /gestion y /contenido.
// Consulta los datos reales del negocio y propone cambios: nada se ejecuta sin tocar "Confirmar".

const getClave = () => { try { return localStorage.getItem("clavePanel") || ""; } catch { return ""; } };
const CLAVE_LS = "asistenteTR";
const leerLS = () => { try { return JSON.parse(localStorage.getItem(CLAVE_LS) || "[]"); } catch { return []; } };
const guardarLS = (m) => { try { localStorage.setItem(CLAVE_LS, JSON.stringify(m.slice(-40))); } catch {} };

async function api(ruta, body) {
  const r = await fetch("/api/asistente" + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-panel-key": getClave() },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
  return data;
}

const SUGERENCIAS = {
  gestion: ["¿Cómo vengo este mes?", "¿Qué tengo que reponer?", "¿Cuál es mi producto más rentable?", "Vendí 1 AirPods en efectivo a Juan"],
  contenido: ["Armame la semana de contenido", "¿Qué producto conviene promocionar?", "Creá un carrusel de tips para elegir smartwatch", "¿Qué tengo programado?"],
};

// Markdown mínimo: **negrita**, viñetas y saltos de línea.
function Texto({ children }) {
  const lineas = String(children || "").split("\n");
  const inline = (t, k) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith("**") && p.endsWith("**") ? <b key={k + "-" + i} style={{ color: "#fff" }}>{p.slice(2, -2)}</b> : p);
  return lineas.map((l, i) => {
    const vineta = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (vineta) return <div key={i} style={{ display: "flex", gap: "8px", margin: "3px 0" }}><span style={{ color: "#1EB6FF" }}>•</span><span>{inline(vineta[1], i)}</span></div>;
    if (/^#+\s/.test(l)) return <div key={i} style={{ fontWeight: 700, color: "#fff", margin: "8px 0 2px" }}>{inline(l.replace(/^#+\s/, ""), i)}</div>;
    return l.trim() ? <div key={i} style={{ margin: "2px 0" }}>{inline(l, i)}</div> : <div key={i} style={{ height: "6px" }} />;
  });
}

const Chispa = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" />
    <path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" opacity=".7" />
  </svg>
);

function TarjetaAccion({ a, onConfirmar, onCancelar }) {
  const colores = { pendiente: "#1EB6FF", ejecutando: "#f59e0b", hecho: "#10b981", cancelado: "#6b7280", error: "#ef4444" };
  const c = colores[a.estado] || "#1EB6FF";
  return (
    <div style={{ border: `1px solid ${c}55`, background: `${c}12`, borderRadius: "14px", padding: "12px", marginTop: "8px" }}>
      <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: c, marginBottom: "4px" }}>
        {a.estado === "hecho" ? "✓ Hecho" : a.estado === "cancelado" ? "Cancelado" : a.estado === "error" ? "No se pudo" : a.estado === "ejecutando" ? "Ejecutando…" : "Confirmá la acción"}
      </div>
      <div style={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}>{a.titulo}</div>
      <div style={{ fontSize: "13px", color: "#cbd5e1", whiteSpace: "pre-line", marginTop: "2px" }}>{a.detalle}</div>
      {a.resultado && <div style={{ fontSize: "13px", color: a.estado === "error" ? "#fca5a5" : "#a7f3d0", marginTop: "6px" }}>{a.resultado}</div>}
      {a.estado === "pendiente" && (
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button onClick={onConfirmar} style={{ flex: 1, background: "linear-gradient(135deg,#0066FF,#1EB6FF)", color: "#fff", border: "none", borderRadius: "10px", padding: "9px", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Confirmar</button>
          <button onClick={onCancelar} style={{ flex: 1, background: "rgba(255,255,255,.06)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,.1)", borderRadius: "10px", padding: "9px", fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

export default function Asistente({ app = "gestion", onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState(leerLS);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const fin = useRef(null);
  const input = useRef(null);
  const Reconocer = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => { guardarLS(mensajes); }, [mensajes]);
  useEffect(() => { if (abierto) setTimeout(() => fin.current?.scrollIntoView({ block: "end" }), 30); }, [abierto, mensajes, pensando]);
  useEffect(() => {
    if (!abierto) return;
    const esc = (e) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abierto]);

  // Lo que se le manda a Claude: texto + cómo terminó cada acción propuesta.
  const historial = (ms) => ms.map(m => ({
    role: m.role,
    content: m.role === "assistant" && m.acciones?.length
      ? `${m.content || ""}\n${m.acciones.map(a => `[Acción "${a.titulo}" (${a.detalle.replace(/\n/g, " · ")}): ${a.estado === "hecho" ? "CONFIRMADA y hecha. " + (a.resultado || "") : a.estado === "error" ? "falló: " + a.resultado : a.estado === "cancelado" ? "Valen la canceló" : "sin confirmar todavía"}]`).join("\n")}`
      : m.content,
  }));

  const enviar = async (t = texto) => {
    const q = t.trim();
    if (!q || pensando) return;
    const nuevos = [...mensajes, { role: "user", content: q }];
    setMensajes(nuevos); setTexto(""); setPensando(true);
    try {
      const r = await api("/chat", { app, mensajes: historial(nuevos) });
      setMensajes(ms => [...ms, { role: "assistant", content: r.texto, acciones: (r.acciones || []).map(a => ({ ...a, estado: "pendiente" })) }]);
    } catch (e) {
      setMensajes(ms => [...ms, { role: "assistant", content: "⚠️ " + e.message, error: true }]);
    } finally { setPensando(false); }
  };

  const cambiarAccion = (mi, ai, cambios) => setMensajes(ms => ms.map((m, i) => i !== mi ? m : { ...m, acciones: m.acciones.map((a, j) => j !== ai ? a : { ...a, ...cambios }) }));
  const confirmar = async (mi, ai) => {
    const a = mensajes[mi].acciones[ai];
    cambiarAccion(mi, ai, { estado: "ejecutando" });
    try {
      const r = await api("/ejecutar", { herramienta: a.herramienta, datos: a.datos });
      cambiarAccion(mi, ai, { estado: "hecho", resultado: r.mensaje });
      onCambio?.(r);
    } catch (e) { cambiarAccion(mi, ai, { estado: "error", resultado: e.message }); }
  };

  const dictar = () => {
    if (!Reconocer || escuchando) return;
    const rec = new Reconocer();
    rec.lang = "es-AR"; rec.interimResults = false;
    rec.onresult = (e) => setTexto(t => (t ? t + " " : "") + e.results[0][0].transcript);
    rec.onend = () => { setEscuchando(false); input.current?.focus(); };
    rec.onerror = () => setEscuchando(false);
    setEscuchando(true); rec.start();
  };

  const vacio = mensajes.length === 0;

  return (
    <>
      <style>{`
        .tr-ia-fab{position:fixed;right:16px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:150;height:52px;padding:0 18px 0 15px;border-radius:100px;border:1px solid rgba(150,205,255,.55);background:linear-gradient(135deg,#0a3dff,#0066FF 45%,#1EB6FF);color:#fff;display:flex;align-items:center;gap:8px;font:700 14px 'Space Grotesk',system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 30px -6px rgba(0,102,255,.7),0 0 0 4px rgba(0,102,255,.12);animation:trIaPulso 3.2s ease-in-out infinite}
        .tr-ia-fab:hover{filter:brightness(1.1)}
        @keyframes trIaPulso{0%,100%{box-shadow:0 10px 30px -6px rgba(0,102,255,.7),0 0 0 4px rgba(0,102,255,.12)}50%{box-shadow:0 10px 34px -4px rgba(30,182,255,.85),0 0 0 8px rgba(0,102,255,.06)}}
        .tr-ia-panel{position:fixed;z-index:2500;right:20px;bottom:20px;width:410px;height:min(680px,calc(100vh - 40px));display:flex;flex-direction:column;border-radius:22px;overflow:hidden;background:rgba(8,12,22,.97);border:1px solid rgba(120,180,255,.18);box-shadow:0 30px 80px -10px rgba(0,0,0,.85),0 0 40px -10px rgba(0,102,255,.35);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);font-family:'Space Grotesk','Inter',system-ui,sans-serif;color:#e5e7eb;animation:trIaEntra .22s ease-out}
        @keyframes trIaEntra{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
        @media (max-width:620px){.tr-ia-panel{inset:0;width:auto;height:auto;border-radius:0;border:none}.tr-ia-fab{width:54px;height:54px;padding:0;justify-content:center}.tr-ia-fab span{display:none}}
        @media (prefers-reduced-motion:reduce){.tr-ia-fab,.tr-ia-panel{animation:none}}
        .tr-ia-pt{display:inline-block;width:6px;height:6px;border-radius:50%;background:#1EB6FF;margin-right:4px;animation:trIaPt 1s infinite ease-in-out}
        .tr-ia-pt:nth-child(2){animation-delay:.15s}.tr-ia-pt:nth-child(3){animation-delay:.3s}
        @keyframes trIaPt{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
      `}</style>

      {!abierto && (
        <button className="tr-ia-fab" onClick={() => { setAbierto(true); setTimeout(() => input.current?.focus(), 60); }} aria-label="Abrir asistente IA">
          <Chispa size={21} /><span>Asistente IA</span>
        </button>
      )}

      {abierto && (
        <div className="tr-ia-panel" role="dialog" aria-label="Asistente IA">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 14px 12px 16px", paddingTop: "calc(14px + env(safe-area-inset-top))", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: "linear-gradient(135deg,#0066FF,#1EB6FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 0 18px rgba(30,150,255,.5)" }}><Chispa size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#fff" }}>Asistente IA</div>
              <div style={{ fontSize: "11px", color: "#10b981" }}>● Conectado a tus datos</div>
            </div>
            {!vacio && <button onClick={() => setMensajes([])} title="Nueva conversación" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#9ca3af", borderRadius: "100px", padding: "5px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Nueva</button>}
            <button onClick={() => setAbierto(false)} aria-label="Cerrar" style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "24px", lineHeight: 1, cursor: "pointer", padding: "0 4px" }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {vacio && (
              <div style={{ margin: "auto 0", textAlign: "center", padding: "0 6px" }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, margin: "0 auto 12px", background: "linear-gradient(135deg,#0066FF,#1EB6FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 0 30px rgba(30,150,255,.5)" }}><Chispa size={28} /></div>
                <div style={{ fontWeight: 700, fontSize: "18px", color: "#fff" }}>¿En qué te ayudo, Valen?</div>
                <div style={{ fontSize: "13px", color: "#9ca3af", margin: "6px 0 18px", lineHeight: 1.5 }}>Veo tu stock, ventas, gastos, clientes y contenido. Preguntame o pedime que cargue algo: te muestro la acción y la confirmás vos.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(SUGERENCIAS[app] || SUGERENCIAS.gestion).map(s => (
                    <button key={s} onClick={() => enviar(s)} style={{ textAlign: "left", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", color: "#d1d5db", borderRadius: "12px", padding: "10px 12px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => m.role === "user" ? (
              <div key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", background: "linear-gradient(135deg,#0058e6,#0a84ff)", color: "#fff", padding: "9px 13px", borderRadius: "16px 16px 4px 16px", fontSize: "14px", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</div>
            ) : (
              <div key={i} style={{ alignSelf: "flex-start", maxWidth: "92%", fontSize: "14px", lineHeight: 1.5, color: m.error ? "#fca5a5" : "#d1d5db", wordBreak: "break-word" }}>
                {m.content && <div style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.07)", padding: "10px 13px", borderRadius: "16px 16px 16px 4px" }}><Texto>{m.content}</Texto></div>}
                {(m.acciones || []).map((a, j) => <TarjetaAccion key={j} a={a} onConfirmar={() => confirmar(i, j)} onCancelar={() => cambiarAccion(i, j, { estado: "cancelado" })} />)}
              </div>
            ))}
            {pensando && <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.07)", padding: "12px 14px", borderRadius: "16px 16px 16px 4px" }}><span className="tr-ia-pt" /><span className="tr-ia-pt" /><span className="tr-ia-pt" /></div>}
            <div ref={fin} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); enviar(); }} style={{ display: "flex", gap: "8px", alignItems: "flex-end", padding: "10px 12px", paddingBottom: "calc(10px + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(255,255,255,.07)" }}>
            <textarea ref={input} value={texto} onChange={e => setTexto(e.target.value)} rows={1} placeholder={escuchando ? "Escuchando…" : "Escribí o dictá…"}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              style={{ flex: 1, resize: "none", maxHeight: "120px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "14px", color: "#fff", padding: "11px 13px", fontSize: "16px", fontFamily: "inherit", outline: "none", lineHeight: 1.3 }} />
            {Reconocer && <button type="button" onClick={dictar} aria-label="Dictar" title="Dictar" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "14px", border: "1px solid rgba(255,255,255,.1)", background: escuchando ? "#ef444433" : "rgba(255,255,255,.05)", color: escuchando ? "#fca5a5" : "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>}
            <button type="submit" disabled={!texto.trim() || pensando} aria-label="Enviar" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "14px", border: "none", background: texto.trim() && !pensando ? "linear-gradient(135deg,#0066FF,#1EB6FF)" : "rgba(255,255,255,.08)", color: "#fff", cursor: texto.trim() && !pensando ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
