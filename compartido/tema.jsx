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

// ─── MARCA 3D: el cartel "TECNOriv" como objeto 3D que gira, con auriculares de vincha colgando ───
// Vector puro (se ve nítido en cualquier pantalla). Fuente Michroma, cargada en el .html de cada app.
const GROSOR = 22; // px de espesor del cartel
const CAPAS_AURI = 12; // capas del auricular: le dan volumen al girar
const Z_AURI = GROSOR / 2 + 14; // el auricular cuelga por delante de la cara del cartel
const CSS_MARCA = `
.tr-marca{position:relative;height:320px;perspective:1200px;display:flex;align-items:center;justify-content:center}
.tr-marca .tr-glow{bottom:46px;width:300px;margin-left:-150px;height:40px}
.tr-cartel-wrap{position:relative;width:330px;height:96px;margin-right:56px;transform-style:preserve-3d;animation:trBob 6s ease-in-out infinite}
.tr-cartel{position:absolute;inset:0;transform-style:preserve-3d;animation:trGiro 8s linear infinite;will-change:transform}
.tr-cartel .cara{position:absolute;inset:0;border-radius:14px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;
  background:linear-gradient(180deg,#141c2c 0%,#070b14 55%,#04070d 100%);
  border:2px solid rgba(150,205,255,.75);
  box-shadow:0 0 18px rgba(30,150,255,.75),0 0 46px rgba(30,120,255,.45),inset 0 0 14px rgba(80,170,255,.35),inset 0 1px 0 rgba(255,255,255,.35)}
.tr-cartel .frente{padding-right:50px}
.tr-cartel .cara span{font-family:'Michroma','Space Grotesk',sans-serif;font-size:34px;line-height:1;letter-spacing:0;color:#fff;white-space:nowrap;
  text-shadow:0 0 6px rgba(255,255,255,.55),0 0 18px rgba(120,190,255,.55)}
.tr-cartel .cara span i{font-style:normal;color:#1EB6FF;text-shadow:0 0 6px rgba(30,182,255,.7),0 0 18px rgba(30,182,255,.6)}
.tr-cartel .cara::after{content:"";position:absolute;inset:-2px;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.38) 48%,transparent 60%);transform:translateX(-130%);animation:trSheen 4s ease-in-out infinite}
.tr-cartel .frente{transform:translateZ(${GROSOR / 2}px)}
.tr-cartel .dorso{transform:rotateY(180deg) translateZ(${GROSOR / 2}px)}
.tr-cartel .canto{position:absolute;inset:0;border-radius:14px;background:#0a1730;border:2px solid rgba(70,140,255,.55)}
/* Auricular: la vincha enganchada en la esquina de arriba a la derecha, colgando por delante y balanceándose.
   Las capas se ocultan cuando quedan de espaldas: del otro lado del cartel no asoma "medio auricular". */
.tr-auri{position:absolute;width:100px;height:107px;right:-44px;top:-11px;transform-style:preserve-3d;transform-origin:50% 6.5%;animation:trColgar 3.4s ease-in-out infinite}
.tr-auri svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;backface-visibility:hidden;-webkit-backface-visibility:hidden}
@keyframes trColgar{0%,100%{transform:translateZ(${Z_AURI}px) rotateZ(-9deg)}50%{transform:translateZ(${Z_AURI}px) rotateZ(-2deg)}}
@keyframes trGiro{from{transform:rotateX(10deg) rotateY(0deg)}to{transform:rotateX(10deg) rotateY(360deg)}}
@keyframes trSheen{0%,55%{transform:translateX(-130%)}80%,100%{transform:translateX(130%)}}
@media (max-width:620px){.tr-marca{height:240px}.tr-cartel-wrap{width:250px;height:72px;margin-right:44px}.tr-cartel .frente{padding-right:38px}.tr-cartel .cara span{font-size:26px}
  .tr-auri{width:70px;height:75px;right:-30px;top:-8px}.tr-marca .tr-glow{bottom:36px;width:240px;margin-left:-120px}}
@media (prefers-reduced-motion:reduce){.tr-cartel{animation:trGiro 15s linear infinite!important}.tr-cartel-wrap,.tr-cartel .cara::after{animation:none!important}.tr-auri{animation:none!important;transform:translateZ(${Z_AURI}px) rotateZ(-6deg)}}
`;

