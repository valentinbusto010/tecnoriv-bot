// Logo 3D real (WebGL con three.js): cartel "TECNO riv" de vidrio oscuro con marco de luz azul.
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
  const espacio = g.measureText(" ").width * 0.7; // "TECNO riv"
  const a = g.measureText("TECNO").width, b = g.measureText("riv").width;
  let x = (c.width - a - espacio - b) / 2;
  const y = c.height / 2 + 4;
  for (const [txt, color, sombra] of [["TECNO", "#ffffff", "rgba(140,200,255,.9)"], ["riv", "#1EB6FF", "rgba(30,182,255,1)"]]) {
    g.shadowColor = sombra; g.shadowBlur = 22; g.fillStyle = color;
    g.fillText(txt, x, y); g.shadowBlur = 6; g.fillText(txt, x, y);
    x += g.measureText(txt).width + (txt === "TECNO" ? espacio : 0);
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
  camara.position.set(0, 0.28, 4.9);
  camara.lookAt(0, 0.04, 0);

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
  // Texto en las dos caras, centrado
  const tex = await texturaTexto(THREE);
  const matTexto = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  const planoTexto = new THREE.PlaneGeometry(3.12, 0.78);
  const frente = new THREE.Mesh(planoTexto, matTexto); frente.position.set(0, 0, PROF / 2 + 0.025); marca.add(frente);
  const dorso = new THREE.Mesh(planoTexto, matTexto); dorso.position.set(0, 0, -PROF / 2 - 0.025); dorso.rotation.y = Math.PI; marca.add(dorso);
  marca.rotation.x = 0.12;
  escena.add(marca);

  contenedor.appendChild(canvas);
  canvas.style.cssText = "width:100%;height:100%;display:block;filter:drop-shadow(0 0 16px rgba(30,140,255,.45))";

  const medir = () => {
    const w = contenedor.clientWidth || 300, h = contenedor.clientHeight || 200;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // en pantallas angostas alejamos la cámara para que entre entero
    camara.position.z = w / h < 1.6 ? 4.9 * (1.6 / (w / h)) ** 0.9 : 4.9;
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
