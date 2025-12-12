const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// --- DATABASE ---
let kidsDb = [
    { id: 1, name: "Kid 1", minutes: 0, color: "#4ECDC4" }
];
let historyLog = []; 
let customTags = ["Chores", "Homework", "Reading", "Clean Up"];
// Default Presets (Editable)
let presets = [5, 10, 15, 30]; 
let weeklyMinutes = 0;

// --- API ---
app.get('/api/data', (req, res) => {
    res.json({ 
        kids: kidsDb, 
        tags: customTags, 
        history: historyLog, 
        weekly_total: weeklyMinutes,
        presets: presets 
    });
});

app.post('/api/add_kid', (req, res) => {
    const newId = Date.now();
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FDCB6E", "#9B59B6"];
    const color = colors[kidsDb.length % colors.length];
    kidsDb.push({ id: newId, name: `Kid ${kidsDb.length + 1}`, minutes: 0, color: color });
    res.json({ success: true });
});

app.post('/api/remove_kid/:id', (req, res) => {
    kidsDb = kidsDb.filter(k => k.id !== parseInt(req.params.id));
    res.json({ success: true });
});

app.post('/api/update_name/:id', (req, res) => {
    const kid = kidsDb.find(k => k.id === parseInt(req.params.id));
    if (kid) kid.name = req.body.name;
    res.json({ success: true });
});

app.post('/api/add_tag', (req, res) => {
    const tag = req.body.tag;
    if (tag && !customTags.includes(tag)) customTags.push(tag);
    res.json({ success: true });
});

app.post('/api/remove_tag', (req, res) => {
    customTags = customTags.filter(t => t !== req.body.tag);
    res.json({ success: true });
});

app.post('/api/rename_tag', (req, res) => {
    const { oldTag, newTag } = req.body;
    const index = customTags.indexOf(oldTag);
    if (index !== -1 && newTag) {
        customTags[index] = newTag;
    }
    res.json({ success: true });
});

app.post('/api/update_preset', (req, res) => {
    const { index, value } = req.body;
    if (index >= 0 && index < presets.length) {
        presets[index] = parseInt(value) || 0;
    }
    res.json({ success: true });
});

