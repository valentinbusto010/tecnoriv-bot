# Tecno Riv Bot

Sistema para vender más con menos trabajo manual:

| Qué hace | Dónde |
|---|---|
| **Crea la publicación de Marketplace**: imagen llamativa con tu marca y precio + título + descripción | Panel → pestaña 1 |
| **Responde consultas de Marketplace**: pegás el mensaje del cliente y te da la respuesta lista para copiar | Panel → pestaña 2 |
| **Atiende WhatsApp solo, 24/7**: responde, recuerda la charla, cierra la venta y te avisa | Automático |
| **Sistema de gestión**: clientes, pedidos, stock y finanzas. Las ventas del bot entran solas | `/gestion` |
| **Estudio de contenido**: carruseles, posts, historias y Marketplace con tu marca. Plan semanal, calendario y publicación en Instagram | `/contenido` |

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

**Promo:** en Stock → ⚙️ configurás descuento (%), fecha límite y regalo (ej: hidrogel con cada smartwatch). El bot cotiza el precio promo, registra la venta con descuento y el regalo a $0 (descuenta stock y costo). Al pasar la fecha, la promo se apaga sola.

**Instagram desde el sistema:** Stock → **Publicar** → Instagram → "Generar contenido". Arma 3 historias, un carrusel con tus productos y el caption, con las fotos reales y la promo vigente. Descargás todo desde el celu y subís.

**Marketplace desde el sistema:** en Stock tocá el 📣 de un producto (o el botón **Marketplace**) y se genera la imagen con tu marca, el título y la descripción usando la foto del producto. Quedan guardadas: desde el celu descargás la imagen y copiás los textos para publicar.

### Estudio de contenido (`/contenido`)
App aparte (misma contraseña) para hacer y publicar todo el contenido de Instagram y Marketplace con los colores y el formato de @tecno_riv.
- **Inicio:** cuánto publicaste en la semana (meta: 5), qué toca hoy, días sin contenido y el **Plan de la semana**: 7 ideas armadas con tu stock real. Tocás "Crear esto" y queda todo cargado.
- **Crear:** elegís formato (**Carrusel** 6-9 slides, **Post**, **Historias**, **Marketplace**), plantilla (**Producto destacado, Colección, Comparativa, Tips/Educativo, Promo, Libre**), los productos y, si querés, la idea. Claude escribe los textos y el sistema dibuja las imágenes con las fotos reales, los precios de la base (con promo si hay) y el caption con hashtags. Podés dejarlo programado en el mismo paso.
- **Biblioteca:** todas las piezas con su estado (borrador / programado / publicado). Adentro de cada una: guardar todas las imágenes, copiar el caption, **editar los textos de cada slide y rehacer las imágenes**, programar, publicar o marcar como publicada.
- **Calendario:** los próximos 14 días con lo programado y lo publicado. "+ Crear" en cualquier día.
- **Publicar en Instagram solo (opcional):** cargá `IG_TOKEN` en Render (la cuenta de Instagram y la dirección del servidor se detectan solas). Con eso aparece "Publicar ahora en Instagram" y lo programado se publica solo a la hora elegida (te avisa por WhatsApp). Sin esas variables funciona en modo manual: a la hora programada te llega un WhatsApp "📅 Hoy toca publicar…" y desde el celu guardás las imágenes y copiás el caption.
- **Marketplace** siempre es manual (Facebook no lo permite automático): imagen + título + descripción listos para copiar.
- Instalala como app aparte desde `/contenido` → **App**.

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

1. **Supabase:** abrí tu proyecto → **SQL Editor** → pegá el contenido de `supabase.sql` → **Run**. Después corré también `supabase-gestion.sql`, `supabase-margen.sql`, `supabase-publicaciones.sql`, `supabase-instagram.sql` y `supabase-contenido.sql` (agrega clientes, gastos y el stock automático; se puede correr más de una vez). Cargá tus productos reales en la tabla `productos` o desde `/gestion`.
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
- `supabase.sql` + `supabase-gestion.sql` + `supabase-margen.sql` + `supabase-publicaciones.sql` + `supabase-instagram.sql` + `supabase-contenido.sql` → tablas de la base de datos
- `src/promo.js` → promo vigente · `src/instagram.js` → historias y carrusel
- `src/estudio.js` → diseño de carruseles, posts e historias + plan semanal · `src/contenido.js` → API del estudio, publicación en Instagram y programador
- `contenido/App.jsx` → el estudio de contenido (si lo cambiás: `npm i --no-save esbuild react@18 react-dom@18 && node contenido/build.mjs`)
- `gestion/iconos.js` → genera los íconos de la app

---

## Conectar Instagram para que publique solo (opcional)

1. Instagram **profesional** (Empresa o Creador) y **vinculado a la página de Facebook Tecno Riv**: en Meta Business Suite → Configuración → Cuentas de Instagram → Conectar.
2. En [developers.facebook.com](https://developers.facebook.com) → tu app (la de WhatsApp sirve) → **Casos de uso** → agregá "Administrar mensajes y contenido en Instagram" (API de Instagram con inicio de sesión de Facebook).
3. En [business.facebook.com/settings](https://business.facebook.com/settings) → **Usuarios del sistema** → tu usuario (o creá uno *Administrador*) → **Asignar activos**: la página Tecno Riv, la cuenta de Instagram y la app, con control total.
4. **Generar token** → elegí la app → caducidad **Nunca** → permisos `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` y `business_management`. Ese es `IG_TOKEN`.
5. Cargalo en Render → Environment → `IG_TOKEN`. En `/contenido` arriba tiene que aparecer **● @tecno_riv** en verde. Si sale **IG con error**, el mensaje en Inicio dice qué falta.

Opcionales: `IG_USER_ID` (si tenés varias cuentas y querés fijar una) y `PUBLIC_URL` (Render ya la define sola).

> Si el hosting se duerme (plan gratis de Render), la publicación programada sale cuando el servidor se despierta. Para que salga puntual, usá un plan que no duerma o un ping cada 10 minutos (ej. cron-job.org a `/`).
