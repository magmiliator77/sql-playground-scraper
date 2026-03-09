const express = require('express');
const path = require('path');
const { scrapeExercises } = require('./scraper');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/api/scrape', async (req, res) => {
    // SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { databaseName, sectionName, headless } = req.body;

    if (!databaseName || !sectionName) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Faltan parámetros' })}\n\n`);
        return res.end();
    }

    const sendLog = (message) => {
        res.write(`data: ${JSON.stringify({ type: 'log', message })}\n\n`);
    };

    try {
        sendLog(`Inicializando extracción web para ${databaseName} - ${sectionName}...`);
        
        const filename = await scrapeExercises({ 
            databaseName, 
            sectionName, 
            onProgress: sendLog,
            // Override headless via API if needed, otherwise default to true for web
            headless: headless !== undefined ? headless : true 
        });

        res.write(`data: ${JSON.stringify({ type: 'success', message: '¡Extracción completada!', filename })}\n\n`);
        res.end();
    } catch (error) {
        sendLog(`ERROR FATAL: ${error.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
});

app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // VERY BASIC security check to prevent directory traversal
    if (filename.includes('/') || filename.includes('\\')) {
        return res.status(403).send('Invalid filename');
    }
    const filepath = path.join(__dirname, filename);
    res.download(filepath);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
