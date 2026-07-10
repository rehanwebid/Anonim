// ============================================
// 👤 USER
// ============================================
let currentUser = null;
let anonymousName = '';

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

// ============================================
// 🔐 GOOGLE SIGN IN
// ============================================
window.signInWithGoogle = async function() {
    loginLoading.style.display = 'block';
    document.getElementById('googleSignInBtn').style.display = 'none';
    loginError.style.display = 'none';
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Generate anonymous name
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
    signOut(auth);
    localStorage.removeItem('anonUID');
    localStorage.removeItem('anonName');
    currentUser = null;
    mainApp.style.display = 'none';
    loginOverlay.style.display = 'flex';
    document.getElementById('googleSignInBtn').style.display = 'flex';
    chatArea.innerHTML = '<div class="empty-state">Belum ada pesan.<br>Jadilah yang pertama!</div>';
    updateOnlineStatus(false);
};

// ============================================
// 🔄 AUTO LOGIN
// ============================================
window.addEventListener('load', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            anonymousName = localStorage.getItem('anonName') || 'Anonymous' + Math.floor(Math.random() * 9999);
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
    if (!currentUser) return;
    const onlineRef = ref(db, 'online/' + currentUser.uid);
    
    if (isOnline) {
        set(onlineRef, {
            name: anonymousName,
            timestamp: serverTimestamp()
        });
    } else {
        set(onlineRef, null);
    }
}

// Listen online users
const onlineRef = ref(db, 'online');
onChildAdded(onlineRef, () => updateOnlineCount());
// Update count periodically
setInterval(updateOnlineCount, 5000);

function updateOnlineCount() {
    const onlineRef = ref(db, 'online');
    onChildAdded(onlineRef, (snapshot) => {
        let count = 0;
        snapshot.forEach(() => count++);
        onlineText.textContent = count + ' Online';
        onlineDot.classList.toggle('active', count > 0);
    });
}

// ============================================
// 💬 LISTEN MESSAGES (REALTIME!)
// ============================================
function listenMessages() {
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
function kirimPesan() {
    const message = messageInput.value.trim();
    if (!message || !currentUser) return;
    
    const messagesRef = ref(db, 'messages');
    
    push(messagesRef, {
        uid: currentUser.uid,
        sender: anonymousName,
        message: message,
        timestamp: new Date().toLocaleString('id-ID')
    });
    
    messageInput.value = '';
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

// ============================================
// 🔍 DETEKSI SENSITIF
// ============================================
let currentSensitiveText = '';
let sensitiveRange = null;

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

function batalSamarkan() { hidePopupFn(); messageInput.focus(); }

function samarkan() {
    if (!currentSensitiveText || !sensitiveRange) return;
    const text = messageInput.value;
    messageInput.value = text.substring(0, sensitiveRange.start) + 
        '[[HIDDEN:' + btoa(currentSensitiveText) + ']]' + 
        text.substring(sensitiveRange.end);
    hidePopupFn();
    messageInput.focus();
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
