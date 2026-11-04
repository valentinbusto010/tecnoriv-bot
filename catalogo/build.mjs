// Arma public/catalogo.js a partir de catalogo/*.jsx. Solo hace falta si cambiás el catálogo:
//   npm i --no-save esbuild react@18 react-dom@18 && node catalogo/build.mjs
import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [path.join(aqui, "main.jsx")],
  outfile: path.join(aqui, "..", "public", "catalogo.js"),
  bundle: true,
  minify: true,
  jsx: "automatic",
  target: ["es2019"],
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: process.env.NODE_PATH ? process.env.NODE_PATH.split(":") : [],
  logLevel: "info",
});
