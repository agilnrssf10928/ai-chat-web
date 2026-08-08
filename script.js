const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const CHAT_STORAGE_KEY = 'aiChatHistory';

// Load chat history saat halaman dibuka
function loadChatHistory() {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
        const messages = JSON.parse(saved);
        chatBox.innerHTML = ''; // Clear default message
        messages.forEach(msg => {
            displayMessage(msg.text, msg.sender);
        });
    }
}

// Display message di UI dengan support code blocks
function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // Parse code blocks
    const htmlContent = parseCodeBlocks(text);
    const codeBlockCount = (htmlContent.match(/class="code-block"/g) || []).length;
    
    // Buat container
    const container = document.createElement('div');
    container.className = 'message-content';
    
    // Kalau ada multiple code blocks, tambah Copy All button
    if (codeBlockCount > 1 && sender === 'ai') {
        const copyAllDiv = document.createElement('div');
        copyAllDiv.className = 'copy-all-container';
        copyAllDiv.innerHTML = `<button class="copy-all-btn" onclick="copyAllCode(this)">📋 Copy All Code</button>`;
        container.appendChild(copyAllDiv);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = htmlContent;
    container.appendChild(contentDiv);
    
    messageDiv.appendChild(container);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Copy all code blocks dari satu message
function copyAllCode(btnElement) {
    const messageDiv = btnElement.closest('.message-content');
    const codeBlocks = messageDiv.querySelectorAll('pre code');
    
    if (codeBlocks.length === 0) return;
    
    let allCode = '';
    codeBlocks.forEach((block, index) => {
        allCode += block.innerText;
        if (index < codeBlocks.length - 1) {
            allCode += '\n\n--- Code Block ' + (index + 2) + ' ---\n\n';
        }
    });
    
    navigator.clipboard.writeText(allCode).then(() => {
        const originalText = btnElement.textContent;
        btnElement.textContent = '✅ All Copied!';
        setTimeout(() => {
            btnElement.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

// Parse markdown code blocks ke HTML dengan copy button
function parseCodeBlocks(text) {
    let result = text;
    const codeBlocks = [];
    
    // Extract & simpan code blocks dulu
    result = result.replace(
        /`{3}(\w+)?\n([\s\S]*?)`{3}/g,
        (match, lang, code) => {
            const language = lang || 'plaintext';
            const trimmedCode = code.trim();
            const blockId = 'code-block-' + codeBlocks.length;
            
            codeBlocks.push({
                id: blockId,
                code: trimmedCode,
                lang: language
            });
            
            return `[CODE_BLOCK_${codeBlocks.length - 1}]`;
        }
    );
    
    // Escape HTML untuk text biasa
    result = result
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    // Replace code block placeholders dengan HTML
    codeBlocks.forEach((block, index) => {
        const html = `
            <div class="code-block">
                <div class="code-header">
                    <span class="code-lang">${block.lang}</span>
                    <button class="copy-btn" onclick="copyCode(this, '${block.id}')">📋 Copy</button>
                </div>
                <pre id="${block.id}"><code>${escapeHtml(block.code)}</code></pre>
            </div>
        `;
        result = result.replace(`[CODE_BLOCK_${index}]`, html);
    });
    
    // Parse inline code
    result = result.replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">$1</code>');
    
    return result;
}

// Escape HTML
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Copy code ke clipboard
function copyCode(btnElement, elementId) {
    const codeElement = document.getElementById(elementId);
    if (!codeElement) return;
    
    const text = codeElement.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btnElement.textContent;
        btnElement.textContent = '✅ Copied!';
        setTimeout(() => {
            btnElement.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

// Simpan message ke localStorage
function saveMessage(text, sender) {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY) || '[]';
    const messages = JSON.parse(saved);
    messages.push({ text, sender, timestamp: new Date().getTime() });
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
}

// Clear chat history
function clearChatHistory() {
    if (confirm('Yakin mau hapus semua chat?')) {
        localStorage.removeItem(CHAT_STORAGE_KEY);
        chatBox.innerHTML = '<div class="message ai"><p>Halo! Aku AI, tanya apapun yang mau dibantu 😊</p></div>';
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) return;

    // Tampilkan pesan user
    displayMessage(message, 'user');
    saveMessage(message, 'user');
    userInput.value = '';

    // Tampilkan loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai';
    loadingDiv.innerHTML = '<p><span class="loading"></span> AI sedang mikir...</p>';
    chatBox.appendChild(loadingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('Server error');
        }

        const data = await response.json();
        
        // Hapus loading, tampilkan reply
        loadingDiv.remove();
        displayMessage(data.reply, 'ai');
        saveMessage(data.reply, 'ai');

    } catch (error) {
        loadingDiv.remove();
        const errorMsg = 'Maaf, terjadi error. Coba lagi nanti.';
        displayMessage(errorMsg, 'ai');
        saveMessage(errorMsg, 'ai');
        console.error('Error:', error);
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Load chat saat halaman dibuka
window.addEventListener('DOMContentLoaded', loadChatHistory);