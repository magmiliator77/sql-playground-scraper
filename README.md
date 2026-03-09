# SQL Playground Scraper 🕷️📄

Una herramienta automatizada construida con **Node.js** y **Puppeteer** para extraer y recopilar en formato *Markdown* (.md) los ejercicios de la plataforma [sql-playground.com](https://sql-playground.com/).

Dado que en *SQL Playground* los ejercicios están separados página por página, esta herramienta navega automáticamente por la web, busca la base de datos y la sección seleccionadas, y guarda el planteamiento de cada ejercicio para que puedas estudiarlos sin conexión o consultarlos más fácilmente sin tener que ir pulsando "Siguiente" todo el rato.

---

## ⚙️ ¿Cómo funciona internamente?

La aplicación se compone de **dos partes principales**:

### 1. El Servidor y la Interfaz Web (`server.js` y `public/`)
La interfaz proporciona un formulario muy sencillo. Cuando el usuario hace clic en "Comenzar Extracción", la página web envía una petición `POST` al servidor backend en Node.js.

Para evitar que el usuario se quede esperando frente a una pantalla de carga estática durante los minutos que tarda el scraping, la comunicación entre el cliente (interfaz) y el servidor (backend) se realiza mediante **Server-Sent Events (SSE)**.
Esto permite al servidor enviar de vuelta mensajes y "logs" *"en tiempo real"* a la web (Ej: *"Entrando en la sección..."*, *"Extrayendo Ejercicio 2..."*).

### 2. El Motor de Extracción o "Scraper" (`scraper.js` / Puppeteer)
Aquí ocurre la *magia negra* real. Cuando el servidor recibe la petición, invoca a **Puppeteer**. 
Puppeteer es una librería que permite controlar un navegador web real (Google Chrome/Chromium) mediante código en vez de clics humanos.

Este es el proceso exacto que sigue la máquina por detrás:

1. **Abre un navegador oculto**: Lanza una instancia de Chrome (modo `headless`, es decir, sin interfaz gráfica).
2. **Navega a la web**: Accede a `https://sql-playground.com/`.
3. **Navegación automática**:
   - Lee el menú superior (`.navbar-nav`) y hace un "clic" en el nombre de la *Base de Datos* solicitada (Ej: *Jardinería*).
   - Lee el menú lateral (`.sidebar-heading`) y despliega la *Sección* (Ej: *Consultas resumen*).
   - Busca en el menú lateral y hace clic en "Ejercicio 1" para empezar en el inicio de la lista.
4. **Bucle de recolección**:
   - Se sitúa en el párrafo con el texto del ejercicio (`.card-text`).
   - Copia ese texto.
   - Lo añade a una variable de texto con formato Markdown, poniéndole un título (leyendo el *breadcrumb* o rastro de migas superior para saber en qué ejercicio estamos).
   - Busca el botón **"Siguiente"** y lo clica.
   - Vuelve a copiar el nuevo texto. Repite este proceso hasta que el botón "Siguiente" ya no aparece o detecta que la sección en el menú superior ha cambiado.
5. **Genera el archivo**: Al terminar, vuelca todo ese texto guardado a un archivo `.md` (Ej: `jardinería_consultas_resumen_ejercicios.md`).
6. **Descarga**: El backend envía la orden al frontend de descargar automáticamente este archivo.
7. **Cierre**: Se cierra Chrome para liberar memoria RAM del servidor.

---

## 🚀 Despliegue en Render (O similares)

Dado que Puppeteer necesita descargar todo un navegador Chrome dentro del servidor donde se ejecuta, el proyecto incluye ciertos archivos para evitar que la aplicación "pete" al no encontrar Chrome en servicios en la nube gratuitos como **Render**:

- `.puppeteerrc.cjs`: Sobrescribe la ruta de caché por defecto para obligar a Puppeteer a guardar Chrome *dentro de la carpeta del proyecto*.
- `render-build.sh`: Un script que obliga a descargar los binarios y dependencias completas del entorno gráfico (`npx puppeteer browsers install chrome`) durante la fase de *Build*.
- En `package.json`, el comando `npm run build` llama a dicho script en Bash.

<details>
<summary><b>Para ejecutarlo 100% en local (Windows/Mac)</b></summary>
<br>

Si clonas este repositorio en tu ordenador para ejecutarlo por ti mismo:

1. `npm install`
2. `npx puppeteer browsers install chrome` (Obligatorio para descargar el navegador la primera vez).
3. `node server.js`
4. Abre `http://localhost:3000` en tu navegador.

En local, puedes ir a `scraper.js` y cambiar `headless: headless` por `headless: false`. Si lo haces, verás cómo se abre Chrome y empieza a navegar por los ejercicios copiando los enunciados de cada uno.
</details>
