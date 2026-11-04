// Logo 3D real (WebGL con three.js): cartel "TECNOriv" de vidrio oscuro con marco de luz azul
// y un auricular de vincha modelado pieza por pieza, enganchado sobre el borde de arriba:
// una copa apoyada en cada cara, así se ve completo desde adelante y desde atrás.
// three.js se baja de un CDN solo cuando se muestra el logo (queda en caché del navegador un año).
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

// Medidas del cartel (unidades de la escena)
const ANCHO = 3.3, ALTO = 0.96, PROF = 0.2, RADIO = 0.15;

function rectRedondeado(THREE, w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

// Texto del cartel dibujado en un canvas (con la fuente Michroma de la marca y brillo).
async function texturaTexto(THREE) {
  try { await document.fonts.load("80px Michroma"); } catch {}
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const g = c.getContext("2d");
  g.font = "80px Michroma, 'Space Grotesk', sans-serif";
  g.textBaseline = "middle";
  const a = g.measureText("TECNO").width, b = g.measureText("riv").width;
  let x = (c.width - a - b) / 2;
  const y = c.height / 2 + 4;
  for (const [txt, color, sombra] of [["TECNO", "#ffffff", "rgba(140,200,255,.9)"], ["riv", "#1EB6FF", "rgba(30,182,255,1)"]]) {
    g.shadowColor = sombra; g.shadowBlur = 22; g.fillStyle = color;
    g.fillText(txt, x, y); g.shadowBlur = 6; g.fillText(txt, x, y);
    x += g.measureText(txt).width;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Ambiente para los reflejos (metal y plástico brillante): un "estudio" con paneles de luz.
function ambiente(THREE, renderer) {
  const sala = new THREE.Scene();
  sala.background = new THREE.Color("#05070d");
  const panel = (color, int, w, h, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(int), side: THREE.DoubleSide }));
    m.position.set(...pos); if (rot) m.rotation.set(...rot); sala.add(m);
  };
  panel("#ffffff", 3, 6, 2, [0, 5, 2], [Math.PI / 2, 0, 0]);
  panel("#cfe6ff", 2, 3, 4, [-5, 1, 2], [0, Math.PI / 2, 0]);
  panel("#1e78ff", 1.2, 3, 4, [5, 0, -1], [0, -Math.PI / 2, 0]);
  panel("#ffffff", 1.2, 6, 3, [0, 0, 6], [0, Math.PI, 0]);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(sala, 0.04).texture;
  pm.dispose();
  return env;
}

function auricular(THREE) {
  const grupo = new THREE.Group();
  const metal = new THREE.MeshPhysicalMaterial({ color: "#d6dde6", metalness: 1, roughness: 0.22 });
  const metalOscuro = new THREE.MeshPhysicalMaterial({ color: "#5b6573", metalness: 1, roughness: 0.35 });
  const cuero = new THREE.MeshPhysicalMaterial({ color: "#16181d", roughness: 0.62, metalness: 0, sheen: 1, sheenColor: new THREE.Color("#3a3f4a"), sheenRoughness: 0.5 });
  const casco = new THREE.MeshPhysicalMaterial({ color: "#14171d", metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
  const acento = new THREE.MeshStandardMaterial({ color: "#1EB6FF", emissive: "#1EB6FF", emissiveIntensity: 1.6, roughness: 0.3 });

  const top = ALTO / 2;
  const zCopa = PROF / 2 + 0.2;            // centro de cada copa (afuera de cada cara)
  const yCopa = top - 0.34;
  const zVincha = zCopa;                    // las patas de la vincha bajan sobre las copas

  // Vincha: arco que pasa por encima del borde del cartel (plano y-z)
  const pts = [];
  pts.push(new THREE.Vector3(0, yCopa + 0.2, zVincha));
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI;
    pts.push(new THREE.Vector3(0, top + 0.06 + 0.3 * Math.sin(t), zVincha * Math.cos(t)));
  }
  pts.push(new THREE.Vector3(0, yCopa + 0.2, -zVincha));
  const curva = new THREE.CatmullRomCurve3(pts);
  const vincha = new THREE.Mesh(new THREE.TubeGeometry(curva, 96, 0.03, 16, false), metal);
  vincha.scale.set(1.6, 1, 1); // banda más ancha que gruesa, como una vincha real
  grupo.add(vincha);

  // Almohadilla de cuero en la parte de arriba (por dentro del arco)
  const ptsAlmo = [];
  for (let i = 0; i <= 20; i++) {
    const t = 0.18 * Math.PI + (i / 20) * 0.64 * Math.PI;
    ptsAlmo.push(new THREE.Vector3(0, top + 0.02 + 0.27 * Math.sin(t), (zVincha - 0.03) * Math.cos(t)));
  }
  const almo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsAlmo), 64, 0.05, 16, false), cuero);
  almo.scale.set(1.5, 1, 1);
  grupo.add(almo);

  for (const lado of [1, -1]) {
    const z = lado * zCopa;
    // Deslizador metálico
    const desl = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.045), metalOscuro);
    desl.position.set(0, yCopa + 0.2, z);
    grupo.add(desl);
    // Horquilla que abraza la copa (arco en el plano x-y)
    const horq = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.016, 12, 48, Math.PI), metal);
    horq.position.set(0, yCopa, z);
    grupo.add(horq);
    // Copa: cuerpo ovalado + tapa abombada
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.215, 0.12, 48), casco);
    cuerpo.rotation.x = Math.PI / 2;
    cuerpo.scale.set(1, 1, 1.18);
    cuerpo.position.set(0, yCopa, z + lado * 0.02);
    grupo.add(cuerpo);
    const tapa = new THREE.Mesh(new THREE.SphereGeometry(0.205, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), casco);
    tapa.rotation.x = lado * Math.PI / 2;
    tapa.scale.set(1, 0.32, 1.18);
    tapa.position.set(0, yCopa, z + lado * 0.08);
    grupo.add(tapa);
    // Aro celeste de la marca en la tapa
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.009, 10, 64), acento);
    aro.scale.set(1, 1.18, 1);
    aro.position.set(0, yCopa, z + lado * 0.135);
    grupo.add(aro);
    // Almohadilla de oreja (cuero, contra la cara del cartel)
    const almOreja = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.052, 20, 48), cuero);
    almOreja.scale.set(1, 1.18, 0.8);
    almOreja.position.set(0, yCopa, z - lado * 0.07);
    grupo.add(almOreja);
  }
  return grupo;
}

