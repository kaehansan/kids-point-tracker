// Global state
let password = '';
let sessionToken = null;
let selectedKidId = null;
let selectedTag = null;
let selectedTagColor = '#FF6B6B';
let kids = [];
let tags = [];

// Session management
const SESSION_STORAGE_KEY = 'kids_points_session';
const SESSION_EXPIRY_KEY = 'kids_points_session_expiry';

// Get session from localStorage
function getStoredSession() {
    const token = localStorage.getItem(SESSION_STORAGE_KEY);
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    
    if (token && expiry) {
        const now = new Date();
        const expiryDate = new Date(expiry);
        
        if (expiryDate > now) {
            return token;
        } else {
            // Session expired, clear it
            clearStoredSession();
        }
    }
    
    return null;
}

// Store session in localStorage
function storeSession(token, expiresAt) {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
    localStorage.setItem(SESSION_EXPIRY_KEY, expiresAt);
    sessionToken = token;
}

// Clear stored session
function clearStoredSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    sessionToken = null;
}

// Get auth headers for API requests
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (sessionToken) {
        headers['x-session-token'] = sessionToken;
    } else if (password) {
        headers['x-password'] = password;
    }
    
    return headers;
}

// Handle API response - check for session expiration
function handleApiResponse(response) {
    if (response.status === 401) {
        // Session expired or invalid
        clearStoredSession();
        showLoginModal();
        throw new Error('Session expired. Please login again.');
    }
    return response;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('passwordInput');
    
    // Check for existing session
    const storedToken = getStoredSession();
    if (storedToken) {
        sessionToken = storedToken;
        // Validate session with server
        validateSession();
    } else {
        // Show login modal if no valid session
        document.getElementById('authModal').style.display = 'flex';
        passwordInput.focus();
    }
    
    // Enter key to login
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    // Clear error on input change
    passwordInput.addEventListener('input', () => {
        clearAuthError();
    });
});

// Validate existing session
function validateSession() {
    if (!sessionToken) {
        showLoginModal();
        return;
    }
    
    fetch('/api/session/validate', {
        method: 'GET',
        headers: {
            'x-session-token': sessionToken
        }
    })
    .then(response => {
        if (response.ok) {
            // Session is valid, show app
            document.getElementById('authModal').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            loadData();
        } else {
            // Session invalid, clear and show login
            clearStoredSession();
            showLoginModal();
        }
    })
    .catch(error => {
        console.error('Session validation error:', error);
        // On error, try to show app anyway (might be network issue)
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        loadData();
    });
}

// Show login modal
function showLoginModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    const passwordInput = document.getElementById('passwordInput');
    passwordInput.focus();
}

// Clear auth error
function clearAuthError() {
    const errorEl = document.getElementById('authError');
    const inputEl = document.getElementById('passwordInput');
    errorEl.textContent = '';
    inputEl.classList.remove('error');
}

// Show auth error
function showAuthError(message) {
    const errorEl = document.getElementById('authError');
    const inputEl = document.getElementById('passwordInput');
    errorEl.textContent = message;
    inputEl.classList.add('error');
    inputEl.focus();
    // Shake animation
    inputEl.style.animation = 'shake 0.5s';
    setTimeout(() => {
        inputEl.style.animation = '';
    }, 500);
}

// Authentication
function login() {
    const passwordInput = document.getElementById('passwordInput');
    password = passwordInput.value.trim();
    
    // Clear previous errors
    clearAuthError();
    
    // Validate input
    if (!password) {
        showAuthError('Please enter a password');
        return;
    }
    
    // Disable button during request
    const loginBtn = document.querySelector('#authModal .btn-primary');
    const originalText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Checking...';
    
    // Test authentication with dedicated auth endpoint
    fetch('/api/auth', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-password': password 
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json().then(data => {
                // Store session token
                if (data.sessionToken && data.expiresAt) {
                    storeSession(data.sessionToken, data.expiresAt);
                }
                
                // Success - show app
                document.getElementById('authModal').style.display = 'none';
                document.getElementById('mainApp').style.display = 'block';
                clearAuthError();
                passwordInput.value = '';
                password = ''; // Clear password from memory
                loadData();
            });
        } else {
            // Get error message from response
            return response.json().then(data => {
                showAuthError(data.error || 'Incorrect password');
                passwordInput.value = '';
                password = '';
            });
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showAuthError('Connection error. Please try again.');
    })
    .finally(() => {
        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
    });
}

