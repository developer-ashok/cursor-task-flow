import * as https from 'https';
import { TaskManager } from './taskManager';

interface UserState {
    step: 'none' | 'awaiting_title' | 'awaiting_prompt';
    tempTitle?: string;
}

function parseCommand(text: string): string | null {
    if (!text.startsWith('/')) return null;
    const token = text.split(/\s+/)[0];
    return token.split('@')[0];
}

function parseAutoSendSuffix(text: string): { cleanText: string; autoSend: boolean } {
    const match = text.match(/^(.*?)(?:\s+)?\/send(?:@\w+)?\s*$/i);
    if (!match) {
        return { cleanText: text, autoSend: false };
    }
    return { cleanText: match[1].trim(), autoSend: true };
}

export class TelegramManager {
    private static isRunning = false;
    private static lastUpdateId = 0;
    private static botToken = '';
    private static pollInterval: NodeJS.Timeout | null = null;
    private static userStates = new Map<number, UserState>();

    public static async startSync(token: string) {
        this.botToken = token;
        if (this.isRunning) return;
        this.isRunning = true;
        this.setBotCommands();
        this.poll();
    }

    public static stopSync() {
        this.isRunning = false;
        if (this.pollInterval) clearTimeout(this.pollInterval);
    }

    private static async setBotCommands() {
        await this.sendToTelegram('setMyCommands', {
            commands: [
                { command: 'tasks', description: 'List and run your project tasks' },
                { command: 'add_task', description: 'Create a new task remotely' },
                { command: 'send', description: 'Click the Send button in Cursor' },
                { command: 'help', description: 'Show how to use this bot' }
            ]
        });
    }

    private static async sendToTelegram(method: string, payload: any) {
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

    private static poll() {
        if (!this.isRunning) return;
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
                            if (!chatId) continue;

                            if (update.callback_query) {
                                const data = update.callback_query.data;
                                const tasks = await TaskManager.getTasks();
                                if (data.startsWith('run_')) {
                                    const id = data.replace('run_', '');
                                    const task = tasks.find(t => t.id === id);
                                    if (task) await TaskManager.injectText(task.prompt, true);
                                } else if (data.startsWith('del_')) {
                                    const id = data.replace('del_', '');
                                    const task = tasks.find(t => t.id === id);
                                    if (task) await TaskManager.deleteTask(task);
                                }
                                await this.sendToTelegram('answerCallbackQuery', { callback_query_id: update.callback_query.id });
                                continue;
                            }

                            if (update.message && update.message.text) {
                                const text = update.message.text.trim();
                                const state = this.userStates.get(chatId) || { step: 'none' };
                                const parsedCommand = parseCommand(text);

                                const isCommand = text.startsWith('/');
                                const knownCommands = ['/tasks', '/add_task', '/help', '/start', '/send'];
                                
                                if (isCommand && (!parsedCommand || !knownCommands.includes(parsedCommand)) && state.step === 'none') continue;

                                if (parsedCommand === '/add_task') {
                                    this.userStates.set(chatId, { step: 'awaiting_title' });
                                    await this.sendToTelegram('sendMessage', { chat_id: chatId, text: "📝 What is the Title of the new task?" });
                                } else if (state.step === 'awaiting_title') {
                                    this.userStates.set(chatId, { step: 'awaiting_prompt', tempTitle: text });
                                    await this.sendToTelegram('sendMessage', { chat_id: chatId, text: `Cool! Now send the Prompt for "${text}":` });
                                } else if (state.step === 'awaiting_prompt') {
                                    await TaskManager.saveNewTask(state.tempTitle!, text);
                                    this.userStates.set(chatId, { step: 'none' });
                                    await this.sendToTelegram('sendMessage', { chat_id: chatId, text: "✅ Task saved to Cursor!" });
                                } else if (parsedCommand === '/tasks') {
                                    const tasks = await TaskManager.getTasks();
                                    const buttons = tasks.map(t => [
                                        { text: `▶️ ${t.title}`, callback_data: `run_${t.id}` },
                                        { text: `🗑️`, callback_data: `del_${t.id}` }
                                    ]);
                                    await this.sendToTelegram('sendMessage', {
                                        chat_id: chatId,
                                        text: "Project Tasks:",
                                        reply_markup: { inline_keyboard: buttons }
                                    });
                                } else if (parsedCommand === '/send') {
                                    const sent = await TaskManager.triggerSend();
                                    await this.sendToTelegram('sendMessage', {
                                        chat_id: chatId,
                                        text: sent ? "🚀 Sent to Cursor chat." : "⚠️ Could not trigger send. Make sure Cursor chat is open."
                                    });
                                } else if (parsedCommand === '/help' || parsedCommand === '/start') {
                                    await this.sendToTelegram('sendMessage', {
                                        chat_id: chatId,
                                        text: "🚀 *Cursor Task Flow Bot*\n\n• Send text to inject it into Cursor.\n• Add `/send` at the end to auto-submit.\n• Send `/send` by itself to just click the button.\n• Use `/tasks` to manage tasks.",
                                        parse_mode: 'Markdown'
                                    });
                                } else {
                                    const { autoSend, cleanText } = parseAutoSendSuffix(text);
                                    if (cleanText) await TaskManager.injectText(cleanText, autoSend);
                                }
                            }
                        }
                    }
                } catch (e) {}
                if (this.isRunning) this.pollInterval = setTimeout(() => this.poll(), 1000);
            });
        }).on('error', () => {
            if (this.isRunning) this.pollInterval = setTimeout(() => this.poll(), 5000);
        });
    }
}
