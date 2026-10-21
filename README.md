# Tecno Riv Bot

Sistema para vender más con menos trabajo manual:

| Qué hace | Dónde |
|---|---|
| **Crea la publicación de Marketplace**: imagen llamativa con tu marca y precio + título + descripción | Panel → pestaña 1 |
| **Responde consultas de Marketplace**: pegás el mensaje del cliente y te da la respuesta lista para copiar | Panel → pestaña 2 |
| **Atiende WhatsApp solo, 24/7**: responde, recuerda la charla, cierra la venta y te avisa | Automático |

> **Importante sobre Marketplace:** Facebook no permite que un programa publique ni chatee solo en Marketplace. Si se usa un bot para eso, te bloquean la cuenta. Por eso el sistema te deja **todo listo** (imagen, título, descripción y respuestas) y vos solo copiás y pegás: 1 minuto por producto. En **WhatsApp** sí está permitido, y ahí el bot trabaja 100% solo.

---

## Cómo se usa (todos los días)

### Publicar un producto
1. Entrá a `https://TU-SERVIDOR/panel` desde el celu.
2. Subí la foto (mejor con fondo claro), poné nombre y precio. Opcional: precio anterior y detalles.
3. Tocá **Generar publicación**.
4. Descargá la imagen, copiá título y descripción, y pegalos en Marketplace.

### Responder una consulta de Marketplace
1. Pestaña **2. Responder consulta**.
2. Pegá lo que escribió el cliente → **Sugerir respuesta** (ya queda copiada).
3. Pegala en Marketplace. Cuando el cliente conteste, pegá su respuesta y repetí.
4. Truco: llevá al cliente a WhatsApp, donde el bot sigue solo.

### WhatsApp
No hacés nada. Cuando un cliente confirma la compra, te llega un WhatsApp con "🛒 NUEVA VENTA" y los datos, y queda guardada en la tabla `pedidos`.

### Cambiar precios o stock
Supabase → **Table Editor** → `productos`. El bot usa siempre lo que esté ahí. Sin stock → poné `stock` en 0. Producto que ya no vendés → `activo` en false.

### Cambiar medios de pago, envíos, garantía o tu WhatsApp
Editá el archivo `src/negocio.js`.

---

## Instalación (una sola vez)

1. **Supabase:** abrí tu proyecto → **SQL Editor** → pegá el contenido de `supabase.sql` → **Run**. Después cargá tus productos reales en la tabla `productos`.
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
- `public/panel.html` → el panel
- `supabase.sql` → tablas de la base de datos