// Load all data
function loadData() {
    loadKids();
    loadTags();
    loadTransactions();
}

// Load kids
function loadKids() {
    fetch('/api/kids')
        .then(r => r.json())
        .then(data => {
            kids = data;
            renderKids();
        });
}

// Render kids cards
function renderKids() {
    const container = document.getElementById('kidsDashboard');
    container.innerHTML = kids.map(kid => `
        <div class="kid-card ${selectedKidId === kid.id ? 'selected' : ''}" 
             style="--kid-color: ${kid.color}"
             onclick="selectKid(${kid.id})">
            <div class="kid-initials" style="background: ${kid.color}">${kid.initials}</div>
            <div class="kid-name">${kid.name}</div>
            <div class="points-display">
                <div class="points-number" style="color: ${kid.color}">${kid.balance}</div>
                <div class="points-label">Points</div>
            </div>
        </div>
    `).join('');
}

// Select kid
function selectKid(kidId) {
    selectedKidId = kidId;
    const kid = kids.find(k => k.id === kidId);
    
    renderKids();
    
    document.getElementById('selectedKid').innerHTML = `
        <span style="color: ${kid.color}; font-size: 1.5rem;">${kid.initials}</span>
        <span style="margin-left: 0.5rem;">${kid.name} selected</span>
    `;
}

// Load tags
function loadTags() {
    fetch('/api/tags')
        .then(r => r.json())
        .then(data => {
            tags = data;
            renderTags();
        });
}

// Render tags
function renderTags() {
    const container = document.getElementById('tagsList');
    container.innerHTML = tags.map(tag => `
        <button class="tag-btn ${selectedTag === tag.name ? 'selected' : ''}"
                style="background: ${tag.color}; color: ${getContrastColor(tag.color)};"
                onclick="selectTag('${tag.name}', '${tag.color}')">
            ${tag.name}
        </button>
    `).join('');
}

// Select tag
function selectTag(tagName, color) {
    selectedTag = tagName;
    selectedTagColor = color;
    renderTags();
}

// Get contrast color for text
function getContrastColor(hexcolor) {
    const r = parseInt(hexcolor.substr(1,2), 16);
    const g = parseInt(hexcolor.substr(3,2), 16);
    const b = parseInt(hexcolor.substr(5,2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 155 ? '#000000' : '#ffffff';
}

// Points management
function incrementPoints() {
    const input = document.getElementById('pointsInput');
    input.value = parseInt(input.value) + 1;
}

function decrementPoints() {
    const input = document.getElementById('pointsInput');
    const val = parseInt(input.value);
    if (val > 1) input.value = val - 1;
}

function setPoints(value) {
    document.getElementById('pointsInput').value = value;
}

// Add points
function addPoints() {
    if (!selectedKidId) {
        alert('Please select a kid first');
        return;
    }
    
    const points = parseInt(document.getElementById('pointsInput').value);
    
    fetch('/api/transactions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            kid_id: selectedKidId,
            points: points,
            tag: selectedTag || 'General'
        })
    })
    .then(handleApiResponse)
    .then(r => r.json())
    .then(() => {
        animateSuccess();
        loadData();
    })
    .catch(error => {
        if (error.message !== 'Session expired. Please login again.') {
            console.error('Error adding points:', error);
            alert('Error adding points. Please try again.');
        }
    });
}

// Remove points
function removePoints() {
    if (!selectedKidId) {
        alert('Please select a kid first');
        return;
    }
    
    const points = parseInt(document.getElementById('pointsInput').value);
    
    fetch('/api/transactions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            kid_id: selectedKidId,
            points: -points,
            tag: selectedTag || 'General'
        })
    })
    .then(handleApiResponse)
    .then(r => r.json())
    .then(() => {
        animateSuccess();
        loadData();
    })
    .catch(error => {
        if (error.message !== 'Session expired. Please login again.') {
            console.error('Error removing points:', error);
            alert('Error removing points. Please try again.');
        }
    });
}

// Load transactions
function loadTransactions() {
    fetch('/api/transactions?limit=20')
        .then(r => r.json())
        .then(data => {
            renderTransactions(data);
        });
}

