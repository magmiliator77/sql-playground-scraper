document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('scraperForm');
    const startBtn = document.getElementById('startBtn');
    const terminal = document.getElementById('terminal');
    const actionsContainer = document.getElementById('actions');
    const downloadBtn = document.getElementById('downloadBtn');
    const btnText = startBtn.querySelector('span');
    const loader = startBtn.querySelector('.loader-spinner');

    let eventSource = null;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const databaseName = document.getElementById('dbName').value.trim();
        const sectionName = document.getElementById('sectionName').value.trim();
        const showBrowser = document.getElementById('showBrowser').checked;

        if (!databaseName || !sectionName) return;

        // Reset UI
        terminal.innerHTML = '';
        actionsContainer.style.display = 'none';
        setLoadingState(true);

        try {
            // Start the extraction process via API
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    databaseName, 
                    sectionName, 
                    headless: !showBrowser // if showBrowser is true, headless is false
                })
            });

            if (!response.ok) throw new Error('Error de red al iniciar');

            // Set up SSE listener using the fetch body stream reader
            // (Standard EventSource only supports GET, so we parse the fetch stream manually)
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            readStream(reader, decoder);

        } catch (error) {
            appendLog(`Error: ${error.message}`, 'error');
            setLoadingState(false);
        }
    });

    async function readStream(reader, decoder) {
        let buffer = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE chunks are separated by double newline
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop(); // Keep the last incomplete chunk in the buffer
            
            for (const chunk of chunks) {
                if (chunk.startsWith('data: ')) {
                    const dataStr = chunk.substring(6);
                    try {
                        const data = JSON.parse(dataStr);
                        handleServerEvent(data);
                    } catch (e) {
                        console.error('Error parsing SSE data:', e, dataStr);
                    }
                }
            }
        }
    }

    function handleServerEvent(data) {
        switch(data.type) {
            case 'log':
                appendLog(data.message);
                break;
            case 'error':
                appendLog(data.message, 'error');
                setLoadingState(false);
                break;
            case 'success':
                appendLog(data.message, 'success');
                showDownloadLink(data.filename);
                setLoadingState(false);
                break;
        }
    }

    function appendLog(message, type = '') {
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = message;
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight; // Auto scroll
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            startBtn.disabled = true;
            btnText.textContent = 'Extrayendo...';
            loader.style.display = 'block';
        } else {
            startBtn.disabled = false;
            btnText.textContent = 'Iniciar Extracción';
            loader.style.display = 'none';
        }
    }

    function showDownloadLink(filename) {
        actionsContainer.style.display = 'block';
        downloadBtn.href = `/api/download/${filename}`;
    }
});
