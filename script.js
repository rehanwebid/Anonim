// ============================================
// 🛡️ ANTI VIEW CODE
// ============================================
(function() {
    document.onkeydown = function(e) {
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
    };
    
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    let devtoolsOpen = false;
    const threshold = 160;
    
    setInterval(function() {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                document.body.innerHTML = '<div style="color:white;text-align:center;padding:50px;font-size:20px;font-family:sans-serif;">⚠️ DevTools terdeteksi! Tutup untuk melanjutkan.</div>';
            }
        } else {
            devtoolsOpen = false;
        }
    }, 1000);
})();

// ============================================
// 👤 USER SESSION
// ============================================
let currentUser = null;

const loginOverlay = document.getElementById('loginOverlay');
const mainApp = document.getElementById('mainApp');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const loginLoading = document.getElementById('loginLoading');
const loginError = document.getElementById('loginError');

document.getElementById('showSignUp').addEventListener('click', (e) => {
    e.preventDefault();
    signInForm.style.display = 'none';
    signUpForm.style.display = 'block';
    loginError.style.display = 'none';
});

document.getElementById('showSignIn').addEventListener('click', (e) => {
    e.preventDefault();
    signUpForm.style.display = 'none';
    signInForm.style.display = 'block';
    loginError.style.display = 'none';
});

// ============================================
// 📝 SIGN UP
// ============================================
signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('signUpUsername').value.trim();
    const email = document.getElementById('signUpEmail').value.trim();
    const password = document.getElementById('signUpPassword').value;
    const confirm = document.getElementById('signUpConfirm').value;
    
    if (!username || !email || !password || !confirm) {
        showError('Semua field harus diisi!');
        return;
    }
    
    if (password !== confirm) {
        showError('Password tidak cocok!');
        return;
    }
    
    if (password.length < 4) {
        showError('Password minimal 4 karakter!');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'signUp',
                username: username,
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            currentUser = {
                username: username,
                email: email
            };
            localStorage.setItem('anonUsername', username);
            localStorage.setItem('anonEmail', email);
            enterChat();
        } else {
            showError(data.message || 'Gagal mendaftar!');
            hideLoading();
        }
    } catch (error) {
        showError('Gagal terhubung ke server!');
        hideLoading();
    }
});

// ============================================
// 🔐 SIGN IN
// ============================================
signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signInEmail').value.trim();
    const password = document.getElementById('signInPassword').value;
    
    if (!email || !password) {
        showError('Semua field harus diisi!');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'signIn',
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            currentUser = {
                username: data.username,
                email: email
            };
            localStorage.setItem('anonUsername', data.username);
            localStorage.setItem('anonEmail', email);
            enterChat();
        } else {
            showError(data.message || 'Email atau password salah!');
            hideLoading();
        }
    } catch (error) {
        showError('Gagal terhubung ke server!');
        hideLoading();
    }
});

// ============================================
// 🚪 ENTER CHAT
// ============================================
function enterChat() {
    loginOverlay.style.display = 'none';
    mainApp.style.display = 'flex';
    hideLoading();
    loadMessages();
}

// ============================================
// 🚪 LOGOUT
// ============================================
function logout() {
    localStorage.removeItem('anonUsername');
    localStorage.removeItem('anonEmail');
    currentUser = null;
    mainApp.style.display = 'none';
    loginOverlay.style.display = 'flex';
    signInForm.style.display = 'block';
    signUpForm.style.display = 'none';
    document.getElementById('signInEmail').value = '';
    document.getElementById('signInPassword').value = '';
    chatArea.innerHTML = '<div class="empty-state">Belum ada pesan.<br>Jadilah yang pertama!</div>';
    lastMessageId = 0;
    renderedMessageIds.clear();
    isFirstLoad = true;
}

// ============================================
// ⏳ LOADING
// ============================================
function showLoading() {
    signInForm.style.display = 'none';
    signUpForm.style.display = 'none';
    loginLoading.style.display = 'block';
    loginError.style.display = 'none';
}