// Render transactions
function renderTransactions(transactions) {
    const container = document.getElementById('activityList');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #718096;">No activity yet</p>';
        return;
    }
    
    container.innerHTML = transactions.map(t => `
        <div class="activity-item" style="--kid-color: ${t.color}">
            <div class="activity-header">
                <span class="activity-kid">${t.initials} ${t.name}</span>
                <span class="activity-points ${t.points > 0 ? 'positive' : 'negative'}">
                    ${t.points > 0 ? '+' : ''}${t.points} pts
                </span>
            </div>
            <span class="activity-tag" style="background: ${getTagColor(t.tag)}; color: ${getContrastColor(getTagColor(t.tag))}">
                ${t.tag}
            </span>
            <div class="activity-time">${formatTimestamp(t.timestamp)}</div>
        </div>
    `).join('');
}

// Get tag color
function getTagColor(tagName) {
    const tag = tags.find(t => t.name === tagName);
    return tag ? tag.color : '#718096';
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Animate success
function animateSuccess() {
    const kidCards = document.querySelectorAll('.kid-card');
    kidCards.forEach(card => {
        if (parseInt(card.onclick.toString().match(/\d+/)[0]) === selectedKidId) {
            card.classList.add('pulse');
            setTimeout(() => card.classList.remove('pulse'), 500);
        }
    });
}

// Settings
function showSettings() {
    const modal = document.getElementById('settingsModal');
    const content = document.getElementById('settingsContent');
    
    content.innerHTML = kids.map(kid => `
        <div class="kid-settings">
            <h4 style="color: ${kid.color}">${kid.name}</h4>
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="kidName${kid.id}" value="${kid.name}">
            </div>
            <div class="form-group">
                <label>Initials (2 letters)</label>
                <input type="text" id="kidInitials${kid.id}" value="${kid.initials}" maxlength="2">
            </div>
            <div class="form-group">
                <label>Color</label>
                <input type="color" id="kidColor${kid.id}" value="${kid.color}">
            </div>
            <button onclick="updateKid(${kid.id})" class="btn-primary">Update ${kid.name}</button>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

// Update kid
function updateKid(kidId) {
    const name = document.getElementById(`kidName${kidId}`).value;
    const initials = document.getElementById(`kidInitials${kidId}`).value.toUpperCase();
    const color = document.getElementById(`kidColor${kidId}`).value;
    
    if (!name || !initials || initials.length !== 2) {
        alert('Please enter a name and exactly 2 letters for initials');
        return;
    }
    
    // Ensure we have a session token or password
    const authHeaders = getAuthHeaders();
    if (!authHeaders['x-session-token'] && !authHeaders['x-password']) {
        alert('Session expired. Please login again.');
        showLoginModal();
        return;
    }
    
    fetch(`/api/kids/${kidId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name, initials, color })
    })
    .then(response => {
        if (response.status === 401) {
            // Session expired or invalid
            clearStoredSession();
            showLoginModal();
            throw new Error('Session expired. Please login again.');
        }
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        closeSettings();
        loadKids();
    })
    .catch(error => {
        if (error.message !== 'Session expired. Please login again.') {
            console.error('Error updating kid:', error);
            alert(`Error updating kid: ${error.message}. Please try again.`);
        }
    });
}

// New Tag Modal
function showNewTagModal() {
    document.getElementById('newTagModal').style.display = 'flex';
    document.getElementById('newTagName').value = '';
    document.getElementById('newTagType').value = '1';
}

function closeNewTagModal() {
    document.getElementById('newTagModal').style.display = 'none';
}

function selectTagColor(color) {
    selectedTagColor = color;
    document.querySelectorAll('#newTagModal .color-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

function createNewTag() {
    const name = document.getElementById('newTagName').value.trim();
    const is_positive = document.getElementById('newTagType').value === '1';
    
    if (!name) {
        alert('Please enter a tag name');
        return;
    }
    
    fetch('/api/tags', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            name: name,
            color: selectedTagColor,
            is_positive: is_positive
        })
    })
    .then(handleApiResponse)
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            closeNewTagModal();
            loadTags();
        } else {
            alert('Tag already exists');
        }
    })
    .catch(error => {
        if (error.message !== 'Session expired. Please login again.') {
            console.error('Error creating tag:', error);
            alert('Error creating tag. Please try again.');
        }
    });
}
