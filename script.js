// ============================================
// 👤 USER IDENTITY (User1, User2, User3...)
// ============================================
let username = localStorage.getItem('anonUsername');
let userNumber = localStorage.getItem('anonNumber');
let userColor = localStorage.getItem('anonColor');

const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
];

async function initUser() {
    if (!username || !userNumber || !userColor) {
        try {
            const response = await fetch(API_URL + '?action=getUserNumber');
            const data = await response.json();
            
            if (data.status === 'success') {
                userNumber = data.userCount + 1;
                username = 'User' + userNumber;
                userColor = colorPalette[(data.userCount) % colorPalette.length];
                
                localStorage.setItem('anonUsername', username);
                localStorage.setItem('anonNumber', userNumber);
                localStorage.setItem('anonColor', userColor);
            }
        } catch (error) {
            console.error('Error:', error);
            userNumber = Math.floor(Math.random() * 9999);
            username = 'User' + userNumber;
            userColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            localStorage.setItem('anonUsername', username);
            localStorage.setItem('anonNumber', userNumber);
            localStorage.setItem('anonColor', userColor);
        }
    }
}

// Panggil initUser saat load
initUser();

// ============================================
// TRACKING
// ============================================
let lastMessageId = 0;
let renderedMessageIds = new Set();
let isFirstLoad = true;

// ============================================
// DOM ELEMENTS
// ============================================
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const onlineText = document.getElementById('onlineText');
const onlineDot = document.getElementById('onlineDot');
const hidePopup = document.getElementById('hidePopup');
const detectedText = document.getElementById('detectedText');

// ============================================
// SENSITIVE DETECTION
// ============================================
let currentSensitiveText = '';
let sensitiveRange = null;

// ============================================
// 🔄 POLLING
// ============================================
setInterval(loadMessages, 1000);
loadMessages();

async function loadMessages() {
    try {
        const response = await fetch(`${API_URL}?action=getMessages&lastId=${lastMessageId}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            if (isFirstLoad) {
                chatArea.innerHTML = '';
                renderedMessageIds.clear();
                isFirstLoad = false;
            }
            
            updateOnlineIndicator(data.onlineCount || 0);
            
            if (data.messages && data.messages.length > 0) {
                let hasNewMessage = false;
                
                data.messages.forEach(msg => {
                    if (msg.id > lastMessageId && !renderedMessageIds.has(msg.id)) {
                        const isMe = (msg.sender === username);
                        addMessageToUI(msg.sender, msg.message, msg.timestamp, isMe);
                        renderedMessageIds.add(msg.id);
                        lastMessageId = msg.id;
                        hasNewMessage = true;
                    }
                });
                
                if (hasNewMessage) {
                    chatArea.scrollTop = chatArea.scrollHeight;
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        if (isFirstLoad) {
            chatArea.innerHTML = '<div class="empty-state" style="color: #ff4444;">⚠️ Gagal terhubung</div>';
        }
    }
}

function updateOnlineIndicator(count) {
    onlineText.textContent = count + ' Online';
    if (count > 0) {
        onlineDot.classList.add('active');
    } else {
        onlineDot.classList.remove('active');
    }
}

// ============================================
// 🔍 DETEKSI NOMOR & LINK
// ============================================
function deteksiSensitif() {
    const text = messageInput.value;
    const cursorPos = messageInput.selectionStart;
    
    const phoneRegex = /(\+?62|0)8[1-9][0-9]{6,11}/g;
    const linkRegex = /https?:\/\/[^\s]+/g;
    
    let match;
    let found = false;
    
    while ((match = phoneRegex.exec(text)) !== null) {
        if (cursorPos >= match.index && cursorPos <= match.index + match[0].length) {
            currentSensitiveText = match[0];
            sensitiveRange = { start: match.index, end: match.index + match[0].length };
            showPopup(match[0]);
            found = true;
            break;
        }
    }
    
    if (!found) {
        linkRegex.lastIndex = 0;
        while ((match = linkRegex.exec(text)) !== null) {
            if (cursorPos >= match.index && cursorPos <= match.index + match[0].length) {
                currentSensitiveText = match[0];
                sensitiveRange = { start: match.index, end: match.index + match[0].length };
                showPopup(match[0]);
                found = true;
                break;
            }
        }
    }
    
    if (!found) {
        hidePopupFn();
    }
}

function showPopup(text) {
    detectedText.textContent = text.length > 20 ? text.substring(0, 20) + '...' : text;
    hidePopup.classList.add('show');
}

function hidePopupFn() {
    hidePopup.classList.remove('show');
    currentSensitiveText = '';
    sensitiveRange = null;
}

function batalSamarkan() {
    hidePopupFn();
    messageInput.focus();
}

// ============================================
// 🔒 SAMARKAN
// ============================================
function samarkan() {
    if (!currentSensitiveText || !sensitiveRange) return;
    
    const text = messageInput.value;
    const before = text.substring(0, sensitiveRange.start);
    const after = text.substring(sensitiveRange.end);
    
    const encrypted = '[[HIDDEN:' + btoa(currentSensitiveText) + ']]';
    messageInput.value = before + encrypted + after;
    
    hidePopupFn();
    messageInput.focus();
}

// ============================================
// 📤 KIRIM PESAN
// ============================================
function kirimPesan() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    messageInput.value = '';
    
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'sendMessage',
            sender: username,
            message: message,
            color: userColor
        })
    }).catch(error => console.error('Error:', error));
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        kirimPesan();
    }
}

// ============================================
// 🎨 RENDER PESAN
// ============================================
function addMessageToUI(sender, message, timestamp, isMe) {
    const placeholder = chatArea.querySelector('.empty-state');
    if (placeholder) placeholder.remove();
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper ' + (isMe ? 'me' : 'other');
    
    // Tampilkan username apa adanya (User1, User2, dst)
    const displayNumber = sender;
    
    const parsedMessage = parseHiddenText(message);
    
    wrapper.innerHTML = `
        <div class="user-number">${escapeHtml(displayNumber)}</div>
        <div class="bubble">${parsedMessage}</div>
        <div class="time">${formatTime(timestamp)}</div>
    `;
    
    // Click to reveal
    wrapper.querySelectorAll('.hidden-text').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('revealed');
            if (this.classList.contains('revealed')) {
                this.textContent = this.dataset.original;
            } else {
                this.textContent = '••••••••';
            }
        });
    });
    
    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// ============================================
// 🔐 PARSE HIDDEN TEXT
// ============================================
function parseHiddenText(text) {
    const regex = /\[\[HIDDEN:(.*?)\]\]/g;
    return text.replace(regex, (match, encoded) => {
        try {
            const original = atob(encoded);
            return `<span class="hidden-text" data-original="${escapeHtml(original)}">••••••••</span>`;
        } catch(e) {
            return match;
        }
    });
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    try {
        const parts = timestamp.split(' ');
        if (parts.length >= 2) return parts[1].substring(0, 5);
    } catch(e) {}
    return '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// 🛡️ ANTI-SCREENSHOT (DASAR)
// ============================================
document.addEventListener('keydown', function(e) {
    if (e.key === 'PrintScreen') {
        document.body.style.opacity = '0.1';
        setTimeout(() => { document.body.style.opacity = '1'; }, 500);
    }
});

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        chatArea.style.filter = 'blur(10px)';
    } else {
        chatArea.style.filter = 'none';
    }
});
