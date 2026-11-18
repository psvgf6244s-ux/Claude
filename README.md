# BLANC RECORDS — tienda Shopify

- `blanc-records-theme/` — tema de Shopify (Online Store 2.0). Se sube como `.zip`.
- `legal/` — textos legales para pegar en Shopify.

## 1. Reactivar la tienda
Shopify tiene la tienda `dcryrx-qp` bloqueada (pago o plan). Entra en
https://admin.shopify.com/store/dcryrx-qp/access_account y elige un plan.

## 2. Subir el tema
1. Descarga `blanc-records-theme.zip` (en la raíz de este repositorio).
2. Shopify → **Tienda online → Temas → Añadir tema → Subir archivo zip**.
3. En el tema subido: **Personalizar** para poner la foto o el vídeo de portada y elegir la colección; después **Publicar**.

En el editor (Personalizar) puedes cambiar:
- Portada: imagen o vídeo de fondo, texto pequeño y botón.
- Colección destacada: qué colección sale en «Novedades».
- Ficha de producto: qué página se abre en «Guía de tallas» y en «Envíos y devoluciones».
- Ajustes del tema → Marca: el ® solo debe activarse si la marca está registrada (usarlo sin registro es publicidad engañosa).

## 3. Productos
Los 7 productos del Drop 01 ya se crearon en borrador (35 variantes, tallas XS–XL). Cuando la tienda esté activa:
- Sube las fotos: modelo de pie, fondo blanco, misma distancia y luz en todas. Formato vertical 3:4.
- Pasa los productos de **Borrador** a **Activo**.
- Pon nombre y descripción a los 5 que están «por definir».

## 4. Textos legales
| Archivo | Dónde va en Shopify |
|---|---|
| `legal/04-condiciones-venta.html` | Configuración → Políticas → **Términos del servicio** |
| `legal/02-politica-privacidad.html` | Configuración → Políticas → **Política de privacidad** |
| `legal/06-politica-devoluciones.html` | Configuración → Políticas → **Política de reembolso** |
| `legal/05-politica-envios.html` | Configuración → Políticas → **Política de envío** |
| `legal/01-aviso-legal.html` | Configuración → Políticas → **Aviso legal** |
| `legal/03-politica-cookies.html` | Tienda online → Páginas → nueva página «Cookies» (dirección `/pages/cookies`) |

Antes de publicar, sustituye **todo lo que está entre corchetes** `[ ]`: nombre o razón social, NIF, dirección, teléfono, transportista, precios y plazos de envío, fecha.

## 5. Ajustes que hay que activar en Shopify
- **Configuración → Privacidad de los clientes → Banner de cookies**: activarlo para la UE/España, con botones «Aceptar», «Rechazar» y «Gestionar preferencias». El botón «Preferencias de cookies» del pie abre este banner.
- **Configuración → Pago (Checkout)**: datos de contacto obligatorios; activar «Mostrar casilla de aceptación de suscripción a marketing» sin marcar por defecto.
- **Configuración → Impuestos**: precios con IVA incluido (21 %).
- **Configuración → Envío**: crear las tarifas de la política de envíos.
- **Contenido → Menús**:
  - `main-menu`: Inicio, Catálogo (`/collections/all`), Contacto (`/pages/contacto`).
  - `footer`: Términos (`/policies/terms-of-service`), Envíos (`/policies/shipping-policy`), Devoluciones (`/policies/refund-policy`), Privacidad (`/policies/privacy-policy`), Cookies (`/pages/cookies`), Aviso legal (`/policies/legal-notice`).
- **Páginas**: «Contacto» con la plantilla `page.contact`; «Guía de tallas» con la tabla de medidas.
- **Hojas de reclamaciones**: tenerlas disponibles (se piden en tu comunidad autónoma) y entregarlas a quien las solicite.

## 6. Lo que la ley exige y solo puedes hacer tú
- Estar dado de alta en Hacienda (modelo 036/037) y en la Seguridad Social como autónomo, o tener una sociedad, antes de vender.
- Emitir factura de cada venta si te la piden y declarar el IVA trimestral.
- Revisar estos textos con una gestoría o un abogado: son una base completa pero no sustituyen el asesoramiento profesional.
- Si quieres usar ®, registrar la marca en la OEPM (oepm.es) o en la EUIPO.
