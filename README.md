# Botmaker ↔ Salesforce API Middleware

API intermedia que conecta Botmaker con Salesforce para identificar cuentas madre por CUIT y listar sus sucursales.

---

## Stack

- **Node.js** (v18+)
- **Express**
- **jsforce** — cliente oficial de Salesforce para Node.js

---

## Estructura del proyecto

```
botmaker-api/
├── src/
│   ├── index.js              ← Entry point
│   ├── middleware/
│   │   └── auth.js           ← Autenticación por API Key
│   ├── routes/
│   │   └── api.js            ← Endpoints /api/sucursales y /api/sucursal
│   └── services/
│       └── salesforce.js     ← Conexión OAuth + queries SOQL
├── .env.example              ← Variables de entorno requeridas
├── package.json
└── README.md
```

---

## Instalación

```bash
# 1. Clonar el repo en el servidor
git clone <repo-url>
cd botmaker-api

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
nano .env   # completar con los valores reales
```

---

## Configuración del archivo .env

| Variable            | Descripción                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| `PORT`              | Puerto donde corre la API (default: 3000)                                   |
| `API_KEY`           | Clave secreta que Botmaker debe enviar en el header `x-api-key`             |
| `SF_CLIENT_ID`      | Consumer Key de la Connected App en Salesforce                              |
| `SF_CLIENT_SECRET`  | Consumer Secret de la Connected App en Salesforce                           |
| `SF_USERNAME`       | Usuario de Salesforce                                                       |
| `SF_PASSWORD`       | Contraseña de Salesforce                                                    |
| `SF_SECURITY_TOKEN` | Security Token de Salesforce (ver abajo cómo obtenerlo)                     |
| `SF_LOGIN_URL`      | `https://login.salesforce.com` (producción) o `https://test.salesforce.com` |
| `SF_CUIT_FIELD`     | Nombre API del campo CUIT en el objeto Account (ej: `CUIT__c`)              |

### Cómo obtener el Security Token de Salesforce
1. Ir a **Configuración → Mis datos personales → Restablecer mi token de seguridad**
2. Llega por email al usuario configurado

### Cómo crear la Connected App en Salesforce
1. **Setup → App Manager → New Connected App**
2. Activar **OAuth Settings**
3. Callback URL: `http://localhost` (no se usa en server-to-server)
4. Scopes: `api`, `refresh_token`
5. Guardar y copiar **Consumer Key** y **Consumer Secret** al `.env`

---

## Iniciar la API

```bash
# Producción
npm start

# Desarrollo (con auto-reload)
npm run dev
```

---

## Endpoints

### `GET /health`
Health check sin autenticación.

**Respuesta:**
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

### `GET /api/sucursales?cuit={cuit}`
Busca la cuenta madre por CUIT y retorna sus sucursales.

**Headers requeridos:**
```
x-api-key: tu_api_key_secreta
```

**Respuesta exitosa (200):**
```json
{
  "ok": true,
  "cuentaMadre": {
    "id": "001Rm00000P8DoJIAV",
    "nombre": "Andres Moretti e Hijos S.A",
    "cuit": "20123456789"
  },
  "sucursales": [
    { "id": "001Rm00000XXXXXX", "nombre": "Sucursal Centro", "ciudad": "Buenos Aires", "provincia": "CABA" },
    { "id": "001Rm00000YYYYYY", "nombre": "Sucursal Norte", "ciudad": "Tigre", "provincia": "Buenos Aires" }
  ],
  "total": 2,
  "textoBotmaker": "📋 *Sucursales de Andres Moretti e Hijos S.A*\n\n1. *Sucursal Centro* — Buenos Aires\n2. *Sucursal Norte* — Tigre\n\nSeleccioná el número de la sucursal para ver más información."
}
```

**CUIT no encontrado (404):**
```json
{
  "ok": false,
  "error": "No se encontró ninguna cuenta madre con el CUIT 20999999999.",
  "textoBotmaker": "❌ No encontramos ninguna cuenta asociada al CUIT *20999999999*. Verificá el número e intentá nuevamente."
}
```

---

### `GET /api/sucursal?id={id}`
Retorna el detalle completo de una sucursal por su Id de Salesforce.

**Headers requeridos:**
```
x-api-key: tu_api_key_secreta
```

**Respuesta exitosa (200):**
```json
{
  "ok": true,
  "sucursal": {
    "id": "001Rm00000XXXXXX",
    "nombre": "Sucursal Centro",
    "numeroCuenta": "SUC-001",
    "telefono": "011-4444-5555",
    "fax": "",
    "website": "",
    "domicilio": {
      "calle": "Av. Corrientes 1234",
      "ciudad": "Buenos Aires",
      "provincia": "CABA",
      "codigoPostal": "1043",
      "pais": "Argentina"
    },
    "descripcion": "",
    "cuentaMadre": {
      "id": "001Rm00000P8DoJIAV",
      "nombre": "Andres Moretti e Hijos S.A"
    }
  },
  "textoBotmaker": "🏢 *Sucursal Centro*\n\n📍 Domicilio: Av. Corrientes 1234, Buenos Aires, CABA, 1043\n📞 Teléfono: 011-4444-5555"
}
```

---

## Configuración en Botmaker

En cada webhook de Botmaker que llame a esta API, agregar el header:
```
x-api-key: <valor de API_KEY en tu .env>
```

---

## Deploy en servidor del cliente

```bash
# Opción recomendada: usar PM2 para mantener el proceso activo
npm install -g pm2
pm2 start src/index.js --name botmaker-api
pm2 save
pm2 startup   # para que arranque automático tras reboot
```

### Requisitos mínimos del servidor
- Node.js v18 o superior
- Acceso a internet (para conectarse a Salesforce)
- Puerto configurado abierto (default 3000)

---

## Ajuste del campo CUIT

Si el nombre del campo CUIT en Salesforce es diferente a `CUIT__c`:
1. Ir a **Setup → Administrador de objetos → Account → Campos y relaciones**
2. Buscar el campo CUIT y copiar el **Nombre de campo API**
3. Actualizar `SF_CUIT_FIELD` en el `.env`

---

## Troubleshooting

| Error | Causa probable | Solución |
|-------|---------------|----------|
| `INVALID_LOGIN` | Usuario/contraseña/token incorrectos | Revisar `.env` y resetear security token |
| `No se encontró cuenta madre` | CUIT no coincide o campo incorrecto | Verificar `SF_CUIT_FIELD` y datos en SF |
| `401 No autorizado` | Header `x-api-key` ausente | Agregar header en el webhook de Botmaker |
| `403 API Key inválida` | API Key incorrecta | Verificar que Botmaker use el mismo valor que el `.env` |
