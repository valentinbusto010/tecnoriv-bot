# Tecno Riv Bot

Sistema para vender más con menos trabajo manual:

| Qué hace | Dónde |
|---|---|
| **Crea la publicación de Marketplace**: imagen llamativa con tu marca y precio + título + descripción | Panel → pestaña 1 |
| **Responde consultas de Marketplace**: pegás el mensaje del cliente y te da la respuesta lista para copiar | Panel → pestaña 2 |
| **Atiende WhatsApp solo, 24/7**: responde, recuerda la charla, cierra la venta y te avisa | Automático |
| **Sistema de gestión**: clientes, pedidos, stock y finanzas. Las ventas del bot entran solas | `/gestion` |
| **Catálogo para clientes**: productos y precios en vivo, el cliente arma su pedido y lo manda por WhatsApp | `/catalogo` (público) |
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

### Catálogo para clientes (`/catalogo`)
Página pública (sin contraseña) para compartir en la bio de Instagram, estados de WhatsApp y Marketplace: `https://TU-SERVIDOR/catalogo`.
- Lee la misma tabla `productos` que el bot y `/gestion`: si cambiás un precio, el stock o una foto, el catálogo se actualiza solo (cada 60 s y al volver a la pestaña).
- Muestra nombre, foto, precio (con la promo aplicada si hay), cuotas y estado: disponible, **últimas unidades** (stock ≤ alerta) o **agotado**. **Nunca** muestra costos, márgenes ni el stock exacto. Los productos ocultos al bot (`activo = false`) no aparecen.
- El cliente agrega productos y toca **Pedir por WhatsApp**: se abre el chat con la lista, cantidades y total. Número: `whatsapp` de `src/negocio.js`, o `WHATSAPP_PEDIDOS` en Render si querés que los pedidos vayan a otro número (por ejemplo, al del bot).
- Para cambiarlo: `catalogo/App.jsx` y después `node catalogo/build.mjs`.

### Estudio de contenido (`/contenido`)
App aparte (misma contraseña) para hacer y publicar todo el contenido de Instagram y Marketplace con los colores y el formato de @tecno_riv.
- **Inicio:** cuánto publicaste en la semana (meta: 5), qué toca hoy, días sin contenido y el **Plan de la semana**: 7 ideas armadas con tu stock real. Tocás "Crear esto" y queda todo cargado.
- **Crear:** elegís formato (**Carrusel** 6-9 slides, **Post**, **Historias**, **Marketplace**), plantilla (**Producto destacado, Colección, Comparativa, Tips/Educativo, Promo, Libre**), los productos y, si querés, la idea. Claude escribe los textos y el sistema dibuja las imágenes con las fotos reales, los precios de la base (con promo si hay) y el caption con hashtags. Podés dejarlo programado en el mismo paso.
- **Biblioteca:** todas las piezas con su estado (borrador / programado / publicado). Adentro de cada una: guardar todas las imágenes, copiar el caption, **editar los textos de cada slide y rehacer las imágenes**, programar, publicar o marcar como publicada.
- **Calendario:** los próximos 14 días con lo programado y lo publicado. "+ Crear" en cualquier día.
- **Publicar en Instagram solo (opcional):** cargá `IG_TOKEN` en Render (la cuenta de Instagram y la dirección del servidor se detectan solas). Con eso aparece "Publicar ahora en Instagram" y lo programado se publica solo a la hora elegida (te avisa por WhatsApp). Sin esas variables funciona en modo manual: a la hora programada te llega un WhatsApp "📅 Hoy toca publicar…" y desde el celu guardás las imágenes y copiás el caption.
- **Marketplace** siempre es manual (Facebook no lo permite automático): imagen + título + descripción listos para copiar.
- Instalala como app aparte desde `/contenido` → **App**.

### Asistente IA (en /gestion y /contenido)
Botón **✨ Asistente IA** abajo a la derecha. Ve en vivo tu stock, ventas (120 días), gastos, clientes y contenido, y calcula los totales exactos.
- **Preguntale:** "¿cómo vengo este mes?", "¿qué tengo que reponer?", "¿cuál es mi producto más rentable?", "¿qué compró Juan?".
- **Pedile cambios:** cargar venta o gasto, sumar/restar stock, cambiar precio/costo, pausar o crear productos, configurar la promo, crear o programar contenido. Te muestra una tarjeta y **no cambia nada hasta que tocás Confirmar**.
- Se puede dictar con el micrófono. Usa la misma `CLAUDE_API_KEY` (cada mensaje cuesta unos centavos de dólar).

### Perfil de WhatsApp del bot (en /gestion → Clientes)
Foto, info, descripción, dirección, email, web y rubro que ve el cliente al tocar el nombre del chat, con vista previa. **Poner logo TECNO riv** sube el logo como foto (640×640) y **Usar textos sugeridos** arma la descripción con los datos de `src/negocio.js`. Usa `WHATSAPP_TOKEN` y `PHONE_NUMBER_ID`; para la foto busca solo el ID de la app (si falla, cargá `META_APP_ID` en Render). El nombre visible se cambia en WhatsApp Manager (lo revisa Meta).

