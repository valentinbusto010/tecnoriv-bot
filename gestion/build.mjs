// Arma public/gestion.js a partir de gestion/*.jsx. Solo hace falta si cambiás el panel:
//   npm i --no-save esbuild react@18 react-dom@18 && node gestion/build.mjs
import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [path.join(aqui, "main.jsx")],
  outfile: path.join(aqui, "..", "public", "gestion.js"),
  bundle: true,
  minify: true,
  jsx: "automatic",
  target: ["es2019"],
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: process.env.NODE_PATH ? process.env.NODE_PATH.split(":") : [],
  logLevel: "info",
});
