const dropArea = document.getElementById('drop-area');
const convertButton = document.getElementById('convert-button');
const downloadLinkContainer = document.getElementById('download-link-container');

// Dictionary elements
const originalStringInput = document.getElementById('original-string');
const replacementStringInput = document.getElementById('replacement-string');
const addToDictionaryButton = document.getElementById('add-to-dictionary');
const dictionaryList = document.getElementById('dictionary-list');

let fileContent = '';
let dictionary = []; // Stores dictionary entries

// --- Dictionary Functions ---

function loadDictionary() {
    const savedDictionary = localStorage.getItem('dictionary');
    if (savedDictionary) {
        dictionary = JSON.parse(savedDictionary);
    }
    renderDictionary();
}

function saveDictionary() {
    localStorage.setItem('dictionary', JSON.stringify(dictionary));
}

function renderDictionary() {
    dictionaryList.innerHTML = '';
    if (dictionary.length === 0) {
        const li = document.createElement('li');
        li.textContent = '辞書エントリはまだありません。';
        dictionaryList.appendChild(li);
        return;
    }
    dictionary.forEach((entry, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${entry.original} → ${entry.replacement}</span>
            <button data-index="${index}">削除</button>
        `;
        dictionaryList.appendChild(li);
    });
}

function addOrUpdateDictionaryEntry() {
    const original = originalStringInput.value.trim();
    const replacement = replacementStringInput.value.trim();

    if (!original || !replacement) {
        alert('元の文字列と変換後のひらがなを入力してください。');
        return;
    }

    // Check if entry already exists and update
    const existingIndex = dictionary.findIndex(entry => entry.original === original);
    if (existingIndex > -1) {
        dictionary[existingIndex].replacement = replacement;
    } else {
        dictionary.push({ original, replacement });
    }

    saveDictionary();
    renderDictionary();
    originalStringInput.value = '';
    replacementStringInput.value = '';
}

function deleteDictionaryEntry(index) {
    dictionary.splice(index, 1);
    saveDictionary();
    renderDictionary();
}

function applyDictionary(text) {
    let processedText = text;
    dictionary.forEach(entry => {
        // 正規表現でグローバルに置換するためにRegExpオブジェクトを使用
        // エスケープが必要な特殊文字を考慮
        if (entry.original.length === 0) { return; }
        const escapedOriginal = entry.original.replace(/[.*+?^${}()|[\\]]/g, '\\$&');
        const regex = new RegExp(escapedOriginal, 'g');
        processedText = processedText.replace(regex, entry.replacement);
    });
    return processedText;
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', loadDictionary); // Load dictionary on page load

addToDictionaryButton.addEventListener('click', addOrUpdateDictionaryEntry);

dictionaryList.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON' && event.target.textContent === '削除') {
        const index = parseInt(event.target.dataset.index);
        if (!isNaN(index)) {
            deleteDictionaryEntry(index);
        }
    }
});

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

    console.log('File dropped:', file); // ドロップされたファイルオブジェクトをログ出力

    if (!file) {
        console.log('No file found in drop event.');
        dropArea.textContent = "ファイルをドロップしてください";
        convertButton.disabled = true;
        return;
    }

    dropArea.textContent = `ファイル: ${file.name}`;
    downloadLinkContainer.innerHTML = ''; // 以前のダウンロードリンクをクリア

    if (file.name.endsWith('.docx')) {
        console.log('Detected DOCX file.');
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('FileReader for DOCX loaded.');
            mammoth.extractRawText({ arrayBuffer: e.target.result })
                .then(result => {
                    fileContent = result.value;
                    convertButton.disabled = false;
                    console.log('DOCX converted to text (first 100 chars):', fileContent.substring(0, 100) + '...');
                })
                .catch(err => {
                    console.error("DOCXの読み込みまたは変換に失敗:", err);
                    dropArea.textContent = "DOCXファイルの読み込みまたは変換に失敗しました";
                    convertButton.disabled = true;
                });
        };
        reader.onerror = (e) => {
            console.error('FileReader error for DOCX:', e);
            dropArea.textContent = "ファイルの読み込み中にエラーが発生しました";
            convertButton.disabled = true;
        };
        reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.txt')) {
        console.log('Detected TXT file.');
        const reader = new FileReader();
        reader.onload = (e) => {
            fileContent = e.target.result;
            convertButton.disabled = false;
            console.log('TXT file loaded (first 100 chars):', fileContent.substring(0, 100) + '...');
        };
        reader.onerror = (e) => {
            console.error('FileReader error for TXT:', e);
            dropArea.textContent = "ファイルの読み込み中にエラーが発生しました";
            convertButton.disabled = true;
        };
        reader.readAsText(file);
    } else {
        dropArea.textContent = "対応していないファイル形式です (.txtまたは.docx)";
        convertButton.disabled = true;
        console.log('Unsupported file type:', file.name);
    }
});

convertButton.addEventListener('click', () => {
    if (!fileContent) return;

    console.log("--- Raw Content from File ---");
    console.log(fileContent);

    // Apply dictionary replacements before splitting into lines
    const processedFileContent = applyDictionary(fileContent);
    console.log("--- Content after Dictionary Applied ---");
    console.log(processedFileContent);

    const lines = processedFileContent.split(/\r?\n|\r/).filter(line => line.trim() !== '');
    
    console.log("--- Split Lines ---");
    console.log(lines);

    const scenario = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        // 半角コロン「:」または全角コロン「：」を含み、かつヘッダーやタイトル行ではないものをセリフとして判定
        const isDialogue = (trimmedLine.includes(':') || trimmedLine.includes('：')) 
                            && !trimmedLine.startsWith('【') 
                            && !trimmedLine.startsWith('=')
                            && !trimmedLine.startsWith('登場人物')
                            && !trimmedLine.startsWith('『');

        if (isDialogue) {
            // 半角・全角どちらのコロンでも分割できるように正規表現を使用
            const [speaker, ...textParts] = trimmedLine.split(/[:：]/);
            const text = textParts.join(':').trim() + '　</s>'; // ここは半角コロンで結合
            scenario.push({ speaker: speaker.trim(), text });
        }
    }

    console.log("--- Parsed Scenario ---");
    console.log(scenario);

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