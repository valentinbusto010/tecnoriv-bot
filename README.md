# Tecno Riv Bot

Sistema para vender más con menos trabajo manual:

| Qué hace | Dónde |
|---|---|
| **Crea la publicación de Marketplace**: imagen llamativa con tu marca y precio + título + descripción | Panel → pestaña 1 |
| **Responde consultas de Marketplace**: pegás el mensaje del cliente y te da la respuesta lista para copiar | Panel → pestaña 2 |
| **Atiende WhatsApp solo, 24/7**: responde, recuerda la charla, cierra la venta y te avisa | Automático |
| **Sistema de gestión**: clientes, pedidos, stock y finanzas. Las ventas del bot entran solas | `/gestion` |

> **Importante sobre Marketplace:** Facebook no permite que un programa publique ni chatee solo en Marketplace. Si se usa un bot para eso, te bloquean la cuenta. Por eso el sistema te deja **todo listo** (imagen, título, descripción y respuestas) y vos solo copiás y pegás: 1 minuto por producto. En **WhatsApp** sí está permitido, y ahí el bot trabaja 100% solo.

---

## Cómo se usa (todos los días)

### Publicar un producto
1. Entrá a `https://TU-SERVIDOR/panel` desde el celu.
2. Subí la foto (mejor con fondo claro), poné nombre y precio. Opcional: precio anterior, cuotas sin interés y detalles.
3. Tocá **Generar publicación**.
4. Descargá la imagen, copiá título y descripción, y pegalos en Marketplace.

### Responder una consulta de Marketplace
1. Pestaña **2. Responder consulta**.
2. Pegá lo que escribió el cliente → **Sugerir respuesta** (ya queda copiada).
3. Pegala en Marketplace. Cuando el cliente conteste, pegá su respuesta y repetí.
4. Truco: llevá al cliente a WhatsApp, donde el bot sigue solo.

### WhatsApp
No hacés nada. Cuando un cliente confirma la compra, te llega un WhatsApp con "🛒 NUEVA VENTA" y los datos, y el pedido aparece en `/gestion` como **pendiente**, con el stock ya descontado.

### Sistema de gestión (`/gestion`)
Entrá a `https://TU-SERVIDOR/gestion` (misma contraseña que el panel). Funciona en PC y celu y se actualiza solo cada 20 segundos.
- **Inicio:** ventas y ganancia del mes, pendientes, ventas del bot, alertas de stock.
- **Pedidos:** los del bot (🤖) y los que cargás a mano (Instagram, Marketplace, presencial). Cambiás el estado desde la lista: pendiente → en camino → entregado. Si cancelás, el stock vuelve solo.
- **Clientes:** todos los que le escribieron al bot, quién compró, cuánto gastó, quién recompró. Botón directo a su WhatsApp.
- **Stock:** es la misma tabla que usa el bot. Lo que cambies acá (precio, stock, ocultar un producto) el bot lo usa al toque.
- **Finanzas:** ganancia real del mes (ventas − costo de lo vendido − gastos operativos), margen y qué producto te dejó más plata.

**Margen real:** en Stock → **Costos y precios** cargás lo que te sale cada producto. Cada venta guarda su costo, así que si después tu proveedor aumenta, las ventas viejas mantienen su ganancia. El sistema marca en "Revisar precios" los productos sin costo, con margen por debajo de tu objetivo o con el costo sin actualizar hace más de 30 días, y te sugiere el precio. Los gastos de categoría "Stock" (compras de mercadería) no se restan de la ganancia porque ya están en el costo de cada venta.

**Instalarla como app:** abrí `/gestion` y tocá **Instalar app** arriba a la derecha (Chrome en PC y Android). En iPhone: Safari → Compartir → Agregar a inicio.

**Desde tu WhatsApp** (el número de `OWNER_PHONE`), mandale al bot:
- `gasto 15000 marketing Meta Ads` → carga un gasto (categorías: stock, marketing, envíos, operativo, impuestos, otro)
- `resumen` → ventas, gastos y resultado del mes
- `ayuda` → lista de comandos

### Cambiar precios o stock
Supabase → **Table Editor** → `productos`. El bot usa siempre lo que esté ahí. Sin stock → poné `stock` en 0. Cuotas sin interés → poné la cantidad en `cuotas_sin_interes` (0 = no tiene). Producto que ya no vendés → `activo` en false.

### Cambiar medios de pago, envíos, garantía o tu WhatsApp
Editá el archivo `src/negocio.js`.

---

## Instalación (una sola vez)

1. **Supabase:** abrí tu proyecto → **SQL Editor** → pegá el contenido de `supabase.sql` → **Run**. Después corré también `supabase-gestion.sql` y `supabase-margen.sql` (agrega clientes, gastos y el stock automático; se puede correr más de una vez). Cargá tus productos reales en la tabla `productos` o desde `/gestion`.
2. **Variables:** en tu hosting (Render, Railway, etc.) cargá las variables de `.env.example`:
   - `CLAUDE_API_KEY`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `SUPABASE_URL`, `SUPABASE_KEY` (las mismas que ya usabas)
   - **Nuevas:** `OWNER_PHONE` (tu número para los avisos de venta, ej `5493584123456`) y `PANEL_PASSWORD` (inventá una contraseña).
3. **Deploy:** el hosting toma los cambios de GitHub y corre `npm start` solo.
4. Probá entrando a `https://TU-SERVIDOR/panel`.

Para probar en tu compu: `npm install`, copiá `.env.example` como `.env`, completalo y corré `npm start`. Abrí http://localhost:3000/panel

---

## Archivos

- `server.js` → el servidor (WhatsApp + panel)
- `src/vendedor.js` → cómo habla y vende el bot (las instrucciones de venta)
- `src/publicacion.js` → arma la imagen y los textos de Marketplace (colores arriba de todo)
- `src/negocio.js` → datos de tu negocio
- `public/panel.html` → el panel de Marketplace
- `src/gestion.js` → ventas, clientes, gastos y la API del sistema de gestión
- `gestion/App.jsx` → el sistema de gestión (si lo cambiás: `npm i --no-save esbuild react@18 react-dom@18 && node gestion/build.mjs`)
- `supabase.sql` + `supabase-gestion.sql` + `supabase-margen.sql` → tablas de la base de datos
- `gestion/iconos.js` → genera los íconos de la app