function hideLoading() {
    loginLoading.style.display = 'none';
    signInForm.style.display = 'block';
}

function showError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
    hideLoading();
    signInForm.style.display = 'block';
}

// ============================================
// 🔄 AUTO LOGIN
// ============================================
window.addEventListener('load', () => {
    const savedUsername = localStorage.getItem('anonUsername');
    const savedEmail = localStorage.getItem('anonEmail');
    
    if (savedUsername && savedEmail) {
        currentUser = {
            username: savedUsername,
            email: savedEmail
        };
        enterChat();
    }
});

// ============================================
// 💬 CHAT FUNCTIONS
// ============================================
let username = '';
let userColor = '#FF6B6B';

const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
];

let lastMessageId = 0;
let renderedMessageIds = new Set();
let isFirstLoad = true;

const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const onlineText = document.getElementById('onlineText');
const onlineDot = document.getElementById('onlineDot');
const hidePopup = document.getElementById('hidePopup');
const detectedText = document.getElementById('detectedText');

let currentSensitiveText = '';
let sensitiveRange = null;

setInterval(loadMessages, 1500);

async function loadMessages() {
    if (!currentUser) return;
    username = currentUser.username;
    
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
    }
}

function updateOnlineIndicator(count) {
    onlineText.textContent = count + ' Online';
    onlineDot.classList.toggle('active', count > 0);
}

function deteksiSensitif() {
    const text = messageInput.value;
    const cursorPos = messageInput.selectionStart;
    const phoneRegex = /(\+?62|0)8[1-9][0-9]{6,11}/g;
    const linkRegex = /https?:\/\/[^\s]+/g;
    let match, found = false;
    
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
    
    if (!found) hidePopupFn();
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

function samarkan() {
    if (!currentSensitiveText || !sensitiveRange) return;
    const text = messageInput.value;
    messageInput.value = text.substring(0, sensitiveRange.start) + 
        '[[HIDDEN:' + btoa(currentSensitiveText) + ']]' + 
        text.substring(sensitiveRange.end);
    hidePopupFn();
    messageInput.focus();
}

// ============================================
// 📤 KIRIM PESAN
// ============================================
function kirimPesan() {
    const message = messageInput.value.trim();
    if (!message || !currentUser) return;
    
    addMessageToUI(currentUser.username, message, new Date().toLocaleString('id-ID'), true);
    messageInput.value = '';
    
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
            action: 'sendMessage',
            sender: currentUser.username,
            message: message,
            color: userColor
        })
    }).catch(error => console.error('Error:', error));
}

function handleKeyPress(event) {
    if (event.key === 'Enter') kirimPesan();
}

// ============================================
// 🎨 RENDER PESAN
// ============================================
function addMessageToUI(sender, message, timestamp, isMe) {
    const placeholder = chatArea.querySelector('.empty-state');
    if (placeholder) placeholder.remove();
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper ' + (isMe ? 'me' : 'other');
    
    const parsedMessage = parseHiddenText(message);
    
    wrapper.innerHTML = `
        <div class="user-number">${escapeHtml(sender)}</div>
        <div class="bubble">${parsedMessage}</div>
        <div class="time">${formatTime(timestamp)}</div>
    `;
    
    wrapper.querySelectorAll('.hidden-text').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('revealed');
            this.textContent = this.classList.contains('revealed') ? this.dataset.original : '••••••••';
        });
    });
    
    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function parseHiddenText(text) {
    return text.replace(/\[\[HIDDEN:(.*?)\]\]/g, (match, encoded) => {
        try {
            return `<span class="hidden-text" data-original="${escapeHtml(atob(encoded))}">••••••••</span>`;
        } catch(e) { return match; }
    });
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    try {
        const parts = timestamp.split(' ');
        return parts.length >= 2 ? parts[1].substring(0, 5) : '';
    } catch(e) { return ''; }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