### Catálogo dentro de WhatsApp (ícono de tienda en el perfil + carrito)
- El catálogo de Meta **"Tecno Riv - Catálogo WhatsApp"** (ID en `src/negocio.js` → `catalogoMeta`) se llena solo con `/catalogo/meta.csv`: productos activos **con foto**, precio de lista, precio promo si hay, disponibilidad y link a `/catalogo?p=ID`. Nunca expone costos ni stock exacto.
- En Meta Commerce Manager → el catálogo → **Orígenes de datos** → feed programado **cada hora** con esa URL.
- En /gestion → Clientes → Perfil de WhatsApp → **Catálogo en WhatsApp**: poné el ID de la cuenta de WhatsApp y tocá **Conectar y mostrar catálogo** (conecta el catálogo y prende catálogo + carrito).
- Cuando un cliente manda el carrito, el bot lo recibe como `[PEDIDO DESDE EL CATÁLOGO DE WHATSAPP]`, confirma total con precios actuales, pide entrega y pago y cierra la venta normal.

### Postventa y resumen diario por WhatsApp (en /gestion → Clientes → Automatizaciones)
- **Seguimiento:** a los 3 días de marcar un pedido como **entregado**, el bot le escribe "¿Cómo te está funcionando tu…?". Si está conforme, le pide que te etiquete en Instagram; si tiene un problema, te lo deriva.
- **Oferta de recompra:** a los 35 días le ofrece un accesorio que combina con lo que compró (malla/hidrogel para smartwatch, MagSafe para quien compró funda, etc.) con 10% OFF por 7 días. Si lo compra por el bot, el descuento se aplica solo. Quien responde **BAJA** no recibe más ofertas.
- **Resumen diario** a tu WhatsApp a las 8: ventas de ayer y del mes, pendientes, stock bajo, contenido del día y un consejo de la IA. Respondé **hoy** para verlo completo cuando llega por plantilla.
- Días, % de descuento y hora se cambian desde el panel. Solo escribe a clientes de lunes a sábado de 10 a 20 h. Los pedidos que ya estaban entregados antes de activar esto no reciben mensajes.

**Plantillas (obligatorias, una sola vez):** WhatsApp solo deja mandar texto libre a quien te escribió en las últimas 24 h. Para el resto hay que crear 4 plantillas. **La forma fácil:** en `/panel` → **WhatsApp del bot** → poné el ID de la cuenta de WhatsApp y tocá **Crear / revisar plantillas** (usa el `WHATSAPP_TOKEN`, que necesita el permiso `whatsapp_business_management`). A mano en **business.facebook.com → WhatsApp Manager → Plantillas de mensajes → Crear plantilla**, idioma **Español (ARG)**, con estos nombres y textos exactos:

| Nombre | Categoría | Texto |
|---|---|---|
| `tr_seguimiento` | Utilidad | `Hola {{1}}! Te escribimos de Tecno Riv 👋 ¿Cómo te está funcionando tu {{2}}? Si tenés alguna duda o algo no anda bien, respondé este mensaje y te ayudamos.` |
| `tr_recompra` | Marketing | `Hola {{1}}! Como compraste {{2}} en Tecno Riv, te guardamos un beneficio: {{3}}, {{4}}% OFF hasta el {{5}}. ¿Te lo reservamos? Respondé este mensaje. Si no querés recibir más ofertas, respondé BAJA.` |
| `tr_resumen` | Utilidad | `Buen día! Tu resumen de Tecno Riv: {{1}}. Respondé HOY para ver el detalle completo.` |
| `tr_aviso` | Utilidad | `🔔 Aviso de Tecno Riv: {{1}}. Revisalo en tu panel de gestión.` |

Ejemplos para la revisión de Meta: {{1}} Juan · {{2}} Smartwatch D20 · {{3}} Malla para smartwatch a $3.149 (antes $3.499) · {{4}} 10 · {{5}} 12/11. Para el resumen: ayer $45.000 (2 pedidos) · mes $380.000 · 1 pendientes · 3 productos con stock bajo. Para el aviso: 🛒 NUEVA VENTA #12 · Cliente: +5493584123456 · Smartwatch D20 · $12.000 (los avisos de ventas y de clientes que necesitan atención llegan por esta plantilla si no le escribiste al bot en las últimas 24 h). Si usás otro idioma, cargá `WA_IDIOMA_PLANTILLAS` en Render (ej. `es`). Correr también `supabase-postventa.sql`.

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

1. **Supabase:** abrí tu proyecto → **SQL Editor** → pegá el contenido de `supabase.sql` → **Run**. Después corré también `supabase-gestion.sql`, `supabase-margen.sql`, `supabase-publicaciones.sql`, `supabase-instagram.sql`, `supabase-contenido.sql` y `supabase-postventa.sql` (agrega clientes, gastos y el stock automático; se puede correr más de una vez). Cargá tus productos reales en la tabla `productos` o desde `/gestion`.
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
- `src/catalogo.js` → API pública del catálogo · `catalogo/App.jsx` → la página del catálogo
- `src/estudio.js` → diseño de carruseles, posts e historias + plan semanal · `src/contenido.js` → API del estudio, publicación en Instagram y programador
- `contenido/App.jsx` → el estudio de contenido (si lo cambiás: `npm i --no-save esbuild react@18 react-dom@18 && node contenido/build.mjs`)
- `src/postventa.js` → seguimiento, oferta de recompra y resumen diario · `src/whatsapp.js` → envío por WhatsApp (texto y plantillas)
- `src/asistente.js` → API del asistente IA · `compartido/Asistente.jsx` → el chat flotante
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