app.post('/api/add_time', (req, res) => {
    const { kid_id, minutes, tag } = req.body;
    const kid = kidsDb.find(k => k.id === kid_id);
    if (kid) {
        kid.minutes += minutes;
        if (kid.minutes < 0) kid.minutes = 0;
        
        if (minutes > 0) {
            weeklyMinutes += minutes;
            historyLog.unshift({
                timestamp: Date.now(),
                text: `${kid.name}: +${minutes}m (${tag})`
            });
        }
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// --- FRONTEND ---
app.get('/', (req, res) => {
    // Force browser to download new version every time
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Minute Tracker v3.0</title>
    <style>
        :root { --bg-start: #667eea; --bg-end: #764ba2; --kid-red: #FF6B6B; --kid-teal: #4ECDC4; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #F0F8FF; display: flex; flex-direction: column; height: 100vh; }
        
        /* Login */
        #login-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom right, var(--bg-start), var(--bg-end)); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .login-box { background: white; padding: 2rem; border-radius: 20px; text-align: center; width: 85%; max-width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .login-input { padding: 12px; margin: 15px 0; border: 2px solid #eee; border-radius: 12px; width: 80%; font-size: 18px; text-align: center; }
        
        .header { background: linear-gradient(to right, var(--bg-start), var(--bg-end)); padding: 20px; color: white; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .content-area { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 300px; }
        
        .tabs { display: flex; background: white; border-bottom: 1px solid #eee; }
        .tab { flex: 1; padding: 15px; text-align: center; color: #888; cursor: pointer; font-weight: bold; }
        .tab.active { color: var(--bg-start); border-bottom: 3px solid var(--bg-start); background: #F8F9FF; }

        .kid-card { background: white; border-radius: 20px; padding: 15px; margin-bottom: 15px; display: flex; flex-direction: column; align-items: center; position: relative; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 3px solid transparent; transition: all 0.2s; }
        .kid-card.selected { border-color: var(--bg-start); background-color: #F0F2FF; transform: scale(1.02); }
        .delete-btn { position: absolute; top: 10px; right: 10px; background: #FFEBEE; color: var(--kid-red); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-weight: bold; }
        .kid-name-input { font-size: 24px; font-weight: 800; text-align: center; border: none; background: transparent; width: 80%; outline: none; margin-bottom: 5px; color: #333; }
        .kid-minutes { font-size: 40px; font-weight: 900; letter-spacing: -1px; }

        .controls { background: white; padding: 20px; border-top-left-radius: 30px; border-top-right-radius: 30px; box-shadow: 0 -10px 40px rgba(0,0,0,0.1); position: fixed; bottom: 0; width: 100%; box-sizing: border-box; z-index: 100; max-height: 55vh; overflow-y: auto; }
        
        /* Tags Styling */
        .tags-wrapper { overflow-x: auto; white-space: nowrap; margin-bottom: 15px; padding-bottom: 5px; }
        .tag-btn { position: relative; display: inline-flex; align-items: center; padding: 10px 18px; margin-right: 8px; border-radius: 12px; border: 2px solid #eee; cursor: pointer; font-weight: bold; font-size: 14px; background: white; color: #444; transition: all 0.2s; }
        .tag-btn.selected { background: #9B59B6; color: white; border-color: #9B59B6; box-shadow: 0 4px 10px rgba(155, 89, 182, 0.4); }
        .tag-btn.add { background: #f0f0f0; border: 1px dashed #aaa; }
        
        /* Small X button on tags */
        .tag-delete { 
            margin-left: 8px; 
            width: 20px; height: 20px; 
            background: rgba(0,0,0,0.1); 
            border-radius: 50%; 
            display: inline-flex; align-items: center; justify-content: center; 
            font-size: 10px; 
            opacity: 0.6;
        }
        .tag-delete:hover { opacity: 1; background: red; color: white; }

        /* Presets & Manual */
        .presets-header { font-size: 12px; color: #888; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
        .presets-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
        .preset-box { display: flex; flex-direction: column; }
        .preset-input { width: 100%; text-align: center; border: 1px solid #ddd; border-top-left-radius: 10px; border-top-right-radius: 10px; padding: 8px 0; font-size: 16px; font-weight: bold; box-sizing: border-box; background: #FAFAFA; }
        .preset-btn { width: 100%; padding: 10px 0; background: var(--bg-start); color: white; border: none; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; }
        .preset-btn:active { opacity: 0.8; }

        .manual-section { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; background: #F8F9FA; padding: 10px; border-radius: 15px; }
        .manual-input { width: 60px; padding: 8px; border-radius: 8px; border: 1px solid #ddd; text-align: center; font-size: 18px; font-weight: bold; }
        
        .action-btn { width: 100%; padding: 15px; border-radius: 15px; border: none; color: white; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 5px; background: var(--kid-red); }
        
        .date-header { font-weight: 800; color: #888; margin: 25px 0 10px 5px; font-size: 16px; }
        .history-item { background: white; padding: 15px; margin-bottom: 10px; border-radius: 12px; border-left: 5px solid var(--bg-start); font-size: 15px; color: #444; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
        .history-time { font-size: 12px; color: #aaa; background: #f5f5f5; padding: 4px 8px; border-radius: 10px; }
    </style>
</head>
<body>
    <div id="login-screen">
        <div class="login-box">
            <h2>🔐 Login</h2>
            <form onsubmit="event.preventDefault(); login();" style="display:flex; flex-direction:column; align-items:center;">
                <input type="password" id="password" class="login-input" placeholder="Password" autocomplete="current-password">
                <button type="submit" class="action-btn" style="background: var(--kid-teal); width: 100%;">Enter</button>
            </form>
        </div>
    </div>

    <div id="app-container" style="display:none; height: 100%; flex-direction: column;">
        <div class="header">
            <h2 style="margin:0;">Minute Tracker v3.0</h2>
            <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Today's Total: <span id="daily-val">0</span>m</div>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="switchTab('daily')" id="tab-daily">Tracker</div>
            <div class="tab" onclick="switchTab('weekly')" id="tab-weekly">Weekly Log</div>
        </div>

        <div id="view-daily" class="content-area">
            <div id="kids-container"></div>
            <button onclick="addKid()" style="width:100%; padding:15px; background:#f0f0f0; color:#666; border:2px dashed #ccc; border-radius:15px; font-weight:bold; font-size: 16px; margin-top:10px;">+ Add Another Kid</button>
        </div>

        <div id="view-weekly" class="content-area" style="display:none;">
            <div style="background: white; padding: 20px; border-radius: 20px; margin-bottom: 20px; text-align: center;">
                <div style="color: #888; font-size: 14px;">Total Earned</div>
                <div style="font-size: 48px; font-weight:900; color:#FDCB6E;"><span id="weekly-total-display">0</span>m</div>
            </div>
            <div id="history-log"></div>
        </div>

        <div class="controls" id="controls-panel">
            <div style="text-align: center; color: #888; font-weight: bold; margin-bottom: 10px; font-size: 14px;" id="selected-status">Tap a kid above to start</div>
            
            <div class="tags-wrapper" id="tags-container"></div>

            <div class="presets-header">Quick Add (Edit numbers below)</div>
            <div class="presets-grid" id="presets-container">
                </div>

            <div class="manual-section">
                <span>Custom:</span>
                <button class="stepper-btn" onclick="adjustManual(-1)">-</button>
                <input type="number" id="manual-input" class="manual-input" value="1">
                <button class="stepper-btn" onclick="adjustManual(1)">+</button>
            </div>
            
            <button class="action-btn" onclick="applyManual(true)" style="background: var(--kid-teal); margin-bottom: 8px;">+ Add Points</button>
            <button class="action-btn" onclick="applyManual(false)">- Remove Points</button>
        </div>
    </div>

    <script>
        let kids = []; let selectedKidId = -1; let currentTag = "General"; let presets = [];

        function login() { if(document.getElementById('password').value) { document.getElementById('login-screen').style.display = 'none'; document.getElementById('app-container').style.display = 'flex'; loadData(); } }
        
        async function loadData() { 
            const res = await fetch('/api/data'); 
            const data = await res.json(); 
            kids = data.kids; 
            presets = data.presets;
            document.getElementById('weekly-total-display').innerText = data.weekly_total; 
            renderKids(); 
            renderTags(data.tags); 
            renderHistory(data.history); 
            renderPresets();
        }
        
        function renderKids() {
            const container = document.getElementById('kids-container'); container.innerHTML = ''; let dailyTotal = 0;
            kids.forEach(kid => {
                dailyTotal += kid.minutes;
                const card = document.createElement('div');
                card.className = \`kid-card \${kid.id === selectedKidId ? 'selected' : ''}\`;
                card.onclick = (e) => { if(['INPUT', 'BUTTON', 'SPAN'].includes(e.target.tagName) || e.target.classList.contains('delete-btn')) return; selectedKidId = kid.id; document.getElementById('selected-status').innerText = \`Selected: \${kid.name}\`; document.getElementById('selected-status').style.color = kid.color; renderKids(); };
                card.innerHTML = \`<button class="delete-btn" onclick="removeKid(\${kid.id})">✕</button><input class="kid-name-input" value="\${kid.name}" onchange="updateName(\${kid.id}, this.value)"><div class="kid-minutes" style="color: \${kid.color}">\${kid.minutes} m</div>\`;
                container.appendChild(card);
            });
            document.getElementById('daily-val').innerText = dailyTotal;
        }

        function renderTags(tags) {
            const container = document.getElementById('tags-container'); container.innerHTML = '';
            tags.forEach(tag => {
                const btn = document.createElement('div');
                // Added logic to turn button PURPLE when selected
                btn.className = \`tag-btn \${currentTag === tag ? 'selected' : ''}\`;
                // Added explicit 'X' button
                btn.innerHTML = \`\${tag} <span class="tag-delete" onclick="removeTag(event, '\${tag}')">✕</span>\`;
                btn.onclick = (e) => { if(e.target.className === 'tag-delete') return; currentTag = tag; renderTags(tags); }; // Re-render to update purple selection
                btn.ondblclick = () => renameTag(tag);
                container.appendChild(btn);
            });
            container.innerHTML += \`<button class="tag-btn add" onclick="addNewTag()">+ New</button>\`;
        }

        function renderPresets() {
            const container = document.getElementById('presets-container'); container.innerHTML = '';
            presets.forEach((val, idx) => {
                const box = document.createElement('div'); box.className = 'preset-box';
                // Generates EDITABLE inputs
                box.innerHTML = \`<input type="number" class="preset-input" value="\${val}" onchange="updatePreset(\${idx}, this.value)"><button class="preset-btn" onclick="addTime(\${val})">Add</button>\`;
                container.appendChild(box);
            });
        }

        function renderHistory(history) {
            const container = document.getElementById('history-log'); container.innerHTML = '';
            let lastDate = "";
            const now = new Date();
            const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);

            history.forEach(entry => {
                const dateObj = new Date(entry.timestamp);
                let dateStr = dateObj.toDateString();
                if (dateStr === now.toDateString()) dateStr = "Today";
                else if (dateStr === yesterday.toDateString()) dateStr = "Yesterday";
                else dateStr = dateObj.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric'});

                if(dateStr !== lastDate) {
                    const header = document.createElement('div'); header.className = 'date-header'; header.innerText = dateStr;
                    container.appendChild(header); lastDate = dateStr;
                }
                const div = document.createElement('div'); div.className = 'history-item';
                const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                div.innerHTML = \`<span>\${entry.text}</span> <span class="history-time">\${timeStr}</span>\`;
                container.appendChild(div);
            });
        }

        async function updatePreset(idx, val) { await fetch('/api/update_preset', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({index: idx, value: val}) }); }
        async function applyManual(isAdd) { const val = parseInt(document.getElementById('manual-input').value); if(val) addTime(isAdd ? val : -val); }
        async function addTime(minutes) {
            if(selectedKidId === -1) { alert("Please select a kid first!"); return; }
            await fetch('/api/add_time', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({kid_id: selectedKidId, minutes: minutes, tag: currentTag}) });
            loadData();
        }

        function adjustManual(amount) { const input = document.getElementById('manual-input'); let val = parseInt(input.value) || 0; val += amount; if(val < 1) val = 1; input.value = val; }
        async function renameTag(e, oldTag) { e.stopPropagation(); const newTag = prompt("Rename activity:", oldTag); if(newTag && newTag !== oldTag) { await fetch('/api/rename_tag', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({oldTag, newTag}) }); loadData(); } }
        async function removeTag(e, tag) { e.stopPropagation(); if(!confirm(\`Delete activity "\${tag}"?\`)) return; await fetch('/api/remove_tag', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tag}) }); loadData(); }
        async function addKid() { await fetch('/api/add_kid', {method: 'POST'}); loadData(); }
        async function removeKid(id) { if(confirm('Delete kid?')) { await fetch(\`/api/remove_kid/\${id}\`, {method: 'POST'}); loadData(); } }
        async function updateName(id, name) { await fetch(\`/api/update_name/\${id}\`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) }); }
        async function addNewTag() { const t = prompt("Activity Name:"); if(t) { await fetch('/api/add_tag', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tag: t}) }); loadData(); } }
        function switchTab(t) { document.getElementById('view-daily').style.display = t === 'daily' ? 'block' : 'none'; document.getElementById('view-weekly').style.display = t === 'weekly' ? 'block' : 'none'; document.getElementById('controls-panel').style.display = t === 'daily' ? 'block' : 'none'; document.getElementById('tab-daily').classList.toggle('active', t === 'daily'); document.getElementById('tab-weekly').classList.toggle('active', t === 'weekly'); }
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });