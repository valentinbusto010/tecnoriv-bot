import { useState, useEffect } from "react";
// Estilo visual compartido de Tecno Riv (/gestion y /contenido):
// fondo minimalista con grilla y luces, tarjetas de vidrio y escena 3D animada.
// Si lo cambiás, rearmá las dos apps: node gestion/build.mjs && node contenido/build.mjs

export const card = { background: "rgba(14,18,28,0.62)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", backdropFilter: "blur(16px) saturate(140%)", WebkitBackdropFilter: "blur(16px) saturate(140%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px -12px rgba(0,0,0,0.6)" };
export const fieldSt = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", padding: "10px 14px", fontSize: "16px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
export const chipSt = (activo) => ({ background: activo ? "linear-gradient(135deg,#1a7bff,#0050d8)" : "rgba(255,255,255,0.06)", color: activo ? "#fff" : "#aab1c0", border: activo ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.06)", boxShadow: activo ? "0 4px 14px -4px rgba(0,102,255,0.6)" : "none", borderRadius: "100px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "4px" });
export const btnFondo = (variant) => ({
  background: variant === "primary" ? "linear-gradient(135deg,#1a7bff,#0050d8)" : variant === "danger" ? "#ef444418" : variant === "ok" ? "linear-gradient(135deg,#14c48b,#0e9f6e)" : "rgba(255,255,255,0.06)",
  boxShadow: variant === "primary" ? "0 8px 22px -8px rgba(0,102,255,0.75), inset 0 1px 0 rgba(255,255,255,0.18)" : variant === "ok" ? "0 8px 22px -8px rgba(16,185,129,0.6)" : "none",
});

// Fondo fijo de toda la app + estilos globales (va una vez, dentro del Shell).
export const Fondo = () => (
  <>
    <style>{CSS}</style>
    <div className="tr-bg" aria-hidden="true"><div className="tr-grid" /><div className="tr-orb tr-orb-a" /><div className="tr-orb tr-orb-b" /><div className="tr-noise" /></div>
  </>
);

