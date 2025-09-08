CIAO CIAO MX – Sistema de Recibos (Refactor)

Resumen
- Reestructuración modular del proyecto original `ciaociao-recibos`.
- 100% estático con ES Modules, sin servidor Node necesario.
- Misma experiencia visual y logos; código simplificado y organizado.

Demo
- Producción (GitHub Pages): https://sittjoe.github.io/ciaociao-recibos-refactor/

Requisitos
- Navegador moderno (soporte ES Modules)
- Python 3 (opcional) para servir archivos estáticos

Inicio rápido
- Opción A – Abrir `index.html` directamente en el navegador.
- Opción B – Servir estático (recomendado):
  - `cd ciaociao-recibos-work/refactor`
  - `python3 -m http.server 8080`
  - Abrir http://localhost:8080

Estructura
- `index.html`     Pantalla de selección de modo
- `receipt/`       Vista premium de recibos
- `src/`           Código modular (home y recibos)
- `assets/`        Recursos estáticos (logos, íconos)

Scripts útiles
- `npm run start`  Servidor estático simple en el puerto 8080
- `npm run lint`   Revisión rápida con ESLint (no bloqueante)
- `npm run format` Formatea con Prettier

Despliegue en GitHub Pages (sin Actions)
- En GitHub → Settings → Pages
- Build and deployment → Source: "Deploy from a branch"
- Branch: `main` y Folder: `/ (root)` → Save
- Espera 1–2 min y abre la URL indicada (normalmente:
  `https://<tu-usuario>.github.io/ciaociao-recibos-refactor/`)

Notas
- Guardado local con `localStorage` (sin backend requerido).
- Generación de PDF usando `html2canvas` + `jsPDF` vía CDN.
- Sanitización básica de inputs contentEditable.
