# botmaker-api

API middleware entre **Botmaker** y **Salesforce** para el proyecto **Alleata**.

Expone endpoints REST que el bot consume para consultar y registrar información en el CRM.

---

## Stack

- Node.js + Express
- jsforce (Salesforce SDK)
- dotenv
- PM2 (producción)
- nginx + SSL (producción en `api2.alleata.com.ar`)

---

## Estructura

```
botmaker-api/
├── src/
│   ├── index.js          # Entry point
│   ├── middleware/
│   │   └── auth.js       # Validación de API Key (header x-api-key)
│   ├── routes/
│   │   └── api.js        # Definición de endpoints y formateo para Botmaker
│   └── services/
│       └── salesforce.js # Conexión y queries a Salesforce via jsforce
├── .env                  # Variables de entorno (no se sube al repo)
├── .gitignore
├── package.json
└── README.md
```

---

## Variables de entorno

Crear un archivo `.env` en la raíz con los siguientes valores:

```dotenv
PORT=3000
API_KEY=tu_api_key

SF_USERNAME=usuario@alleata.com
SF_PASSWORD=tu_password
SF_SECURITY_TOKEN=tu_token
SF_LOGIN_URL=https://alleata.my.salesforce.com
SF_CUIT_FIELD=CUIT__c
```

> ⚠️ Nunca subir el `.env` al repositorio.

---

## Instalación y uso local

```bash
npm install
npm run dev     # desarrollo con nodemon
npm start       # producción
```

Health check:

```bash
curl http://localhost:3000/health
```

---

## Endpoints

Todos los endpoints requieren el header:

```
x-api-key: <API_KEY>
```

### GET `/api/sucursales?cuit=`

Devuelve la cuenta madre y la lista de sucursales asociadas a un CUIT.

**Response:**
```json
{
  "ok": true,
  "cuentaMadre": { "id": "...", "nombre": "...", "cuit": "..." },
  "sucursales": [{ "id": "...", "nombre": "...", "ciudad": "..." }],
  "total": 3,
  "textoBotmaker": "📋 *Sucursales de ...*\n\n1. ..."
}
```

---

### GET `/api/sucursal?id=`

Devuelve el detalle de una sucursal por su ID de Salesforce.

**Response:**
```json
{
  "ok": true,
  "sucursal": {
    "id": "...",
    "nombre": "...",
    "telefono": "...",
    "domicilio": { "calle": "...", "ciudad": "...", "provincia": "..." },
    "responsableCuenta": "...",
    "cuentaMadre": { "id": "...", "nombre": "..." }
  },
  "textoBotmaker": "🏢 *Nombre*\n\n📍 ..."
}
```

---

### GET `/api/credenciales?cuentaId=`

Devuelve usuario/contraseña del cajero, Dash Panel, mail y banco pagador de una sucursal.

---

### GET `/api/ordenes?cuentaId=`

Devuelve las últimas 10 órdenes de trabajo asociadas a una sucursal, ordenadas por fecha descendente.

---

### GET `/api/establecimientos?cuentaId=`

Devuelve los establecimientos (Terminal ID y Establecimiento VISA) de una sucursal.

---

### GET `/api/estado-financiero?cuentaId=`

Devuelve el Plan PP e Importe PP asociados a la **cuenta madre**.

---

### GET `/api/productos?cuentaId=`

Devuelve los productos/terminales asociados a una sucursal.

---

### POST `/api/leads`

Crea un Lead en Salesforce con los datos de un prospecto nuevo.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "mail": "juan@empresa.com",
  "telefono": "1112345678",
  "cuit": "20123456789"
}
```

**Response:**
```json
{
  "ok": true,
  "leadId": "00Q...",
  "textoBotmaker": "✅ ¡Gracias Juan Pérez! Tus datos fueron registrados..."
}
```

---

## Despliegue en producción

El servidor corre en `api2.alleata.com.ar` con SSL (Let's Encrypt, renovar antes del vencimiento).

```bash
# Reiniciar con PM2
pm2 restart botmaker-api

# Ver logs
pm2 logs botmaker-api

# Estado
pm2 status
```

---

## Scripts Botmaker

Ver documento `alleata_botmaker_scripts.docx` para el detalle completo de los tres scripts
que se configuran en Botmaker, las variables que setean y dónde se colocan en el flujo.