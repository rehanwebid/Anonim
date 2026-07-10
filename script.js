// ============================================
// 👤 USER
// ============================================
let currentUser = null;
let anonymousName = '';

// Firebase references (diisi setelah Firebase siap)
let db, auth, provider;
let ref, push, onChildAdded, set, get, serverTimestamp;
let signInWithPopup, onAuthStateChanged, signOut;

// DOM
const loginOverlay = document.getElementById('loginOverlay');
const mainApp = document.getElementById('mainApp');
const loginLoading = document.getElementById('loginLoading');
const loginError = document.getElementById('loginError');
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const onlineText = document.getElementById('onlineText');
const onlineDot = document.getElementById('onlineDot');
const hidePopup = document.getElementById('hidePopup');
const detectedText = document.getElementById('detectedText');

// Sensitive detection
let currentSensitiveText = '';
let sensitiveRange = null;

// ============================================
// ⏳ TUNGGU FIREBASE SIAP
// ============================================
function waitForFirebase(callback) {
    if (window.auth && window.db) {
        // Assign Firebase functions
        db = window.db;
        auth = window.auth;
        provider = window.provider;
        ref = window.ref;
        push = window.push;
        onChildAdded = window.onChildAdded;
        set = window.set;
        get = window.get;
        serverTimestamp = window.serverTimestamp;
        signInWithPopup = window.signInWithPopup;
        onAuthStateChanged = window.onAuthStateChanged;
        signOut = window.signOut;
        callback();
    } else {
        setTimeout(() => waitForFirebase(callback), 100);
    }
}

// ============================================
// 🔐 GOOGLE SIGN IN
// ============================================
window.signInWithGoogle = async function() {
    if (!auth || !provider) {
        loginError.textContent = 'Firebase belum siap. Tunggu sebentar...';
        loginError.style.display = 'block';
        return;
    }
    
    loginLoading.style.display = 'block';
    document.getElementById('googleSignInBtn').style.display = 'none';
    loginError.style.display = 'none';
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        anonymousName = 'Anonymous' + Math.floor(Math.random() * 9999);
        
        currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: anonymousName
        };
        
        localStorage.setItem('anonUID', user.uid);
        localStorage.setItem('anonName', anonymousName);
        
        enterChat();
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Gagal login! Coba lagi.';
        loginError.style.display = 'block';
        document.getElementById('googleSignInBtn').style.display = 'flex';
    }
    
    loginLoading.style.display = 'none';
};

// ============================================
// 🚪 ENTER / EXIT
// ============================================
function enterChat() {
    loginOverlay.style.display = 'none';
    mainApp.style.display = 'flex';
    listenMessages();
    updateOnlineStatus(true);
}

window.logout = function() {
    if (!signOut || !auth) return;
    signOut(auth);
    localStorage.removeItem('anonUID');
    localStorage.removeItem('anonName');
    currentUser = null;
    anonymousName = '';
    mainApp.style.display = 'none';
    loginOverlay.style.display = 'flex';
    document.getElementById('googleSignInBtn').style.display = 'flex';
    chatArea.innerHTML = '<div class="empty-state">Belum ada pesan.<br>Jadilah yang pertama!</div>';
    updateOnlineStatus(false);
};

// ============================================
// 🔄 AUTO LOGIN
// ============================================
waitForFirebase(() => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            anonymousName = localStorage.getItem('anonName') || 'Anonymous' + Math.floor(Math.random() * 9999);
            if (!localStorage.getItem('anonName')) {
                localStorage.setItem('anonName', anonymousName);
            }
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: anonymousName
            };
            enterChat();
        }
    });
});

// ============================================
// 🟢 ONLINE STATUS
// ============================================
function updateOnlineStatus(isOnline) {
    if (!currentUser || !db) return;
    const onlineRef = ref(db, 'online/' + currentUser.uid);
    
    if (isOnline) {
        set(onlineRef, {
            name: anonymousName,
            timestamp: Date.now()
        });
    } else {
        set(onlineRef, null);
    }
}

setInterval(() => {
    if (!db) return;
    updateOnlineCount();
}, 5000);

async function updateOnlineCount() {
    try {
        const snapshot = await get(ref(db, 'online'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const count = Object.keys(data).length;
            onlineText.textContent = count + ' Online';
            onlineDot.classList.toggle('active', count > 0);
        } else {
            onlineText.textContent = '0 Online';
            onlineDot.classList.remove('active');
        }
    } catch(e) {}
}

// ============================================
// 💬 LISTEN MESSAGES (REALTIME)
// ============================================
function listenMessages() {
    if (!db) return;
    const messagesRef = ref(db, 'messages');
    
    onChildAdded(messagesRef, (snapshot) => {
        const msg = snapshot.val();
        const isMe = currentUser && msg.uid === currentUser.uid;
        addMessageToUI(msg.sender, msg.message, msg.timestamp, isMe);
    });
}

// ============================================
// 📤 KIRIM PESAN
// ============================================
window.kirimPesan = function() {
    const message = messageInput.value.trim();
    if (!message || !currentUser || !db) return;
    
    const messagesRef = ref(db, 'messages');
    
    push(messagesRef, {
        uid: currentUser.uid,
        sender: anonymousName,
        message: message,
        timestamp: new Date().toLocaleString('id-ID')
    });
    
    messageInput.value = '';
};

window.handleKeyPress = function(event) {
    if (event.key === 'Enter') window.kirimPesan();
};

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

// ============================================
// 🔍 DETEKSI
// ============================================
window.deteksiSensitif = function() {
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
};

function showPopup(text) {
    detectedText.textContent = text.length > 20 ? text.substring(0, 20) + '...' : text;
    hidePopup.classList.add('show');
}

function hidePopupFn() {
    hidePopup.classList.remove('show');
    currentSensitiveText = '';
    sensitiveRange = null;
}

window.batalSamarkan = function() { hidePopupFn(); messageInput.focus(); };

window.samarkan = function() {
    if (!currentSensitiveText || !sensitiveRange) return;
    const text = messageInput.value;
    messageInput.value = text.substring(0, sensitiveRange.start) + 
        '[[HIDDEN:' + btoa(currentSensitiveText) + ']]' + 
        text.substring(sensitiveRange.end);
    hidePopupFn();
    messageInput.focus();
};

// ============================================
// 🛠️ HELPERS
// ============================================
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