const CSS = `
.tr-bg{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:radial-gradient(120% 80% at 50% -10%,#0b1630 0%,#05070d 55%)}
.tr-grid{position:absolute;inset:-2px;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse 75% 55% at 50% 0%,#000 30%,transparent 100%);mask-image:radial-gradient(ellipse 75% 55% at 50% 0%,#000 30%,transparent 100%)}
.tr-orb{position:absolute;border-radius:50%;filter:blur(90px);opacity:.5;will-change:transform}
.tr-orb-a{width:520px;height:520px;background:#0066FF;top:-220px;left:-160px;animation:trDrift 22s ease-in-out infinite alternate}
.tr-orb-b{width:420px;height:420px;background:#1EB6FF;top:30%;right:-220px;opacity:.22;animation:trDrift 28s ease-in-out infinite alternate-reverse}
.tr-noise{position:absolute;inset:0;opacity:.035;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
@keyframes trDrift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(80px,60px,0) scale(1.15)}}

.tr-lift{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s,border-color .35s}
.tr-lift:hover{transform:translateY(-4px) perspective(800px) rotateX(3deg);border-color:rgba(30,182,255,.35)!important;box-shadow:0 18px 40px -18px rgba(0,102,255,.55)!important}

.tr-hero{position:relative;display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:8px;padding:26px 24px;margin-bottom:20px;overflow:hidden}
.tr-hero h1{margin:0;font-size:38px;line-height:1;letter-spacing:-.045em;font-weight:700}
.tr-hero h1 span{background:linear-gradient(90deg,#1EB6FF,#5b8cff);-webkit-background-clip:text;background-clip:text;color:transparent}
@media (max-width:620px){.tr-hero{grid-template-columns:1fr;padding:22px 18px 8px}.tr-hero h1{font-size:32px}.tr-hero p{font-size:13px!important;margin:10px 0 14px!important}.tr-hero .tr-scene{height:210px!important;margin-top:6px;transform:scale(.86);margin-bottom:-14px}}

.tr-scene{position:relative;height:260px;perspective:1000px;perspective-origin:50% 40%}
.tr-stage{position:absolute;inset:0;transform-style:preserve-3d;animation:trFloat 7s ease-in-out infinite}
.tr-c3{position:absolute;left:50%;top:50%;width:118px;aspect-ratio:4/5;margin:-74px 0 0 -59px;border-radius:14px;overflow:hidden;background:linear-gradient(160deg,#16244a,#070b16);border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 50px -18px rgba(0,0,0,.8),0 0 0 1px rgba(30,182,255,.08);transform-style:preserve-3d}
.tr-c3 img{width:100%;height:100%;object-fit:cover;display:block}
.tr-c3::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,0) 38%,rgba(255,255,255,0) 62%,rgba(30,182,255,.18) 100%);mix-blend-mode:screen}
.tr-c3.c1{transform:rotateY(-28deg) rotateX(10deg) translate3d(-92px,8px,-60px) rotateZ(-6deg);opacity:.85}
.tr-c3.c2{transform:rotateY(-18deg) rotateX(8deg) translate3d(0,-6px,40px);z-index:2}
.tr-c3.c3{transform:rotateY(-8deg) rotateX(6deg) translate3d(92px,14px,-30px) rotateZ(6deg);opacity:.9}
.tr-c3.c1 .tr-ph{justify-content:flex-start;padding-left:16px}.tr-c3.c3 .tr-ph{justify-content:flex-end;padding-right:16px}
.tr-c3 .tr-ph{height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;letter-spacing:-.04em;color:#fff;background:radial-gradient(circle at 30% 20%,#1a7bff,#06122b 70%)}
.tr-ring{position:absolute;left:50%;top:56%;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:50%;border:1px solid rgba(30,182,255,.35);box-shadow:0 0 30px rgba(30,182,255,.25),inset 0 0 30px rgba(0,102,255,.2);transform:rotateX(76deg);animation:trSpin 14s linear infinite}
.tr-ring::before{content:"";position:absolute;top:-5px;left:50%;width:10px;height:10px;border-radius:50%;background:#1EB6FF;box-shadow:0 0 16px 4px rgba(30,182,255,.8)}
.tr-ring.r2{width:220px;height:220px;margin:-110px 0 0 -110px;border-color:rgba(255,255,255,.12);animation-duration:20s;animation-direction:reverse}
.tr-glow{position:absolute;left:50%;bottom:6px;width:260px;height:40px;margin-left:-130px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,102,255,.55),transparent);filter:blur(8px);animation:trPulse 7s ease-in-out infinite}
.tr-sphere{position:absolute;width:46px;height:46px;border-radius:50%;right:12%;top:10%;background:radial-gradient(circle at 32% 28%,#fff 0%,#9fd8ff 12%,#1a7bff 45%,#04122e 100%);box-shadow:0 0 30px rgba(30,182,255,.6),inset -6px -8px 14px rgba(0,0,0,.5);animation:trBob 5s ease-in-out infinite}
.tr-sphere.s2{width:22px;height:22px;left:10%;right:auto;top:auto;bottom:22%;animation-duration:6.5s;animation-delay:-2s;opacity:.85}
@keyframes trFloat{0%,100%{transform:translateY(0) rotateY(0)}50%{transform:translateY(-10px) rotateY(8deg)}}
@keyframes trSpin{from{transform:rotateX(76deg) rotateZ(0)}to{transform:rotateX(76deg) rotateZ(360deg)}}
@keyframes trPulse{0%,100%{opacity:.7;transform:scaleX(1)}50%{opacity:.4;transform:scaleX(.85)}}
@keyframes trBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}

.tr-glass-bar{background:rgba(7,10,18,.6)!important;backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);border-color:rgba(255,255,255,.06)!important}
.tr-dock{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(12px + env(safe-area-inset-bottom));width:min(520px,calc(100% - 24px));display:flex;justify-content:space-around;padding:6px;border-radius:22px;z-index:100;background:rgba(10,14,24,.88);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);box-shadow:0 16px 40px -12px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.06)}
.tr-dock button{flex:1;border-radius:16px!important;transition:background .25s,color .25s}
.tr-dock button.on{background:rgba(0,102,255,.16)!important;color:#5fb8ff!important}

@media (prefers-reduced-motion:reduce){.tr-orb,.tr-stage,.tr-ring,.tr-glow,.tr-sphere{animation:none!important}}
input[type=date],input[type=time]{color-scheme:dark}
html,body{overflow-x:hidden}
@media (max-width:480px){.tr-hide-sm{display:none!important}}
::selection{background:#0066FF55}
`;

// Escena 3D: tus últimas piezas flotando en perspectiva, con anillos de luz.
export const Escena3D = ({ imagenes = [], alto = 260, etiquetas = ["IG", "TR", "MP"] }) => {
  const imgs = imagenes.filter(Boolean).slice(0, 3);
  return (
    <div className="tr-scene" style={{ height: alto }} aria-hidden="true">
      <div className="tr-glow" />
      <div className="tr-sphere" /><div className="tr-sphere s2" />
      <div className="tr-stage">
        <div className="tr-ring" /><div className="tr-ring r2" />
        {["c1", "c2", "c3"].map((c, i) => (
          <div key={c} className={`tr-c3 ${c}`}>{imgs[i] ? <img src={imgs[i]} alt="" /> : <div className="tr-ph">{etiquetas[i]}</div>}</div>
        ))}
      </div>
    </div>
  );
};

