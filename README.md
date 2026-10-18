# TeenSport – Frontend

Aplicación web (Angular) de **TeenSport**, el sistema de gestión de una academia deportiva juvenil.
Consume el API REST del back (`teen-sport-bk`, Spring Boot, prefijo `/api/v1`) y tiene tres roles:

| Rol               | Qué hace en la aplicación                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acudiente**     | Registra a sus deportistas, mira los grupos con cupo, solicita inscripciones, avisa sus pagos y consulta su historial.                                                |
| **Administrador** | Gestiona disciplinas, entrenadores y grupos (con horarios); revisa las solicitudes (confirmar, rechazar, cambiar de grupo, cancelar); registra pagos y marca la mora. |
| **Entrenador**    | Por ahora inicia sesión y ve su inicio y su perfil.                                                                                                                   |

## Requisitos

- **Node.js 22 (LTS)**, versión reciente, y **npm**.
- El back corriendo en `http://localhost:8080` para trabajar con datos reales.

## Comandos

```bash
npm install          # instala las dependencias (solo la primera vez)
npm start            # servidor de desarrollo en http://localhost:4200 (equivale a ng serve)
npm test             # pruebas unitarias (Vitest) en modo observación
npx ng test --no-watch   # pruebas una sola vez, como en CI
npm run build        # compila para producción en dist/teen-sport-fn/browser
```

## Conexión con el back

La dirección del API está en `src/environments/`:

- `environment.ts` (desarrollo): `http://localhost:8080/api/v1`.
- `environment.production.ts` (producción): la dirección pública del back en Railway, terminada en
  `/api/v1` (ver «Despliegue»).

El back solo acepta peticiones del navegador desde los orígenes de su variable de entorno
`CORS_ALLOWED_ORIGINS` (por defecto `http://localhost:4200`). Al desplegar, la dirección del front
debe agregarse a esa variable.

La sesión (token y datos del usuario) se guarda en `localStorage` y **dura lo que diga el back**
(`JWT_EXPIRATION_SECONDS`, 3600 s por defecto): pasado ese tiempo la aplicación pide iniciar sesión de nuevo.

## Estructura

```
src/app/
├── Core/          Sesión, guards (authGuard, guestGuard, roleGuard), interceptor del token, modelos comunes
├── layout/        Marco con encabezado, menú por rol (nav-items.ts) y menú desplegable en pantallas angostas
├── shared/        Piezas reutilizables: ventana de confirmación, paginación, insignias de estado,
│                  formatos de fecha y dinero, validadores y manejo de errores de formularios
└── features/      Una carpeta por módulo, cada una con sus modelos, servicio y pantallas
    ├── auth/          Inicio de sesión y registro
    ├── profile/       Perfil, edición y cambio de contraseña
    ├── home/          Inicio de cada rol (saludo y accesos rápidos)
    ├── athletes/      Deportistas del acudiente
    ├── catalog/       Grupos disponibles y cupos (consulta)
    ├── disciplines/   Disciplinas (admin)
    ├── coaches/       Entrenadores (admin)
    ├── groups/        Grupos y horarios (admin) y solicitud de inscripción (acudiente)
    ├── enrollments/   Inscripciones: del acudiente y revisión/gestión del administrador
    ├── payments/      Pagos: historial del acudiente y registro/historial del administrador
    ├── guardian/      Rutas del acudiente
    └── admin/         Rutas del administrador
```

Las rutas se cargan de forma perezosa (`loadComponent` / `loadChildren`) y cada rol queda protegido por
un único `roleGuard`. Si alguien entra a una dirección que no es de su rol, vuelve a su inicio.

## Convenciones del código

- Componentes standalone con **signals** (`signal`, `computed`, `input()`, `output()`) y control de flujo
  `@if` / `@for`. Formularios reactivos.
- Los errores del API se interpretan por su **`code`**, nunca por el texto del mensaje; cada módulo tiene
  su archivo de mensajes en español (`*-errors.ts`).
- Las acciones delicadas (rechazar, cancelar, marcar mora) piden confirmación antes de enviarse.
- Cada componente y servicio tiene su prueba (`*.spec.ts`) con `HttpTestingController`, sin llamar al back real.
- Formato con Prettier (`npx prettier --write <archivo>`).

## Reglas de negocio que se ven en la interfaz

- Un deportista debe tener entre 12 y 17 años para inscribirse.
- Una solicitud nueva queda **«En revisión»**; el administrador la confirma (puede cambiarla de grupo y
  registrar el primer pago) o la rechaza con un motivo que el acudiente ve.
- Los pagos son presenciales: el administrador los registra. El monto no puede ser menor que la mensualidad,
  la fecha no puede ser futura y **solo se admite un pago por mes** para cada inscripción.
- El **estado del pago lo cambia el administrador**: queda «Al día» al registrar un pago y «Pago pendiente»
  (mora) cuando lo marca manualmente. No hay un proceso automático mensual.
- El acudiente solo puede avisar «Ya pagué» cuando su inscripción está activa y con el pago pendiente.

## Despliegue (Railway)

El front se publica en **Railway** como un servicio aparte del back. El repositorio ya trae lo necesario:

- `Dockerfile`: compila con `npm ci` + `npm run build` y sirve la carpeta `dist/teen-sport-fn/browser` con Caddy.
- `Caddyfile`: devuelve `index.html` para las rutas internas (por ejemplo, al recargar `/admin/enrollments`)
  y escucha en el puerto que entrega Railway (`$PORT`).
- `.dockerignore`: deja fuera `node_modules`, `dist` y carpetas del editor.

Pasos:

1. En `src/environments/environment.production.ts`, dejar la dirección **pública del back** en Railway,
   terminada en `/api/v1` (por ejemplo `https://<back>.up.railway.app/api/v1`). Se escribe en el código
   porque Angular la incrusta al compilar.
2. En Railway: **New → GitHub Repo** y elegir este repositorio. Railway detecta el `Dockerfile` solo.
3. En el servicio del front: **Settings → Networking → Generate Domain** para obtener su dirección pública.
4. En el servicio del **back**, agregar esa dirección del front a la variable `CORS_ALLOWED_ORIGINS`
   (sin barra final y sin comodines, por ejemplo `https://<front>.up.railway.app`; se pueden separar
   varias con comas, y conviene dejar también `http://localhost:4200` para trabajar en local). Railway
   vuelve a desplegar el back con el cambio.
5. Abrir la dirección del front, iniciar sesión y probar. Si el navegador muestra errores de CORS, la
   dirección del paso 4 no coincide exactamente con la del front.

La compilación no incrusta las fuentes de Google (`fonts.inline: false` en `angular.json`), así que no
necesita salida a internet para las fuentes; el navegador las pide al abrir la página.
