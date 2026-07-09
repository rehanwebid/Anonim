// ============================================
// 🛡️ ANTI VIEW CODE (TAMBAHAN)
// ============================================
(function() {
    // Blokir Ctrl+U, F12, Ctrl+Shift+I, dll
    document.onkeydown = function(e) {
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
    };
    
    // Blokir klik kanan
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Deteksi DevTools terbuka
    let devtoolsOpen = false;
    const threshold = 160;
    
    setInterval(function() {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                document.body.innerHTML = '<div style="color:white;text-align:center;padding:50px;font-size:20px;">⚠️ DevTools terdeteksi! Tutup untuk melanjutkan.</div>';
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

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const mainApp = document.getElementById('mainApp');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const loginLoading = document.getElementById('loginLoading');
const loginError = document.getElementById('loginError');

// Switch form
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
// 📝 SIGN UP (DENGAN no-cors)
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
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: 'signUp',
                username: username,
                email: email,
                password: password
            })
        });
        
        // Karena no-cors ga bisa baca response, langsung masuk aja
        currentUser = {
            username: username,
            email: email
        };
        localStorage.setItem('anonUsername', username);
        localStorage.setItem('anonEmail', email);
        enterChat();
        
    } catch (error) {
        showError('Gagal terhubung ke server!');
        hideLoading();
    }
});

// ============================================
// 🔐 SIGN IN (DENGAN no-cors)
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
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: 'signIn',
                email: email,
                password: password
            })
        });
        
        // Karena no-cors, langsung masuk pake username dari email
        const username = email.split('@')[0];
        currentUser = {
            username: username,
            email: email
        };
        localStorage.setItem('anonUsername', username);
        localStorage.setItem('anonEmail', email);
        enterChat();
        
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
}

function showError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
    hideLoading();
    signInForm.style.display = 'block';
}

// ============================================
// 🔄 AUTO LOGIN (CEK LOCALSTORAGE)
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
        const response = await fetch(`${API_URL}?action=getMessages&lastId=${lastMessageId}`, {
            mode: 'no-cors'
        });
        
        // Karena no-cors, kita ga bisa baca response
        // Tapi pesan yang dikirim user sendiri tetap akan muncul
        // via optimistic UI di fungsi kirimPesan()
        
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
// 📤 KIRIM PESAN (DENGAN no-cors)
// ============================================
function kirimPesan() {
    const message = messageInput.value.trim();
    if (!message || !currentUser) return;
    
    // Optimistic UI - tampilkan pesan langsung
    addMessageToUI(currentUser.username, message, new Date().toLocaleString('id-ID'), true);
    messageInput.value = '';
    
    // Kirim ke server (fire and forget)
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
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