// Auricular de vincha (vista 3/4): vincha metálica con almohadilla de cuero, deslizadores, horquillas
// y copas ovaladas con almohadillas. "frente" = la capa de adelante con todo el detalle; las demás son el volumen.
const Auricular = ({ frente, z }) => {
  const id = (n) => `trA${n}`;
  const metal = frente ? `url(#${id("metal")})` : "#2b3442";
  const casco = frente ? `url(#${id("casco")})` : "#0b0f16";
  return (
    <svg viewBox="0 0 140 150" style={{ transform: `translateZ(${z}px)` }} aria-hidden="true">
      {frente && (
        <defs>
          <linearGradient id={id("metal")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#d9e0e8" /><stop offset=".7" stopColor="#9aa6b6" /><stop offset="1" stopColor="#6f7b8c" /></linearGradient>
          <linearGradient id={id("cuero")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a404b" /><stop offset="1" stopColor="#14171d" /></linearGradient>
          <radialGradient id={id("casco")} cx=".34" cy=".28" r=".85"><stop offset="0" stopColor="#6b7689" /><stop offset=".35" stopColor="#2c3442" /><stop offset=".8" stopColor="#10141c" /><stop offset="1" stopColor="#06080c" /></radialGradient>
          <radialGradient id={id("almo")} cx=".5" cy=".5" r=".6"><stop offset="0" stopColor="#0c0e12" /><stop offset=".75" stopColor="#23272f" /><stop offset="1" stopColor="#3a3f49" /></radialGradient>
        </defs>
      )}
      {/* almohadillas (detrás de las copas, asoman hacia adentro) */}
      <ellipse cx="38" cy="116" rx="8" ry="24" fill={frente ? `url(#${id("almo")})` : "#0d1015"} />
      <ellipse cx="102" cy="116" rx="8" ry="24" fill={frente ? `url(#${id("almo")})` : "#0d1015"} />
      {/* vincha metálica */}
      <path d="M26 92 C 20 42, 44 10, 70 10 C 96 10, 120 42, 114 92" fill="none" stroke={metal} strokeWidth="6.5" strokeLinecap="round" />
      {/* almohadilla de cuero de la vincha, con costura */}
      <path d="M38 50 C 44 28, 57 20, 70 20 C 83 20, 96 28, 102 50" fill="none" stroke={frente ? `url(#${id("cuero")})` : "#161a21"} strokeWidth="10" strokeLinecap="round" />
      {frente && <path d="M40 48 C 46 29, 58 23, 70 23 C 82 23, 94 29, 100 48" fill="none" stroke="#5a6170" strokeWidth=".9" strokeDasharray="2 2.5" opacity=".9" />}
      {/* deslizadores */}
      <rect x="20.5" y="80" width="11" height="20" rx="3.5" fill={metal} />
      <rect x="108.5" y="80" width="11" height="20" rx="3.5" fill={metal} />
      {/* horquillas */}
      <path d="M12 104 Q 26 94 40 104" fill="none" stroke={frente ? "#3d4656" : "#1c222c"} strokeWidth="4" strokeLinecap="round" />
      <path d="M100 104 Q 114 94 128 104" fill="none" stroke={frente ? "#3d4656" : "#1c222c"} strokeWidth="4" strokeLinecap="round" />
      {/* copas */}
      <ellipse cx="26" cy="118" rx="19" ry="26" fill={casco} stroke={frente ? "#05070a" : "#070a10"} strokeWidth="1.5" />
      <ellipse cx="114" cy="118" rx="19" ry="26" fill={casco} stroke={frente ? "#05070a" : "#070a10"} strokeWidth="1.5" />
      {frente && <>
        {/* aro celeste de la marca + brillo */}
        <ellipse cx="26" cy="118" rx="12.5" ry="18" fill="none" stroke="#1EB6FF" strokeWidth="1.8" opacity=".9" />
        <ellipse cx="114" cy="118" rx="12.5" ry="18" fill="none" stroke="#1EB6FF" strokeWidth="1.8" opacity=".9" />
        <ellipse cx="20" cy="106" rx="5" ry="8" fill="#fff" opacity=".22" />
        <ellipse cx="108" cy="106" rx="5" ry="8" fill="#fff" opacity=".22" />
        <circle cx="26" cy="118" r="2.2" fill="#1EB6FF" />
        <circle cx="114" cy="118" r="2.2" fill="#1EB6FF" />
        {/* brillo en la vincha */}
        <path d="M34 40 C 42 22, 56 14, 70 13" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".55" strokeLinecap="round" />
      </>}
    </svg>
  );
};

export const Marca3D = ({ alto }) => {
  // Espesor: capas apiladas entre el frente y el dorso; se ven cuando el cartel gira de costado.
  const canto = [...Array(GROSOR - 1)].map((_, i) => <div key={i} className="canto" style={{ transform: `translateZ(${GROSOR / 2 - 1 - i}px)` }} />);
  const texto = <span>TECNO<i>riv</i></span>;
  return (
    <div className="tr-marca" style={alto ? { height: alto } : undefined} aria-label="TECNOriv">
      <style>{CSS_MARCA}</style>
      <div className="tr-glow" />
      <div className="tr-cartel-wrap">
        <div className="tr-cartel">
          {canto}
          <div className="cara frente">{texto}</div>
          <div className="cara dorso">{texto}</div>
          <div className="tr-auri">
            {[...Array(CAPAS_AURI)].map((_, i) => <Auricular key={i} z={-CAPAS_AURI + i} frente={false} />)}
            <Auricular z={0} frente />
          </div>
        </div>
      </div>
    </div>
  );
};
