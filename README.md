# Void Browser

Navegador web minimalista, rápido y orientado a la privacidad. Construido con **Electron** y **React**, pensado para ofrecer una experiencia de navegación limpia sin distracciones.

---

## ✨ Características

- **Interfaz limpia y minimalista** — diseño oscuro con tabs compactas y navbar con auto-hide.
- **Navegación por pestañas** — crea, cierra y cambia entre pestañas fácilmente.
- **VoidShield (adblocker nativo)** — bloqueo de anuncios y trackers integrado, basado en el mismo motor que usa Brave. Utiliza las listas **EasyList** y **EasyPrivacy**.
- **Seguridad visual** — indicador de candado que muestra si la conexión es segura (HTTPS) o insegura (HTTP).
- **Gestión de permisos** — control de permisos por sitio (acceso a cámara, micrófono, ubicación, notificaciones, etc.).
- **Selector de motor de búsqueda** — elige tu buscador preferido al iniciar por primera vez: Google, DuckDuckGo, Bing, Yandex, Ecosia, Qwant o Kagi.
- **Atajos de teclado completos** — navega sin usar el ratón.

---

## ⌨️ Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl + T` | Abrir nueva pestaña |
| `Ctrl + W` | Cerrar pestaña activa |
| `Ctrl + Shift + T` | Reabrir la última pestaña cerrada (hasta 10 en historial) |
| `Ctrl + R` | Recargar pestaña activa |
| `Ctrl + Alt + B` | Página anterior (back) |
| `Ctrl + Alt + A` | Página siguiente (forward) |
| `Ctrl + Alt + H` | Mostrar / ocultar barra de navegación |

---

## 🛡️ VoidShield — Bloqueador integrado

VoidShield bloquea anuncios y trackers antes de que lleguen al renderer, usando `@cliqz/adblocker-electron`, un motor nativo de alto rendimiento. Esto significa:

- **Carga de páginas más rápida** (menos requests innecesarios).
- **Menor consumo de datos**.
- **Privacidad reforzada** — los trackers de terceros se bloquean por defecto.

El contador de elementos bloqueados se muestra en la navbar al hacer clic en el icono de VoidShield.

---

## 🔒 Permisos y privacidad

- Las páginas no pueden acceder a cámara, micrófono, ubicación ni notificaciones sin que el usuario lo autorice explícitamente.
- Las decisiones de permisos se guardan por **origen** (dominio).
- Por defecto, solo se permite `fullscreen`; todo lo demás se niega silenciosamente.
- Puedes limpiar los permisos de un sitio desde el popup del candado de seguridad.

---

## 🎨 Paleta de colores

| Color | Uso |
|---|---|
| `#0A0A0A` | Fondo principal |
| `#5E6572` | Superficies (tabs, navbar) |
| `#7D98A1` | Acento |
| `#4E9E7A` | HTTPS seguro (candado cerrado) |
| `#C75B5B` | HTTP inseguro (candado abierto) |
| `#EEF1EF` | Texto principal |
| `#A9B4C2` | Texto secundario |

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

## 📁 Estructura del proyecto

```
void-browser/
├── src/
│   ├── main/           # Proceso principal (Node.js)
│   │   ├── main.ts     # Entry point y ventana principal
│   │   └── adblocker.ts # Motor de bloqueo VoidShield
│   ├── preload/        # Preload seguro (contextBridge)
│   │   └── preload.ts
│   └── renderer/       # Interfaz (React)
│       ├── App.tsx
│       ├── renderer.tsx
│       ├── hooks/
│       └── components/
│           ├── Navbar.tsx
│           ├── Tabs.tsx
│           ├── Content.tsx
│           ├── SettingsPage.tsx
│           ├── SearchEnginePicker.tsx
│           ├── SecurityPopup.tsx
│           └── VoidShieldPopup.tsx
├── forge.config.ts     # Configuración de Electron Forge
├── vite.*.config.ts    # Configuraciones de Vite
└── package.json
```

---

## 🛠️ Stack tecnológico

| Tecnología | Uso |
|---|---|
| [Electron](https://www.electronjs.org/) | Framework de escritorio |
| [React](https://react.dev/) | UI del renderer |
| [Vite](https://vitejs.dev/) | Bundler y dev server |
| [Electron Forge](https://www.electronforge.io/) | Packaging y distribución |
| [@cliqz/adblocker-electron](https://github.com/ghostery/adblocker) | Motor de bloqueo de anuncios |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |

---

## 📄 Licencia

MIT
