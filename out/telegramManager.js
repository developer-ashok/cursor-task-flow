"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramManager = void 0;
const https = __importStar(require("https"));
const taskManager_1 = require("./taskManager");
class TelegramManager {
    static async startSync(token) {
        this.botToken = token;
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.setBotCommands();
        this.poll();
    }
    static stopSync() {
        this.isRunning = false;
        if (this.pollInterval)
            clearTimeout(this.pollInterval);
    }
    static async setBotCommands() {
        await this.sendToTelegram('setMyCommands', {
            commands: [
                { command: 'tasks', description: 'List and run your project tasks' },
                { command: 'add_task', description: 'Create a new task remotely' },
                { command: 'send', description: 'Click the Send button in Cursor' },
                { command: 'help', description: 'Show how to use this bot' }
            ]
        });
    }
    static async sendToTelegram(method, payload) {
        const url = `https://api.telegram.org/bot${this.botToken}/${method}`;
        const body = JSON.stringify(payload);
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
        };
        const req = https.request(url, options);
        req.write(body);
        req.end();
    }
    static poll() {
        if (!this.isRunning)
            return;
        const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', async () => {
                try {
                    const response = JSON.parse(data);
                    if (response.ok && response.result.length > 0) {
                        for (const update of response.result) {
                            this.lastUpdateId = update.update_id;
                            const chatId = update.message?.chat.id || update.callback_query?.message.chat.id;
                            if (!chatId)
                                continue;
                            if (update.callback_query) {
                                const data = update.callback_query.data;
                                const tasks = await taskManager_1.TaskManager.getTasks();
                                if (data.startsWith('run_')) {
                                    const id = data.replace('run_', '');
                                    const task = tasks.find(t => t.id === id);
                                    if (task)
                                        await taskManager_1.TaskManager.injectText(task.prompt, true);
                                }
                                else if (data.startsWith('del_')) {
                                    const id = data.replace('del_', '');
                                    const task = tasks.find(t => t.id === id);
                                    if (task)
                                        await taskManager_1.TaskManager.deleteTask(task);
                                }
                                await this.sendToTelegram('answerCallbackQuery', { callback_query_id: update.callback_query.id });
                                continue;
                            }
                            if (update.message && update.message.text) {
                                const text = update.message.text.trim();
                                const state = this.userStates.get(chatId) || { step: 'none' };
                                const isCommand = text.startsWith('/');
                                const knownCommands = ['/tasks', '/add_task', '/help', '/start', '/send'];
                                if (isCommand && !knownCommands.includes(text.split(' ')[0]) && state.step === 'none')
                                    continue;
                                if (text === '/add_task') {
                                    this.userStates.set(chatId, { step: 'awaiting_title' });
                                    await this.sendToTelegram('sendMessage', { chat_id: chatId, text: "📝 What is the Title of the new task?" });
                                }
                                else if (state.step === 'awaiting_title') {
                                    this.userStates.set(chatId, { step: 'awaiting_prompt', tempTitle: text });
                                    await this.sendToTelegram('sendMessage', { chat_id: chatId, text: `Cool! Now send the Prompt for "${text}":` });
                                }
                                else if (state.step === 'awaiting_prompt') {
                                    await taskManager_1.TaskManager.saveNewTask(state.tempTitle, text);
                                    this.userStates.set(chatId, { step: 'none' });
                                    await this.sendToTelegram('sendMessage', { chat_id: chatId, text: "✅ Task saved to Cursor!" });
                                }
                                else if (text === '/tasks') {
                                    const tasks = await taskManager_1.TaskManager.getTasks();
                                    const buttons = tasks.map(t => [
                                        { text: `▶️ ${t.title}`, callback_data: `run_${t.id}` },
                                        { text: `🗑️`, callback_data: `del_${t.id}` }
                                    ]);
                                    await this.sendToTelegram('sendMessage', {
                                        chat_id: chatId,
                                        text: "Project Tasks:",
                                        reply_markup: { inline_keyboard: buttons }
                                    });
                                }
                                else if (text === '/send') {
                                    await taskManager_1.TaskManager.triggerSend();
                                    await this.sendToTelegram('sendMessage', { chat_id: chatId, text: "🚀 Clicked!" });
                                }
                                else if (text === '/help' || text === '/start') {
                                    await this.sendToTelegram('sendMessage', {
                                        chat_id: chatId,
                                        text: "🚀 *Cursor Task Flow Bot*\n\n• Send text to inject it into Cursor.\n• Add `/send` at the end to auto-submit.\n• Send `/send` by itself to just click the button.\n• Use `/tasks` to manage tasks.",
                                        parse_mode: 'Markdown'
                                    });
                                }
                                else {
                                    let autoSend = text.endsWith('/send');
                                    let cleanText = autoSend ? text.substring(0, text.length - 5).trim() : text;
                                    if (cleanText)
                                        await taskManager_1.TaskManager.injectText(cleanText, autoSend);
                                }
                            }
                        }
                    }
                }
                catch (e) { }
                if (this.isRunning)
                    this.pollInterval = setTimeout(() => this.poll(), 1000);
            });
        }).on('error', () => {
            if (this.isRunning)
                this.pollInterval = setTimeout(() => this.poll(), 5000);
        });
    }
}
exports.TelegramManager = TelegramManager;
TelegramManager.isRunning = false;
TelegramManager.lastUpdateId = 0;
TelegramManager.botToken = '';
TelegramManager.pollInterval = null;
TelegramManager.userStates = new Map();
//# sourceMappingURL=telegramManager.js.map