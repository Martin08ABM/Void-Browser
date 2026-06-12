# Void Browser

<!-- Badges -->
<p align="center">
  <img src="https://img.shields.io/github/v/release/Martin08ABM/void-browser?label=versi%C3%B3n&style=flat-square" alt="Versión">
  <img src="https://img.shields.io/github/license/Martin08ABM/void-browser?style=flat-square" alt="Licencia MIT">
  <img src="https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square" alt="Plataformas">
  <img src="https://img.shields.io/github/actions/workflow/status/Martin08ABM/void-browser/release.yml?label=CI&style=flat-square" alt="CI">
</p>

Navegador web minimalista, rápido y orientado a la privacidad. Construido con **Electron** y **React**, pensado para ofrecer una experiencia de navegación limpia sin distracciones.

<!-- ![Void Browser Screenshot](docs/screenshot.png) -->

---

## 📑 Tabla de contenidos

- [¿Por qué Void Browser?](#-por-qué-void-browser)
- [Características](#-características)
- [Atajos de teclado](#️-atajos-de-teclado)
- [VoidShield](#️-voidshield--bloqueador-integrado)
- [Permisos y privacidad](#-permisos-y-privacidad)
- [Historial de navegación](#-historial-de-navegación)
- [Privacy Hub](#-privacy-hub)
- [DNS sobre HTTPS](#-dns-sobre-https)
- [Do Not Track](#-do-not-track)
- [Cookies y datos](#-cookies-y-datos)
- [Spoofing de User-Agent](#-spoofing-de-user-agent)
- [Permisos de sitios](#-permisos-de-sitios)
- [Gestor de userscripts](#-gestor-de-userscripts)
- [Paleta de colores](#-paleta-de-colores)
- [Stack tecnológico](#️-stack-tecnológico)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Actualizaciones](#-actualizaciones)
- [Próximas funcionalidades](#-próximas-funcionalidades)
- [Funcionalidades no incluidas](#-funcionalidades-no-incluidas)
- [Cómo ejecutar](#-cómo-ejecutar)
- [Guía de contribución](#-guía-de-contribución)
- [Licencia](#-licencia)

---

## 🤔 ¿Por qué Void Browser?

El ecosistema de navegadores está lleno de opciones excelentes, pero muchas vienen con compromisos: telemetry agresivo, interfaces sobrecargadas, o modelos de negocio basados en la recolección de datos. **Void Browser** nace de la idea de que puedes tener un navegador moderno, rápido y funcional sin renunciar al control total de tu experiencia.

- **Sin telemetry ni analytics** — no enviamos ni un byte de información sobre tu uso.
- **Sin integraciones forzadas** — no hay wallets, sidebars, ni noticias que no pediste.
- **Código abierto y transparente** — puedes auditar exactamente qué hace el navegador.
- **Privacidad por diseño, no por configuración** — DoH, DNT, bloqueo de trackers y cookies de terceros activos por defecto.

---

## ✨ Características

- **Interfaz limpia y minimalista** — diseño oscuro con tabs compactas y navbar con auto-hide.
- **Navegación por pestañas** — crea, cierra y cambia entre pestañas fácilmente. Las pestañas mantienen su estado al cambiar entre ellas.
- **Pestañas independientes** — los enlaces con `target="_blank"` y las ventanas `window.open()` se abren como pestañas normales e independientes, sin quedar ligadas a la pestaña de origen (la página que las abre no puede controlarlas vía `window.opener`).
- **Spoofing de User-Agent** — identifícate ante los sitios como Chrome (Windows/macOS/Linux/Android), Edge, Firefox, Safari (macOS/iPhone) o un User-Agent personalizado. Las cabeceras `sec-ch-ua` se ajustan de forma coherente con el perfil elegido.
- **Favicons reales e indicadores de audio** — cada pestaña muestra el favicon del sitio y un icono cuando reproduce sonido.
- **Nueva pestaña con Speed Dial** — accesos directos a tus sitios más visitados, barra de búsqueda central y **Privacy Hub** integrado.
- **Privacy Hub** — panel para conectar tus cuentas de **Proton**, **Tuta** e **Internxt** y acceder rápidamente a sus servicios (Mail, Calendar, Drive, VPN, etc.) directamente desde la pantalla principal.
- **VoidShield (adblocker nativo)** — bloqueo de anuncios y trackers integrado, basado en el mismo motor que usa Brave. Utiliza las listas **EasyList** y **EasyPrivacy**.
- **DNS sobre HTTPS (DoH)** — resolución DNS cifrada por defecto con **Quad9**. Puedes cambiar a Cloudflare, Google, AdGuard, OpenDNS o una URL personalizada.
- **Do Not Track** — envía la señal `DNT` y `Sec-GPC` en cada petición para indicar a los sitios que no quieres ser rastreado.
- **Seguridad visual** — indicador de candado que muestra si la conexión es segura (HTTPS) o insegura (HTTP).
- **Gestión de permisos** — control de permisos por sitio (acceso a cámara, micrófono, ubicación, notificaciones, etc.). Las decisiones se guardan por origen y persisten entre sesiones. Panel en ajustes para revisar y limpiar permisos globalmente.
- **Control de cookies** — bloqueo de cookies de terceros y opción para limpiar todos los datos al cerrar el navegador.
- **Selector de motor de búsqueda** — elige tu buscador preferido al iniciar por primera vez: Google, DuckDuckGo, Bing, Yandex, Ecosia, Qwant o Kagi.
- **Gestor de userscripts** — instala scripts personalizados desde GreasyFork o URLs propias para extender la funcionalidad del navegador sin depender de la Chrome Web Store.
- **Drag & drop de pestañas** — reordena las pestañas arrastrándolas con el ratón.
- **Menú contextual** — click derecho en pestañas (recargar, duplicar, cerrar, cerrar otras, silenciar) y en la página web (atrás, adelante, recargar, copiar enlace, guardar imagen, inspeccionar).
- **Modo incógnito** — abre una ventana privada con `Ctrl + Shift + N`. Los datos de navegación se limpian automáticamente al cerrarla.
- **Optimizaciones de rendimiento** — carga diferida (lazy loading) de componentes pesados, suspensión automática de webviews inactivas para ahorrar RAM, y empaquetado ASAR para un inicio más rápido.
- **Atajos de teclado completos** — navega sin usar el ratón.

---

## ⌨️ Atajos de teclado

| Acción | Windows / Linux | macOS |
|---|---|---|
| Abrir nueva pestaña | `Ctrl + T` | `Cmd + T` |
| Abrir ventana incógnito | `Ctrl + Shift + N` | `Cmd + Shift + N` |
| Cerrar pestaña activa | `Ctrl + W` | `Cmd + W` |
| Reabrir última pestaña cerrada (hasta 10) | `Ctrl + Shift + T` | `Cmd + Shift + T` |
| Recargar pestaña activa | `Ctrl + R` o `F5` | `Cmd + R` o `F5` |
| Página anterior (back) | `Alt + ←` | `Option + ←` |
| Página siguiente (forward) | `Alt + →` | `Option + →` |
| Siguiente pestaña | `Ctrl + Tab` | `Cmd + Option + →` |
| Pestaña anterior | `Ctrl + Shift + Tab` | `Cmd + Option + ←` |
| Enfocar barra de direcciones | `Ctrl + L` | `Cmd + L` |
| Buscar en página | `Ctrl + F` | `Cmd + F` |
| Pantalla completa | `F11` | `Ctrl + Cmd + F` |
| Aumentar zoom | `Ctrl + +` | `Cmd + +` |
| Disminuir zoom | `Ctrl + -` | `Cmd + -` |
| Restablecer zoom | `Ctrl + 0` | `Cmd + 0` |
| Mostrar / ocultar barra de navegación | `Ctrl + Alt + H` | `Cmd + Option + H` |
| Mostrar / ocultar historial | `Ctrl + H` | `Cmd + H` |

> **Nota:** En macOS, `Alt` equivale a la tecla `Option`.

---

## 🛡️ VoidShield — Bloqueador integrado

VoidShield bloquea anuncios y trackers antes de que lleguen al renderer, usando `@cliqz/adblocker-electron`, un motor nativo de alto rendimiento. Esto significa:

- **Carga de páginas más rápida** (menos requests innecesarios).
- **Menor consumo de datos**.
- **Privacidad reforzada** — los trackers de terceros se bloquean por defecto.

El contador de elementos bloqueados (anuncios + trackers) se muestra en tiempo real en la navbar al hacer clic en el icono de VoidShield.

### 📺 Bloqueo de anuncios de video en YouTube

VoidShield también intenta atajar los **anuncios de video** de YouTube (pre-roll y mid-roll), además de los trackers, banners y overlays habituales:

- Cuando empieza un anuncio, VoidShield intenta saltarlo automáticamente (clic en el botón "saltar" o silenciado + avance a 16x) en cuanto el reproductor lo permite.
- Oculta overlays, banners y anuncios incrustados en el feed mediante CSS.
- Es una técnica puramente de interfaz: no modifica los datos del reproductor, así YouTube sigue funcionando con normalidad (evita los bucles de recarga que provocan los bloqueadores más agresivos).
- Activado por defecto. Puedes desactivarlo desde Ajustes → VoidShield → "Bloquear anuncios de YouTube" (recarga la pestaña tras cambiarlo).

> ⚠️ **Esta función puede fallar.** YouTube cambia con frecuencia la estructura de su reproductor y aplica contramedidas anti-adblock (por ejemplo, ignorando clics generados por script en el botón "saltar"). Como resultado, **algunos anuncios pueden reproducirse completos, sin saltarse ni acelerarse**, especialmente tras una actualización de YouTube. No es un bloqueo garantizado a nivel de red (eso rompería el reproductor), sino un best-effort que puede dejar de funcionar en cualquier momento hasta que se actualice.

### ⚠️ Limitaciones conocidas

- El anuncio puede llegar a verse/oírse durante una fracción de segundo (o reproducirse entero, ver aviso anterior) antes de saltarse, ya que se permite que el reproductor lo cargue con normalidad.
- El resto de la web (periódicos, blogs, redes sociales, etc.) bloquea anuncios y trackers sin problemas.

---

## 🔒 Permisos y privacidad

- Las páginas no pueden acceder a cámara, micrófono, ubicación ni notificaciones sin que el usuario lo autorice explícitamente.
- Las decisiones de permisos se guardan por **origen** (dominio) y **persisten entre sesiones**.
- Por defecto, solo se permite `fullscreen`; todo lo demás se niega silenciosamente.
- Puedes limpiar los permisos de un sitio desde el popup del candado de seguridad.

### Arquitectura de seguridad

Void Browser se construye sobre las garantías de seguridad de Electron:

- **Context isolation** (`contextIsolation: true`) — el preload y la página web no comparten contexto JavaScript.
- **Node integration desactivada** (`nodeIntegration: false`) — las páginas web no tienen acceso a APIs de Node.js.
- **Cookies encriptadas** — habilitadas vía Electron Fuses (`EnableCookieEncryption`).
- **Sandbox por webview** — cada pestaña se renderiza en un proceso de Chromium aislado.
- **Sin telemetry** — el navegador no realiza conexiones en segundo plano salvo las que el usuario solicite explícitamente (actualización de listas de adblocker).

> **Nota sobre WebRTC:** actualmente WebRTC no está desactivado explícitamente. Si necesitas protección contra IP leaks por WebRTC, puedes usar un userscript o VPN hasta que se añada una opción nativa.

---

## 📜 Historial de navegación

Void Browser guarda tu historial de navegación localmente (hasta 500 entradas), agrupado por fecha:

- **Hoy**, **Ayer** y fechas anteriores.
- Puedes consultarlo con `Ctrl + H` (o `Cmd + H` en macOS).
- La retención del historial es configurable en ajustes.
- Usa el botón de limpieza para borrar todo el historial.

---

## 🔒 Privacy Hub

El **Privacy Hub** es un panel integrado en la pantalla principal (nueva pestaña) que te permite conectar tus cuentas de servicios de privacidad y acceder rápidamente a sus herramientas sin salir del navegador.

### Proveedores soportados

| Proveedor | Servicios disponibles |
|-----------|----------------------|
| **Proton** | Mail, Calendar, Drive, VPN |
| **Tuta** | Mail, Calendar, Contacts |
| **Internxt** | Drive, Photos, Send |

### Cómo funciona

1. Abre una **nueva pestaña** para ver el Privacy Hub.
2. Haz clic en **Conectar** en el proveedor que quieras usar.
3. Se abrirá la pantalla de login del servicio en la pestaña activa.
4. Una vez conectado, pulsa sobre **Servicios (X)** en la tarjeta para desplegar un panel animado con los accesos directos (Mail, Calendar, Drive…).
5. Haz clic en cualquier servicio para navegar a él instantáneamente.
6. También puedes hacer **clic en cualquier parte de la tarjeta** para ir directamente a la web principal del proveedor.

> **Privacidad:** Void Browser **no almacena tokens ni credenciales**. La sesión se mantiene vía cookies del proveedor de forma nativa, igual que en cualquier navegador. La "conexión" solo marca el proveedor como activo en tu interfaz para mostrarte los accesos directos.

### Acceso rápido desde cualquier página

También puedes abrir el Privacy Hub desde cualquier sitio web haciendo clic en el icono del candado (🔒) en la navbar, junto a VoidShield.

---

## 🔐 DNS sobre HTTPS (DoH)

Void Browser cifra las consultas DNS usando **DNS over HTTPS** para evitar que tu proveedor de Internet o terceros espíen qué sitios visitas.

- **Activado por defecto** con **Quad9** (`9.9.9.9`).
- Proveedores disponibles: Quad9, Cloudflare, Google, AdGuard, OpenDNS y **Personalizado**.
- Puedes desactivarlo completamente desde Ajustes → DNS sobre HTTPS.
- La configuración se guarda en disco y persiste entre sesiones.

---

## 👤 Do Not Track

Desde Ajustes → Privacidad puedes activar **No rastrear** (Do Not Track). Cuando está activo:

- Se envía el header `DNT: 1` en cada petición HTTP.
- Se envía el header `Sec-GPC: 1` (Global Privacy Control).
- Esto indica a los sitios web que no deseas ser rastreado para publicidad o perfilado.

---

## 🍪 Cookies y datos

Desde Ajustes → Cookies y datos controlas cómo se manejan las cookies:

- **Bloquear cookies de terceros** — intercepta requests y headers `Set-Cookie` para evitar que dominios externos te rastreen. Las cookies de primer party (del sitio que visitas) siguen funcionando normalmente.
- **Limpiar al cerrar** — al salir del navegador se borra automáticamente todo el almacenamiento (cookies, caché, localStorage, etc.) de la sesión de navegación.

---

## 🪪 Spoofing de User-Agent

Desde Ajustes → Identidad del navegador puedes cambiar cómo se identifica Void Browser ante los sitios web:

| Perfil | Plataforma |
|---|---|
| Chrome (predeterminado) | Windows, macOS, Linux, Android |
| Edge | Windows |
| Firefox | Windows |
| Safari | macOS, iPhone |
| Personalizado | Cadena User-Agent libre |

El spoofing es coherente en todos los niveles:

- **Cabeceras HTTP** — se reescriben `User-Agent`, `sec-ch-ua`, `sec-ch-ua-mobile` y `sec-ch-ua-platform` en cada petición.
- **Client hints realistas** — para perfiles Firefox/Safari (navegadores que no envían client hints) las cabeceras `sec-ch-ua` se eliminan en lugar de falsificarse.
- **JavaScript** — `navigator.userAgent` también refleja el perfil elegido.

Los cambios se aplican a las pestañas nuevas y al recargar las existentes. La configuración persiste entre sesiones.

> **Nota:** algunos flujos de login (OAuth) pueden comportarse de forma distinta si te identificas como un navegador móvil o poco común. Si tienes problemas, vuelve al perfil predeterminado.

---

## 🔐 Permisos de sitios

Panel centralizado en Ajustes → Permisos de sitios donde puedes:

- Ver todos los dominios que tienen permisos guardados.
- Revisar qué permisos fueron concedidos o denegados por cada sitio (cámara, micrófono, ubicación, notificaciones, etc.).
- Limpiar los permisos de un sitio específico con un solo clic.
- Limpiar **todos** los permisos de golpe.

---

## 🔌 Gestor de userscripts

Void Browser incluye un gestor de **userscripts** compatible con el estándar Greasemonkey/Tampermonkey, blindado con una capa de seguridad y privacidad que no encontrarás en gestores convencionales.

- Instala scripts desde una URL o pega el código directamente.
- **Análisis de riesgo automático** antes de instalar — cada script se clasifica en bajo, medio o alto riesgo según sus permisos (`@grant`), conexiones (`@connect`), requisitos externos (`@require`) y patrones de código.
- **Sandbox de red** — `fetch`, `XMLHttpRequest` y `GM_xmlhttpRequest` están interceptados y bloqueados si intentan conectar a dominios no autorizados en los metadatos del script.
- **Bloqueo de eval/Function** para scripts de alto riesgo sin permiso explícito, evitando inyección de código dinámico.
- **APIs GM_* aisladas** — `GM_setValue`, `GM_getValue`, `GM_addStyle` y `GM_xmlhttpRequest` funcionan dentro de un entorno controlado sin acceso al sistema.
- Activa o desactiva scripts individualmente. Cada script instalado muestra su nivel de riesgo y permisos solicitados.
- Los scripts se inyectan automáticamente en las páginas que coincidan con su patrón `@match`.

> **Privacidad:** los userscripts de Void Browser nunca pueden escapar de su sandbox. No tienen acceso a Node.js, al sistema de archivos ni a APIs privilegiadas del navegador. Son una alternativa funcional, ligera y privada a las extensiones Chrome.

---

## 🎨 Paleta de colores

| Color | Hex | Uso |
|---|---|---|
| Fondo principal | `#0A0A0A` | Ventana y fondo general |
| Superficies | `#5E6572` | Tabs, navbar, paneles |
| Acento | `#7D98A1` | Elementos interactivos, hovers |
| HTTPS seguro | `#4E9E7A` | Candado cerrado, indicadores OK |
| HTTP inseguro | `#C75B5B` | Candado abierto, advertencias |
| Texto principal | `#EEF1EF` | Títulos, URLs, contenido principal |
| Texto secundario | `#A9B4C2` | Subtítulos, placeholders, metadatos |

---

## 🛠️ Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| [Electron](https://www.electronjs.org/) | 42.3.0 | Framework de escritorio |
| [Chromium](https://www.chromium.org/) | ~128 | Motor de renderizado (incluido en Electron) |
| [React](https://react.dev/) | 19.2.6 | UI del renderer |
| [Vite](https://vitejs.dev/) | 5.4.21 | Bundler y dev server |
| [Electron Forge](https://www.electronforge.io/) | 7.11.2 | Packaging y distribución |
| [@cliqz/adblocker-electron](https://github.com/ghostery/adblocker) | 1.34.0 | Motor de bloqueo de anuncios |
| [TypeScript](https://www.typescriptlang.org/) | ~4.5.5 | Tipado estático |
| Node.js | 18+ | Runtime de desarrollo |

---

## 📁 Estructura del proyecto

```
void-browser/
├── src/
│   ├── main/                    # Proceso principal (Node.js)
│   │   ├── main.ts              # Entry point, ventana y permisos
│   │   ├── adblocker.ts         # Motor de bloqueo VoidShield
│   │   ├── filter-lists.ts      # Gestión de listas de filtros
│   │   ├── privacy.ts           # Configuración de DoH, DNT, cookies y User-Agent
│   │   └── userscripts.ts       # Gestor de userscripts (inyección + persistencia)
│   ├── preload/                 # Preload seguro (contextBridge)
│   │   └── preload.ts           # APIs expuestas al renderer
│   └── renderer/                # Interfaz (React)
│       ├── App.tsx              # Componente raíz y lógica de pestañas
│       ├── renderer.tsx         # Entry point del renderer
│       ├── types.ts             # Tipos compartidos (Tab, SearchEngine, etc.)
│       ├── hooks/
│       │   ├── useHistory.ts    # Persistencia y agrupación del historial
│       │   ├── usePreferences.ts # Motor de búsqueda y preferencias
│       │   ├── usePrivacy.ts    # Lectura/escritura de configuración de privacidad
│       │   ├── usePrivacyHub.ts # Estado de cuentas conectadas (Proton, Tuta, Internxt)
│       │   ├── useSitePermissions.ts # Gestión de permisos por sitio
│       │   └── useAdblockConfig.ts   # Configuración avanzada de VoidShield
│       ├── components/
│       │   ├── Navbar.tsx       # Barra de direcciones y controles
│       │   ├── Tabs.tsx         # Pestañas superiores
│       │   ├── Content.tsx      # Contenedor de webviews
│       │   ├── NewTabPage.tsx   # Pantalla principal con Speed Dial y Privacy Hub
│       │   ├── PrivacyHub.tsx   # Panel de servicios de privacidad
│       │   ├── SettingsPage.tsx # Panel de ajustes
│       │   ├── SearchEnginePicker.tsx # Selector inicial de buscador
│       │   ├── SecurityPopup.tsx      # Popup del candado HTTPS/HTTP
│       │   ├── VoidShieldPopup.tsx    # Estadísticas del bloqueador
│       │   ├── HistoryPopup.tsx       # Panel de historial
│       │   ├── UserscriptManager.tsx  # Gestor de userscripts
│       │   └── PopupPortal.tsx        # Utilidad para portales React
│       └── styles/
│           ├── App.css
│           ├── Content.css
│           └── ...
├── assets/
│   └── icon.ico
├── public/
│   └── logo.png
├── .github/
│   └── workflows/
│       └── release.yml          # CI/CD multiplataforma
├── forge.config.ts              # Configuración de Electron Forge
├── vite.main.config.ts          # Vite para proceso main
├── vite.preload.config.ts       # Vite para preload
├── vite.renderer.config.ts      # Vite para renderer
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔄 Actualizaciones

Actualmente, las actualizaciones de Void Browser son **manuales**: cada release genera instaladores para Windows, macOS y Linux en [GitHub Releases](https://github.com/Martin08ABM/void-browser/releases).

Electron Forge soporta auto-updaters nativos (vía `electron-forge/maker-squirrel` con `Update.exe` en Windows, o `electron-updater` multiplataforma), pero **aún no están configurados**. Esto está en el roadmap para futuras versiones.

Para actualizar ahora mismo, descarga el instalador de la última release y ejecútalo sobre tu instalación actual.

---

## 🔮 Próximas funcionalidades

- **Bookmarks / Favoritos** — guardar y organizar sitios web.
- **Gestor de descargas** — panel para ver y controlar descargas activas e históricas.
- **Modo lectura / reader mode** — simplificación del contenido de artículos para lectura sin distracciones.
- **Sincronización cifrada** — opción de sincronizar preferencias y bookmarks entre dispositivos (zero-knowledge).
- **Auto-updater** — actualizaciones automáticas sin intervención manual.
- **Protección anti-fingerprinting** — hardening adicional contra técnicas de fingerprinting de canvas, fonts, etc.

Consulta el [tablero de Issues](https://github.com/Martin08ABM/void-browser/issues) y [Projects](https://github.com/Martin08ABM/void-browser/projects) para ver el estado detallado de cada item.

---

## ⚠️ Funcionalidades no incluidas

Para mantener el proyecto minimalista, seguro y mantenible, algunas funcionalidades comunes en navegadores grandes están **ausentes por diseño**:

- **Gestor de contraseñas integrado** — por privacidad, recomendamos usar gestores dedicados como Bitwarden, KeePassXC o Proton Pass. Puedes instalarlos como web app o extensión en tu navegador principal.
- **Bookmarks / Favoritos** — aún no implementados. Se añadirán en una versión futura.
- **Extensiones Chrome nativas** — Electron no soporta de forma estable el ecosistema de extensiones de la Chrome Web Store. En su lugar, Void Browser ofrece el **gestor de userscripts blindado** como alternativa privada, segura y funcional.
- **Autocompletado de formularios** — desactivado por defecto para evitar almacenamiento local de datos sensibles.

---

## 🚀 Cómo ejecutar

### Requisitos

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (recomendado)

### Instalación

```bash
pnpm install
```

### Modo desarrollo

```bash
pnpm start
```

### Empaquetar

```bash
pnpm package
```

### Crear distribuible

```bash
pnpm make
```

---

## 🤝 Guía de contribución

¡Las contribuciones son bienvenidas! Si quieres mejorar Void Browser:

1. **Fork** el repositorio.
2. Crea una rama con tu feature o fix: `git checkout -b feature/nombre-feature`.
3. Asegúrate de que tu código pasa el lint: `pnpm lint`.
4. Haz commit con mensajes descriptivos.
5. Abre un **Pull Request** explicando el cambio.

### Estilo de código

- TypeScript estricto.
- ESLint con configuración del proyecto (`.eslintrc.json`).
- Componentes funcionales de React con hooks.
- IPC main ↔ renderer solo a través del `preload.ts` con `contextBridge`.

### Reportar bugs

Usa [GitHub Issues](https://github.com/Martin08ABM/void-browser/issues) describiendo:
- Versión de Void Browser.
- Sistema operativo.
- Pasos para reproducir el problema.
- Comportamiento esperado vs. actual.

---

## 📄 Licencia

MIT
