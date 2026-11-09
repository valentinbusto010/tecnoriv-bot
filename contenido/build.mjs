// Arma public/contenido.js a partir de contenido/*.jsx. Solo hace falta si cambiás el estudio:
//   npm i --no-save esbuild react@18 react-dom@18 && node contenido/build.mjs
import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [path.join(aqui, "main.jsx")],
  outfile: path.join(aqui, "..", "public", "contenido.js"),
  bundle: true,
  minify: true,
  jsx: "automatic",
  target: ["es2019"],
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: process.env.NODE_PATH ? process.env.NODE_PATH.split(":") : [],
  logLevel: "info",
});

// Videos (Remotion): paquete aparte, se descarga solo al abrir Estudio IA → Videos.
//   npm i --no-save remotion@4.0.542 @remotion/player@4.0.542 @remotion/web-renderer@4.0.542
await build({
  entryPoints: [path.join(aqui, "videos", "main.jsx")],
  outfile: path.join(aqui, "..", "public", "contenido-videos.js"),
  bundle: true,
  minify: true,
  jsx: "automatic",
  format: "iife",
  target: ["es2020"],
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: process.env.NODE_PATH ? process.env.NODE_PATH.split(":") : [],
  logLevel: "info",
});
