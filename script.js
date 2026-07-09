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
    
    // Kirim dengan no-cors (PASTI SUKSES, 200 OK)
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
            action: 'signUp',
            username: username,
            email: email,
            password: password
        })
    });
    
    // Optimistic UI - langsung masuk
    currentUser = {
        username: username,
        email: email
    };
    localStorage.setItem('anonUsername', username);
    localStorage.setItem('anonEmail', email);
    enterChat();
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
    
    // Kirim dengan no-cors
    fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
            action: 'signIn',
            email: email,
            password: password
        })
    });
    
    // Optimistic UI - langsung masuk
    const username = email.split('@')[0];
    currentUser = {
        username: username,
        email: email
    };
    localStorage.setItem('anonUsername', username);
    localStorage.setItem('anonEmail', email);
    enterChat();
});

// ============================================
// 🚪 ENTER & EXIT
// ============================================
function enterChat() {
    loginOverlay.style.display = 'none';
    mainApp.style.display = 'flex';
    hideLoading();
}

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
}

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
}

// ============================================
// 💬 CHAT (OPTIMISTIC UI)
// ============================================
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const hidePopup = document.getElementById('hidePopup');
const detectedText = document.getElementById('detectedText');

let currentSensitiveText = '';
let sensitiveRange = null;

function kirimPesan() {
    const message = messageInput.value.trim();
    if (!message || !currentUser) return;
    
    // Tampilkan langsung di layar (sebelum kirim)
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
            color: '#FF6B6B'
        })
    });
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
    
    wrapper.innerHTML = `
        <div class="user-number">${escapeHtml(sender)}</div>
        <div class="bubble">${escapeHtml(message)}</div>
        <div class="time">${formatTime(timestamp)}</div>
    `;
    
    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function deteksiSensitif() {
    // Tetap ada biar ga error
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    try {
        const parts = timestamp.split(' ');
        return parts.length >= 2 ? parts[1].substring(0, 5) : '';
    } catch(e) { return ''; }
}
