const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Cambia la ubicación de la caché de Puppeteer
  // para que se guarde en la carpeta del proyecto.
  // Esto es necesario para que funcione correctamente en plataformas como Render.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