export async function montarMarcaGL(contenedor, { lento = false } = {}) {
  // import dinámico "a mano" para que el empaquetador no intente incluir three.js en el bundle
  const THREE = await new Function("u", "return import(u)")(THREE_URL);
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const escena = new THREE.Scene();
  escena.environment = ambiente(THREE, renderer);
  const camara = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camara.position.set(-0.25, 0.3, 6.4);
  camara.lookAt(0.2, 0.1, 0);

  escena.add(new THREE.HemisphereLight("#bcd8ff", "#05070d", 0.6));
  const clave = new THREE.DirectionalLight("#ffffff", 1.6); clave.position.set(3, 4, 5); escena.add(clave);
  const borde = new THREE.PointLight("#1e78ff", 6, 10); borde.position.set(-3, 1, -2); escena.add(borde);

  // Cartel
  const marca = new THREE.Group();
  const forma = rectRedondeado(THREE, ANCHO, ALTO, RADIO);
  const cuerpo = new THREE.Mesh(
    new THREE.ExtrudeGeometry(forma, { depth: PROF, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 16 }),
    new THREE.MeshPhysicalMaterial({ color: "#070b14", metalness: 0.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 0.35 })
  );
  cuerpo.position.z = -PROF / 2;
  marca.add(cuerpo);
  // Marco de luz azul (en las dos caras y el canto)
  const marco = rectRedondeado(THREE, ANCHO + 0.06, ALTO + 0.06, RADIO + 0.03);
  marco.holes.push(rectRedondeado(THREE, ANCHO - 0.05, ALTO - 0.05, RADIO - 0.02));
  const luz = new THREE.Mesh(
    new THREE.ExtrudeGeometry(marco, { depth: PROF + 0.07, bevelEnabled: false, curveSegments: 16 }),
    new THREE.MeshStandardMaterial({ color: "#0b3a8c", emissive: "#1f7bff", emissiveIntensity: 1.15, roughness: 0.35, metalness: 0.2 })
  );
  luz.position.z = -(PROF + 0.07) / 2;
  marca.add(luz);
  // Texto en las dos caras, corrido a la izquierda para dejar lugar a la copa del auricular
  const tex = await texturaTexto(THREE);
  const matTexto = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  const planoTexto = new THREE.PlaneGeometry(3.0, 0.75);
  const frente = new THREE.Mesh(planoTexto, matTexto); frente.position.set(-0.12, 0, PROF / 2 + 0.025); marca.add(frente);
  const dorso = new THREE.Mesh(planoTexto, matTexto); dorso.position.set(0.12, 0, -PROF / 2 - 0.025); dorso.rotation.y = Math.PI; marca.add(dorso);
  // Auricular enganchado cerca de la esquina derecha
  const auri = auricular(THREE);
  // Enganchado en la esquina de arriba a la derecha, en diagonal: de frente y de atrás se ve en 3/4,
  // con la vincha y una copa a cada lado de la esquina (nunca queda escondido detrás del cartel).
  auri.scale.setScalar(1.25);
  auri.rotation.y = 0.95;
  auri.position.set(ANCHO / 2 - 0.02, -0.12, 0);
  marca.add(auri);
  marca.rotation.x = 0.12;
  escena.add(marca);

  contenedor.appendChild(canvas);
  canvas.style.cssText = "width:100%;height:100%;display:block;filter:drop-shadow(0 0 16px rgba(30,140,255,.45))";

  const medir = () => {
    const w = contenedor.clientWidth || 300, h = contenedor.clientHeight || 200;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // en pantallas angostas alejamos la cámara para que entre entero
    camara.position.z = w / h < 1.6 ? 6.4 * (1.6 / (w / h)) ** 0.85 : 6.4;
    camara.updateProjectionMatrix();
  };
  medir();
  const ro = new ResizeObserver(medir); ro.observe(contenedor);

  const vuelta = lento ? 15 : 8; // segundos por vuelta (igual que la versión anterior)
  let corriendo = true, raf = 0;
  const t0 = performance.now();
  const cuadro = (ahora) => {
    if (!corriendo) return;
    const t = (ahora - t0) / 1000;
    marca.rotation.y = (t / vuelta) * Math.PI * 2;
    marca.position.y = Math.sin((t / 6) * Math.PI * 2) * 0.06;
    auri.rotation.x = Math.sin((t / 3.4) * Math.PI * 2) * 0.04; // se balancea sobre el borde
    renderer.render(escena, camara);
    raf = requestAnimationFrame(cuadro);
  };
  raf = requestAnimationFrame(cuadro);
  const visib = () => { if (document.hidden) { corriendo = false; cancelAnimationFrame(raf); } else if (!corriendo) { corriendo = true; raf = requestAnimationFrame(cuadro); } };
  document.addEventListener("visibilitychange", visib);

  return () => {
    corriendo = false; cancelAnimationFrame(raf);
    document.removeEventListener("visibilitychange", visib);
    ro.disconnect();
    renderer.dispose();
    escena.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); }); });
    canvas.remove();
  };
}
