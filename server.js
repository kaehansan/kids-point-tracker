const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// --- DATABASE (Reset when server restarts) ---
let kidsDb = [
    { id: 1, name: "Kid 1", minutes: 0, color: "#4ECDC4" }
];
let historyLog = [];
let customTags = ["Chores", "Clean Up", "Food", "Snacks", "TV"];
let weeklyMinutes = 0;

// --- API ENDPOINTS ---
app.get('/api/data', (req, res) => {
    res.json({ kids: kidsDb, tags: customTags, history: historyLog, weekly_total: weeklyMinutes });
});

app.post('/api/add_kid', (req, res) => {
    const newId = Date.now();
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FDCB6E"];
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

app.post('/api/add_time', (req, res) => {
    const { kid_id, minutes, tag } = req.body;
    const kid = kidsDb.find(k => k.id === kid_id);
    if (kid) {
        kid.minutes += minutes;
        if (kid.minutes < 0) kid.minutes = 0;
        if (minutes > 0) {
            weeklyMinutes += minutes;
            const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            historyLog.unshift(`${timestamp} - ${kid.name}: +${minutes}m (${tag})`);
        }
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/add_tag', (req, res) => {
    if (req.body.tag && !customTags.includes(req.body.tag)) customTags.push(req.body.tag);
    res.json({ success: true });
});

// --- SERVE THE HTML DIRECTLY (Fixes file path issues) ---
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
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #F0F8FF; display: flex; flex-direction: column; height: 100vh; }
        
        /* Login */
        #login-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom right, var(--bg-start), var(--bg-end)); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .login-box { background: white; padding: 2rem; border-radius: 20px; text-align: center; width: 80%; max-width: 300px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        input.login-input { padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 8px; width: 90%; font-size: 16px; }
        
        /* App Layout */
        .header { background: linear-gradient(to right, var(--bg-start), var(--bg-end)); padding: 20px; color: white; text-align: center; }
        .tabs { display: flex; background: rgba(0,0,0,0.1); }
        .tab { flex: 1; padding: 15px; text-align: center; color: white; cursor: pointer; font-weight: bold; opacity: 0.7; }
        .tab.active { opacity: 1; border-bottom: 3px solid white; background: rgba(255,255,255,0.1); }
        
        .content-area { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 100px; }
        
        /* Kid Card */
        .kid-card { background: white; border-radius: 20px; padding: 15px; margin-bottom: 15px; display: flex; flex-direction: column; align-items: center; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 3px solid transparent; transition: all 0.2s; }
        .kid-card.selected { border-color: var(--bg-start); background-color: #F3F4FF; transform: scale(1.01); }
        
        .delete-btn { position: absolute; top: 10px; right: 10px; background: var(--kid-red); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-weight: bold; }
        
        .kid-name-input { font-size: 24px; font-weight: bold; text-align: center; border: none; background: transparent; width: 80%; outline: none; margin-bottom: 5px; color: #333; border-bottom: 1px dashed #ccc; }
        .kid-minutes { font-size: 36px; font-weight: 800; }
        
        /* Controls */
        .controls { background: white; padding: 20px; border-top-left-radius: 25px; border-top-right-radius: 25px; box-shadow: 0 -5px 30px rgba(0,0,0,0.15); position: fixed; bottom: 0; width: 100%; box-sizing: border-box; }
        
        .tags-wrapper { overflow-x: auto; white-space: nowrap; margin-bottom: 15px; padding-bottom: 5px; -webkit-overflow-scrolling: touch; }
        .tag-btn { display: inline-block; padding: 8px 16px; margin-right: 8px; border-radius: 20px; border: none; cursor: pointer; color: white; font-weight: bold; font-size: 14px; background: #9B59B6; }
        .tag-btn.add { background: #E0E0E0; color: #555; }
        
        .time-buttons { display: flex; gap: 8px; }
        .time-btn { flex: 1; padding: 12px; border-radius: 12px; border: none; color: white; font-weight: bold; cursor: pointer; font-size: 16px; }
        
        /* History */
        .history-item { background: white; padding: 12px; margin-bottom: 8px; border-radius: 10px; border-left: 5px solid var(--bg-start); font-size: 14px; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    </style>
</head>
<body>
    <div id="login-screen">
        <div class="login-box">
            <h2>🔐 Login</h2>
            <input type="password" id="password" class="login-input" placeholder="Password">
            <button class="time-btn" style="background: var(--kid-teal); width: 100%;" onclick="login()">Enter</button>
        </div>
    </div>

    <div id="app-container" style="display:none; height: 100%; flex-direction: column;">
        <div class="header">
            <h2 style="margin:0;">⭐ Minute Tracker</h2>
            <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Today's Total: <span id="daily-val">0</span>m</div>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="switchTab('daily')" id="tab-daily">Tracker</div>
            <div class="tab" onclick="switchTab('weekly')" id="tab-weekly">History</div>
        </div>

        <div id="view-daily" class="content-area">
            <div id="kids-container"></div>
            <button onclick="addKid()" style="width:100%; padding:15px; background:#e0e0e0; color:#555; border:none; border-radius:15px; font-weight:bold; font-size: 16px;">+ Add Another Kid</button>
        </div>

        <div id="view-weekly" class="content-area" style="display:none;">
            <h3 style="color:#333;">Weekly Summary</h3>
            <div style="font-size: 28px; font-weight:bold; color:#FDCB6E; margin-bottom: 20px;">
                Total: <span id="weekly-total-display">0</span>m
            </div>
            <div id="history-log"></div>
        </div>

        <div class="controls" id="controls-panel">
            <div style="text-align: center; color: #888; font-weight: bold; margin-bottom: 10px; font-size: 14px;" id="selected-status">Tap a kid above to start</div>
            
            <div class="tags-wrapper" id="tags-container"></div>

            <div class="time-buttons">
                <button class="time-btn" style="background: var(--kid-red)" onclick="addTime(-5)">- Remove</button>
                <button class="time-btn" style="background: #667eea" onclick="addTime(5)">+5m</button>
                <button class="time-btn" style="background: #764ba2" onclick="addTime(15)">+15m</button>
                <button class="time-btn" style="background: var(--kid-teal)" onclick="addTime(30)">+30m</button>
            </div>
        </div>
    </div>

    <script>
        let kids = [];
        let selectedKidId = -1;
        let currentTag = "General";

        function login() {
            if(document.getElementById('password').value) {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-container').style.display = 'flex';
                loadData();
            }
        }

        async function loadData() {
            try {
                const res = await fetch('/api/data');
                const data = await res.json();
                kids = data.kids;
                document.getElementById('weekly-total-display').innerText = data.weekly_total;
                renderKids();
                renderTags(data.tags);
                renderHistory(data.history);
            } catch(e) { console.log(e); }
        }

        function renderKids() {
            const container = document.getElementById('kids-container');
            container.innerHTML = '';
            let dailyTotal = 0;
            kids.forEach(kid => {
                dailyTotal += kid.minutes;
                const card = document.createElement('div');
                card.className = \`kid-card \${kid.id === selectedKidId ? 'selected' : ''}\`;
                card.onclick = (e) => {
                    if(e.target.tagName === 'INPUT' || e.target.className === 'delete-btn') return;
                    selectedKidId = kid.id;
                    document.getElementById('selected-status').innerText = \`Selected: \${kid.name}\`;
                    document.getElementById('selected-status').style.color = kid.color;
                    renderKids();
                };
                card.innerHTML = \`
                    <button class="delete-btn" onclick="removeKid(\${kid.id})">✕</button>
                    <input class="kid-name-input" value="\${kid.name}" onchange="updateName(\${kid.id}, this.value)">
                    <div class="kid-minutes" style="color: \${kid.color}">\${kid.minutes} min</div>
                \`;
                container.appendChild(card);
            });
            document.getElementById('daily-val').innerText = dailyTotal;
        }

        function renderTags(tags) {
            const container = document.getElementById('tags-container');
            container.innerHTML = '';
            tags.forEach(tag => {
                const btn = document.createElement('button');
                btn.className = 'tag-btn';
                btn.innerText = tag;
                btn.onclick = () => { currentTag = tag; alert(\`Activity set: \${tag}\`); };
                container.appendChild(btn);
            });
            const addBtn = document.createElement('button');
            addBtn.className = 'tag-btn add';
            addBtn.innerText = '+';
            addBtn.onclick = addNewTag;
            container.appendChild(addBtn);
        }

        function renderHistory(history) {
            const container = document.getElementById('history-log');
            container.innerHTML = '';
            history.forEach(entry => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerText = entry;
                container.appendChild(div);
            });
        }

        function switchTab(tab) {
            document.getElementById('view-daily').style.display = tab === 'daily' ? 'block' : 'none';
            document.getElementById('view-weekly').style.display = tab === 'weekly' ? 'block' : 'none';
            document.getElementById('controls-panel').style.display = tab === 'daily' ? 'block' : 'none';
            document.getElementById('tab-daily').classList.toggle('active', tab === 'daily');
            document.getElementById('tab-weekly').classList.toggle('active', tab === 'weekly');
        }

        async function addKid() {
            await fetch('/api/add_kid', {method: 'POST'});
            loadData();
        }

        async function removeKid(id) {
            if(!confirm('Delete this kid?')) return;
            await fetch(\`/api/remove_kid/\${id}\`, {method: 'POST'});
            loadData();
        }

        async function updateName(id, newName) {
            await fetch(\`/api/update_name/\${id}\`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name: newName})
            });
        }

        async function addNewTag() {
            const tag = prompt("New Activity Name:");
            if(tag) {
                await fetch('/api/add_tag', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({tag: tag})
                });
                loadData();
            }
        }

        async function addTime(minutes) {
            if(selectedKidId === -1) { alert("Select a kid first!"); return; }
            await fetch('/api/add_time', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({kid_id: selectedKidId, minutes: minutes, tag: currentTag})
            });
            loadData();
        }
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});