const fs = require('fs');
const path = require('path');
const { Logger } = require('./logger');

const HISTORY_FILE = path.join(__dirname, '../data/signal_history.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(HISTORY_FILE))) {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
}

function loadHistory() {
    try {
        if (!fs.existsSync(HISTORY_FILE)) return [];
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
        Logger.error('historyManager', 'Error loading history', e);
        return [];
    }
}

function saveSignal(signalData) {
    const history = loadHistory();
    history.push({ ...signalData, timestamp: new Date().toISOString() });
    // Keep only last 100 entries
    if (history.length > 100) history.shift();
    
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function getLastSignal() {
    const history = loadHistory();
    return history.length > 0 ? history[history.length - 1] : null;
}

module.exports = { saveSignal, getLastSignal };
