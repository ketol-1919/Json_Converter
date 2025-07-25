const dropArea = document.getElementById('drop-area');
const convertButton = document.getElementById('convert-button');
const downloadLinkContainer = document.getElementById('download-link-container');

let fileContent = '';

dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    dropArea.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
            fileContent = e.target.result;
            convertButton.disabled = false;
            dropArea.textContent = `ファイル: ${file.name}`;
        };
        reader.readAsText(file);
    }
});

convertButton.addEventListener('click', () => {
    if (!fileContent) return;

    const lines = fileContent.split(/\r\n|\n/);
    const scenario = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        // セリフ以外の行（例：「【...】」や「===」で始まるヘッダー）は無視する
        if (trimmedLine && trimmedLine.includes(':') && !trimmedLine.startsWith('【') && !trimmedLine.startsWith('=')) {
            const [speaker, ...textParts] = trimmedLine.split(':');
            const text = textParts.join(':').trim() + '　</s>';
            scenario.push({ speaker: speaker.trim(), text });
        }
    }

    const json = { scenario };
    const jsonString = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'scenario.json';
    downloadLink.textContent = 'JSONをダウンロード';

    downloadLinkContainer.innerHTML = '';
    downloadLinkContainer.appendChild(downloadLink);
});