// ─── MARCA 3D: tu logo en una moneda que gira + "TECNO RIV" con relieve y brillo ───
// El logo sale de /marca/logo (se sube desde /contenido). Si no hay, muestra "TR".
const CSS_MARCA = `
.tr-marca{position:relative;height:280px;perspective:1100px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px}
.tr-marca .tr-glow{bottom:18px}
.tr-coin-wrap{position:relative;width:132px;height:132px;transform-style:preserve-3d;animation:trBob 6s ease-in-out infinite}
.tr-coin{position:absolute;inset:0;transform-style:preserve-3d;animation:trCoin 9s cubic-bezier(.45,.05,.55,.95) infinite}
.tr-coin .cara,.tr-coin .canto{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.tr-coin .cara{display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at 30% 25%,#2a8bff 0%,#0050d8 45%,#021435 100%);border:2px solid rgba(160,215,255,.55);box-shadow:inset 0 0 22px rgba(255,255,255,.25),inset 0 -10px 24px rgba(0,0,0,.45),0 0 40px rgba(30,182,255,.35)}
.tr-coin .cara img{width:78%;height:78%;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,.45))}
.tr-coin .cara b{font-size:52px;font-weight:900;letter-spacing:-.06em;color:#fff;text-shadow:0 3px 0 #0a3a8a,0 6px 14px rgba(0,0,0,.5)}
.tr-coin .cara::after{content:"";position:absolute;inset:0;border-radius:50%;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.55) 45%,transparent 60%);transform:translateX(-120%);animation:trSheen 4.5s ease-in-out infinite}
.tr-coin .frente{transform:translateZ(7px)}
.tr-coin .dorso{transform:rotateY(180deg) translateZ(7px)}
.tr-coin .canto{background:linear-gradient(90deg,#062a6b,#1a7bff 50%,#062a6b);border-radius:50%;backface-visibility:visible}
.tr-nombre{position:relative;margin:0;font-weight:800;font-size:46px;line-height:1;letter-spacing:-.04em;white-space:nowrap;transform-style:preserve-3d;animation:trTilt 7s ease-in-out infinite}
.tr-nombre .capa{position:absolute;left:0;top:0;color:#0a2a66;pointer-events:none}
.tr-nombre .top{position:relative;background:linear-gradient(100deg,#ffffff 0%,#dbeeff 35%,#ffffff 45%,#ffffff 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:trBrillo 5s linear infinite}
.tr-nombre .top i{font-style:normal;background:linear-gradient(100deg,#1EB6FF 0%,#7fd6ff 40%,#1EB6FF 55%,#3f8cff 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:trBrillo 5s linear infinite}
.tr-sub{color:#8b93a7;font-size:11px;font-weight:700;letter-spacing:.32em;text-transform:uppercase;margin-top:-10px}
@keyframes trCoin{0%{transform:rotateY(-25deg) rotateX(8deg)}45%{transform:rotateY(335deg) rotateX(8deg)}100%{transform:rotateY(335deg) rotateX(8deg)}}
@keyframes trSheen{0%,55%{transform:translateX(-120%)}80%,100%{transform:translateX(120%)}}
@keyframes trTilt{0%,100%{transform:rotateX(14deg) rotateY(-14deg)}50%{transform:rotateX(8deg) rotateY(14deg)}}
@keyframes trBrillo{from{background-position:120% 0}to{background-position:-130% 0}}
@media (max-width:620px){.tr-marca{height:240px}.tr-nombre{font-size:38px}.tr-coin-wrap{width:112px;height:112px}}
@media (prefers-reduced-motion:reduce){.tr-coin,.tr-coin-wrap,.tr-nombre,.tr-nombre .top,.tr-nombre .top i,.tr-coin .cara::after{animation:none!important}}
`;

export const Marca3D = ({ version = "", alto }) => {
  const [hayLogo, setHayLogo] = useState(true);
  useEffect(() => setHayLogo(true), [version]);
  const cara = hayLogo ? <img src={`/marca/logo?v=${version}`} alt="" onError={() => setHayLogo(false)} /> : <b>TR</b>;
  // Canto de la moneda: discos apilados que le dan espesor real al girar.
  const canto = [...Array(12)].map((_, i) => <div key={i} className="canto" style={{ transform: `translateZ(${6 - i}px)` }} />);
  const nombre = <>TECNO <i>RIV</i></>;
  return (
    <div className="tr-marca" style={alto ? { height: alto } : undefined} aria-label="Tecno Riv">
      <style>{CSS_MARCA}</style>
      <div className="tr-glow" />
      <div className="tr-ring" style={{ top: "40%" }} />
      <div className="tr-coin-wrap">
        <div className="tr-coin">
          {canto}
          <div className="cara frente">{cara}</div>
          <div className="cara dorso">{cara}</div>
        </div>
      </div>
      <h2 className="tr-nombre">
        {[6, 5, 4, 3, 2, 1].map(z => <span key={z} className="capa" aria-hidden="true" style={{ transform: `translate(${z * 0.6}px, ${z}px)`, opacity: 0.35 + z * 0.08, color: z > 3 ? "#041634" : "#0a3a8a" }}>{nombre}</span>)}
        <span className="top">{nombre}</span>
      </h2>
      <div className="tr-sub">Río Cuarto · Tecnología</div>
    </div>
  );
};
