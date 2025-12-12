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
let weeklyMinutes = 0;

// --- API ---
app.get('/api/data', (req, res) => {
    res.json({ kids: kidsDb, tags: customTags, history: historyLog, weekly_total: weeklyMinutes });
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
    if (req.body.tag && !customTags.includes(req.body.tag)) customTags.push(req.body.tag);
    res.json({ success: true });
});

app.post('/api/remove_tag', (req, res) => {
    customTags = customTags.filter(t => t !== req.body.tag);
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
            const now = new Date();
            const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            historyLog.unshift(`${timestamp} - ${kid.name}: +${minutes}m (${tag})`);
        }
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// --- FRONTEND ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minute Tracker</title>
    <style>
        :root { --bg-start: #667eea; --bg-end: #764ba2; --kid-red: #FF6B6B; --kid-teal: #4ECDC4; }
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background-color: #F0F8FF; display: flex; flex-direction: column; height: 100vh; }
        
        /* Login */
        #login-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom right, var(--bg-start), var(--bg-end)); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .login-box { background: white; padding: 2rem; border-radius: 20px; text-align: center; width: 90%; max-width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .login-input { padding: 12px; margin: 15px 0; border: 2px solid #eee; border-radius: 12px; width: 80%; font-size: 18px; text-align: center; }
        
        /* App Structure */
        .header { background: linear-gradient(to right, var(--bg-start), var(--bg-end)); padding: 20px; color: white; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .content-area { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 240px; } /* Space for controls */
        
        .tabs { display: flex; background: white; border-bottom: 1px solid #eee; }
        .tab { flex: 1; padding: 15px; text-align: center; color: #888; cursor: pointer; font-weight: bold; }
        .tab.active { color: var(--bg-start); border-bottom: 3px solid var(--bg-start); background: #F8F9FF; }

        /* Kid Cards */
        .kid-card { background: white; border-radius: 20px; padding: 15px; margin-bottom: 15px; display: flex; flex-direction: column; align-items: center; position: relative; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 3px solid transparent; transition: all 0.2s; }
        .kid-card.selected { border-color: var(--bg-start); background-color: #F0F2FF; transform: scale(1.02); }
        .delete-btn { position: absolute; top: 10px; right: 10px; background: #FFEBEE; color: var(--kid-red); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-weight: bold; font-size: 16px; }
        .kid-name-input { font-size: 24px; font-weight: 800; text-align: center; border: none; background: transparent; width: 80%; outline: none; margin-bottom: 5px; color: #333; }
        .kid-minutes { font-size: 40px; font-weight: 900; letter-spacing: -1px; }

        /* Controls Panel */
        .controls { background: white; padding: 20px; border-top-left-radius: 30px; border-top-right-radius: 30px; box-shadow: 0 -10px 40px rgba(0,0,0,0.1); position: fixed; bottom: 0; width: 100%; box-sizing: border-box; z-index: 100; }
        
        .tags-wrapper { overflow-x: auto; white-space: nowrap; margin-bottom: 15px; padding-bottom: 5px; -webkit-overflow-scrolling: touch; }
        .tag-btn { position: relative; display: inline-flex; align-items: center; padding: 8px 16px; margin-right: 8px; border-radius: 20px; border: none; cursor: pointer; color: white; font-weight: bold; font-size: 14px; background: #9B59B6; padding-right: 32px; }
        .tag-btn.add { background: #eee; color: #555; padding-right: 16px; }
        .tag-delete { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; background: rgba(0,0,0,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; line-height: 1; color: white; cursor: pointer; }

        /* Manual Input & Presets */
        .manual-section { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; background: #F8F9FA; padding: 10px; border-radius: 15px; }
        .stepper-btn { width: 45px; height: 45px; border-radius: 12px; border: none; background: var(--bg-start); color: white; font-size: 24px; font-weight: bold; cursor: pointer; }
        #manual-input { width: 80px; text-align: center; font-size: 24px; font-weight: bold; border: none; background: transparent; color: #333; }

        .presets-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
        .preset-box { display: flex; flex-direction: column; gap: 5px; }
        .preset-input { width: 100%; text-align: center; border: 1px solid #ddd; border-radius: 8px; padding: 8px; font-size: 16px; font-weight: bold; box-sizing: border-box; }
        .preset-btn { width: 100%; padding: 8px 0; background: #E0E7FF; color: var(--bg-start); border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; }
        .preset-btn:active { background: var(--bg-start); color: white; }

        .actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .action-btn { padding: 15px; border-radius: 15px; border: none; color: white; font-weight: bold; font-size: 16px; cursor: pointer; }
        
        .history-item { background: white; padding: 15px; margin-bottom: 10px; border-radius: 12px; border-left: 5px solid var(--bg-start); font-size: 15px; color: #444; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    </style>
</head>
<body>
    <div id="login-screen">
        <div class="login-box">
            <h2>🔐 Login</h2>
            <input type="password" id="password" class="login-input" placeholder="Enter Password">
            <button class="action-btn" style="background: var(--kid-teal); width: 100%;" onclick="login()">Start Tracking</button>
        </div>
    </div>

    <div id="app-container" style="display:none; height: 100%; flex-direction: column;">
        <div class="header">
            <h2 style="margin:0;">Minute Tracker</h2>
            <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Today's Total: <span id="daily-val">0</span>m</div>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="switchTab('daily')" id="tab-daily">Tracker</div>
            <div class="tab" onclick="switchTab('weekly')" id="tab-weekly">History</div>
        </div>

        <div id="view-daily" class="content-area">
            <div id="kids-container"></div>
            <button onclick="addKid()" style="width:100%; padding:15px; background:#f0f0f0; color:#666; border:2px dashed #ccc; border-radius:15px; font-weight:bold; font-size: 16px; margin-top:10px;">+ Add Another Kid</button>
        </div>

        <div id="view-weekly" class="content-area" style="display:none;">
            <div style="background: white; padding: 20px; border-radius: 20px; margin-bottom: 20px; text-align: center;">
                <div style="color: #888; font-size: 14px;">Total Minutes Earned</div>
                <div style="font-size: 48px; font-weight:900; color:#FDCB6E;"><span id="weekly-total-display">0</span>m</div>
            </div>
            <h3 style="color:#333; margin-left: 5px;">Activity Log</h3>
            <div id="history-log"></div>
        </div>

        <div class="controls" id="controls-panel">
            <div style="text-align: center; color: #888; font-weight: bold; margin-bottom: 10px; font-size: 14px;" id="selected-status">Tap a kid above to start</div>
            
            <div class="tags-wrapper" id="tags-container"></div>

            <div class="manual-section">
                <button class="stepper-btn" onclick="adjustManual(-1)">-</button>
                <input type="number" id="manual-input" value="5">
                <button class="stepper-btn" onclick="adjustManual(1)">+</button>
            </div>

            <div class="presets-grid">
                <div class="preset-box"><input type="number" class="preset-input" id="p1" value="5"><button class="preset-btn" onclick="usePreset('p1')">Add</button></div>
                <div class="preset-box"><input type="number" class="preset-input" id="p2" value="10"><button class="preset-btn" onclick="usePreset('p2')">Add</button></div>
                <div class="preset-box"><input type="number" class="preset-input" id="p3" value="15"><button class="preset-btn" onclick="usePreset('p3')">Add</button></div>
                <div class="preset-box"><input type="number" class="preset-input" id="p4" value="30"><button class="preset-btn" onclick="usePreset('p4')">Add</button></div>
            </div>

            <div class="actions-grid">
                <button class="action-btn" style="background: var(--kid-red)" onclick="applyManual(false)">- Remove</button>
                <button class="action-btn" style="background: var(--kid-teal)" onclick="applyManual(true)">+ Add Points</button>
            </div>
        </div>
    </div>

    <script>
        let kids = []; let selectedKidId = -1; let currentTag = "General";

        function login() { if(document.getElementById('password').value) { document.getElementById('login-screen').style.display = 'none'; document.getElementById('app-container').style.display = 'flex'; loadData(); } }
        async function loadData() { const res = await fetch('/api/data'); const data = await res.json(); kids = data.kids; document.getElementById('weekly-total-display').innerText = data.weekly_total; renderKids(); renderTags(data.tags); renderHistory(data.history); }
        
        function renderKids() {
            const container = document.getElementById('kids-container'); container.innerHTML = ''; let dailyTotal = 0;
            kids.forEach(kid => {
                dailyTotal += kid.minutes;
                const card = document.createElement('div');
                card.className = \`kid-card \${kid.id === selectedKidId ? 'selected' : ''}\`;
                card.onclick = (e) => { if(['INPUT', 'BUTTON'].includes(e.target.tagName) || e.target.classList.contains('delete-btn')) return; selectedKidId = kid.id; document.getElementById('selected-status').innerText = \`Selected: \${kid.name}\`; document.getElementById('selected-status').style.color = kid.color; renderKids(); };
                card.innerHTML = \`<button class="delete-btn" onclick="removeKid(\${kid.id})">✕</button><input class="kid-name-input" value="\${kid.name}" onchange="updateName(\${kid.id}, this.value)"><div class="kid-minutes" style="color: \${kid.color}">\${kid.minutes} m</div>\`;
                container.appendChild(card);
            });
            document.getElementById('daily-val').innerText = dailyTotal;
        }

        function renderTags(tags) {
            const container = document.getElementById('tags-container'); container.innerHTML = '';
            tags.forEach(tag => {
                const btn = document.createElement('div');
                btn.className = 'tag-btn';
                btn.innerHTML = \`\${tag} <span class="tag-delete" onclick="removeTag(event, '\${tag}')">✕</span>\`;
                btn.onclick = (e) => { if(e.target.className === 'tag-delete') return; currentTag = tag; alert(\`Activity set: \${tag}\`); };
                container.appendChild(btn);
            });
            container.innerHTML += \`<button class="tag-btn add" onclick="addNewTag()">+ New</button>\`;
        }

        function renderHistory(history) {
            const container = document.getElementById('history-log'); container.innerHTML = '';
            history.forEach(entry => { const div = document.createElement('div'); div.className = 'history-item'; div.innerText = entry; container.appendChild(div); });
        }

        function adjustManual(amount) { const input = document.getElementById('manual-input'); let val = parseInt(input.value) || 0; val += amount; if(val < 1) val = 1; input.value = val; }
        function usePreset(id) { const val = parseInt(document.getElementById(id).value); if(val) addTime(val); }
        async function applyManual(isAdd) { const val = parseInt(document.getElementById('manual-input').value); if(val) addTime(isAdd ? val : -val); }
        
        async function addTime(minutes) {
            if(selectedKidId === -1) { alert("Please select a kid first!"); return; }
            await fetch('/api/add_time', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({kid_id: selectedKidId, minutes: minutes, tag: currentTag}) });
            loadData();
        }

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