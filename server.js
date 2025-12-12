require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8080;

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ---

// 1. GET ALL DATA
app.get('/api/data', async (req, res) => {
    // Run 4 queries in parallel to get all needed data
    const [kids, tags, history, presets] = await Promise.all([
        supabase.from('kids').select('*').order('id'),
        supabase.from('tags').select('*').order('name'),
        supabase.from('history').select('*').order('timestamp', { ascending: false }).limit(50),
        supabase.from('presets').select('*').order('value')
    ]);

    // Calculate Weekly Total (Sum of all history logs in last 7 days)
    // For simplicity in this version, we just sum up the current balances.
    // Ideally, you'd query the history table for date ranges.
    let totalMinutes = 0;
    if (kids.data) {
        kids.data.forEach(k => totalMinutes += k.minutes);
    }

    res.json({
        kids: kids.data || [],
        tags: tags.data ? tags.data.map(t => t.name) : [], // Frontend expects simple array of strings
        history: history.data || [],
        weekly_total: totalMinutes, // Showing current balance sum for now
        presets: presets.data ? presets.data.map(p => p.value) : []
    });
});

// 2. ADD KID
app.post('/api/add_kid', async (req, res) => {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FDCB6E", "#9B59B6"];
    // Pick a random color
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    await supabase.from('kids').insert({
        name: "New Kid",
        minutes: 0,
        color: randomColor
    });
    res.json({ success: true });
});

// 3. REMOVE KID
app.post('/api/remove_kid/:id', async (req, res) => {
    await supabase.from('kids').delete().eq('id', req.params.id);
    res.json({ success: true });
});

// 4. UPDATE NAME
app.post('/api/update_name/:id', async (req, res) => {
    await supabase.from('kids').update({ name: req.body.name }).eq('id', req.params.id);
    res.json({ success: true });
});

// 5. ADD ACTIVITY TAG
app.post('/api/add_tag', async (req, res) => {
    await supabase.from('tags').insert({ name: req.body.tag });
    res.json({ success: true });
});

// 6. REMOVE TAG
app.post('/api/remove_tag', async (req, res) => {
    await supabase.from('tags').delete().eq('name', req.body.tag);
    res.json({ success: true });
});

// 7. RENAME TAG
app.post('/api/rename_tag', async (req, res) => {
    await supabase.from('tags').update({ name: req.body.newTag }).eq('name', req.body.oldTag);
    res.json({ success: true });
});

// 8. UPDATE PRESET
app.post('/api/update_preset', async (req, res) => {
    const { index, value } = req.body;
    // We need to find the ID of the preset at that index. 
    // This is a bit tricky with SQL, so we'll fetch all, find the one, and update it.
    const { data } = await supabase.from('presets').select('*').order('value');
    if (data && data[index]) {
        await supabase.from('presets').update({ value: parseInt(value) }).eq('id', data[index].id);
    }
    res.json({ success: true });
});

// 9. CORE: ADD TIME (Transaction)
app.post('/api/add_time', async (req, res) => {
    const { kid_id, minutes, tag } = req.body;

    // A. Get current kid data
    const { data: kid } = await supabase.from('kids').select('*').eq('id', kid_id).single();
    
    if (kid) {
        let newMinutes = kid.minutes + minutes;
        if (newMinutes < 0) newMinutes = 0;

        // B. Update Kid Balance
        await supabase.from('kids').update({ minutes: newMinutes }).eq('id', kid_id);

        // C. Add to History Log
        const sign = minutes > 0 ? "+" : "";
        await supabase.from('history').insert({
            text: `${kid.name}: ${sign}${minutes}m (${tag})`,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});