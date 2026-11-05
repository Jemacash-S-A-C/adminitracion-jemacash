# Administración de Jemacash

Portal del equipo para revisar solicitudes, confirmar recogidas, activar créditos y consultar clientes, garantías, pagos y cuotas. Construido con React, TypeScript y Vite.

## Desarrollo local

Requiere Node.js 22.12 o posterior compatible con Vite 8 y la API de Jemacash en ejecución.

```sh
npm ci
npm run dev
```

Abre http://localhost:5174 e inicia sesión con una cuenta de administrador o moderador creada en la API.

La API predeterminada es http://localhost:3000. Para usar otra dirección, copia `.env.example` a `.env` y configura `VITE_API_URL`. En el servidor de la API, configura `ADMIN_FRONTEND_URL` con el origen de este portal para permitir las solicitudes CORS.

## Compilación

```sh
npm run build
npm run preview
```

La compilación se genera en `dist`. Las variables `VITE_*` son públicas y se incorporan durante la compilación.

Este repositorio contiene el frontend administrativo. La autenticación, los permisos, los datos y las actualizaciones en tiempo real dependen de la API compartida de Jemacash.
