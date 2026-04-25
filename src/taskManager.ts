import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as os from 'os';

export interface Task {
    id: string;
    title: string;
    prompt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ported from cursor-autopilot/src/extension.ts
// Key insight: Cursor uses Cmd+Enter (not just Enter) for chat submit
// ─────────────────────────────────────────────────────────────────────────────

const OPEN_COMMANDS   = [
    'composer.startComposerPrompt',
    'workbench.action.chat.open'
];
const FOCUS_COMMANDS  = [
    'cursor.chat.focus',
    'workbench.action.chat.focus',
    'aichat.newfollowupaction'
];
const SUBMIT_COMMANDS = [
    'composer.submitComposerPrompt',
    'aichat.submitFollowupAction',
    'composer.sendPrompt',
    'cursor.chat.send',
    'cursor.chat.submitMessage',
    'workbench.action.chat.submit',
    'workbench.action.chat.acceptInput',
    'interactive.acceptInput',
];
const SEND_KEYBIND = 'cursor.sendKeyBinding';
const output = vscode.window.createOutputChannel('Cursor Task Flow');

function log(message: string) {
    output.appendLine(`[${new Date().toISOString()}] ${message}`);
}

function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

function execPromise(cmd: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(cmd, (err) => (err ? reject(err) : resolve()));
    });
}

async function osLevelSend(): Promise<void> {
    if (os.platform() === 'darwin') {
        // Bring Cursor to front then send Cmd+Enter (NOT just Enter!)
        await execPromise(`osascript -e 'tell application "Cursor" to activate'`);
        await delay(300);
        await execPromise(`osascript -e 'tell application "System Events" to keystroke return using {command down}'`);
    }
}

async function osLevelEnter(): Promise<void> {
    if (os.platform() === 'darwin') {
        await execPromise(`osascript -e 'tell application "Cursor" to activate'`);
        await delay(300);
        await execPromise(`osascript -e 'tell application "System Events" to keystroke return'`);
    }
}

async function executeFirstAvailable(cmds: string[], candidates: string[], label: string): Promise<boolean> {
    for (const id of candidates) {
        if (!cmds.includes(id)) {
            continue;
        }
        try {
            log(`${label}: trying "${id}"`);
            await vscode.commands.executeCommand(id);
            log(`${label}: success with "${id}"`);
            return true;
        } catch (error) {
            log(`${label}: failed "${id}" (${String(error)})`);
        }
    }
    log(`${label}: no candidate succeeded`);
    return false;
}

async function focusChatInput(cmds?: string[], openComposer: boolean = true): Promise<boolean> {
    if (!cmds) {
        cmds = await vscode.commands.getCommands(true);
    }

    // For trigger-only send, first try focusing existing chat without opening a new composer.
    const focusedDirectly = await executeFirstAvailable(cmds, FOCUS_COMMANDS, 'focus-chat');
    if (focusedDirectly) {
        await delay(120);
        return true;
    }

    if (!openComposer) {
        return false;
    }

    const opened = await executeFirstAvailable(cmds, OPEN_COMMANDS, 'open-chat');
    await delay(opened ? 250 : 120);
    const focusedAfterOpen = await executeFirstAvailable(cmds, FOCUS_COMMANDS, 'focus-chat-after-open');
    await delay(150);
    return focusedAfterOpen;
}

/**
 * Injects text and optionally submits — ported from cursor-autopilot.
 * Steps: Open composer → focus → paste → submit → OS fallback (Cmd+Enter)
 */
async function injectTextToChat(text: string, autoSend: boolean = false): Promise<void> {
    const cmds = await vscode.commands.getCommands(true);
    log(`inject: requested autoSend=${autoSend}, textLength=${text.length}`);

    // 1/2. Ensure chat input focus
    await focusChatInput(cmds, true);
    await delay(200);

    // 3. Paste text
    await vscode.env.clipboard.writeText(text);
    if (cmds.includes(SEND_KEYBIND)) {
        log('inject: using cursor.sendKeyBinding for paste');
        await vscode.commands.executeCommand(SEND_KEYBIND, {
            text: os.platform() === 'darwin' ? 'cmd+v' : 'ctrl+v'
        });
    } else {
        log('inject: using editor.action.clipboardPasteAction');
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
    }
    await delay(200);

    // 4. Submit if autoSend
    if (autoSend) {
        await submitChat(cmds);
    }
}

async function submitChat(cmds?: string[]): Promise<boolean> {
    if (!cmds) {
        cmds = await vscode.commands.getCommands(true);
    }
    log('submit: started');

    // Try built-in submit commands first
    const commandSubmitWorked = await executeFirstAvailable(cmds, SUBMIT_COMMANDS, 'submit-command');
    if (commandSubmitWorked) {
        log('submit: completed via submit command');
        return true;
    }

    if (cmds.includes(SEND_KEYBIND)) {
        try {
            log('submit: trying cursor.sendKeyBinding cmd+enter');
            await vscode.commands.executeCommand(SEND_KEYBIND, {
                text: os.platform() === 'darwin' ? 'cmd+enter' : 'ctrl+enter'
            });
            log('submit: completed via sendKeyBinding cmd+enter');
            return true;
        } catch {
            log('submit: sendKeyBinding cmd+enter failed');
        }

        try {
            log('submit: trying cursor.sendKeyBinding enter');
            await vscode.commands.executeCommand(SEND_KEYBIND, {
                text: 'enter'
            });
            log('submit: completed via sendKeyBinding enter');
            return true;
        } catch {
            log('submit: sendKeyBinding enter failed');
        }
    }

    try {
        log('submit: trying type command newline');
        await vscode.commands.executeCommand('type', { text: '\n' });
        log('submit: completed via type newline');
        return true;
    } catch {
        log('submit: type newline failed');
    }

    // OS-level fallback: Cmd+Enter via AppleScript
    try {
        log('submit: trying osLevelSend (cmd+enter)');
        await osLevelSend();
        log('submit: completed via osLevelSend');
        return true;
    } catch {
        log('submit: osLevelSend failed');
    }

    // Final OS fallback: plain Enter (for users with Enter-to-send)
    try {
        log('submit: trying osLevelEnter');
        await osLevelEnter();
        log('submit: completed via osLevelEnter');
        return true;
    } catch {
        log('submit: osLevelEnter failed');
        return false;
    }
}

export class TaskManager {
    private static fileName = '.promptingtasks';

    static showDebugLogs() {
        output.show(true);
    }

    static async getTasks(): Promise<Task[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return [];
        const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
        if (!fs.existsSync(filePath)) {
            await this.initializeFile(filePath);
            return this.getDefaultTasks();
        }
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            return [];
        }
    }

    private static async initializeFile(filePath: string) {
        fs.writeFileSync(filePath, JSON.stringify(this.getDefaultTasks(), null, 2), 'utf8');
    }

    private static getDefaultTasks(): Task[] {
        return [
            { id: '1', title: 'Refactor Code', prompt: 'Please refactor this code to be more readable and efficient.' },
            { id: '2', title: 'Add Unit Tests', prompt: 'Please write unit tests for the following code using Jest.' }
        ];
    }

    static async saveNewTask(title: string, prompt: string) {
        const tasks = await this.getTasks();
        tasks.push({ id: Date.now().toString(), title, prompt });
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
            fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
        }
    }

    static async deleteTask(task: Task) {
        let tasks = await this.getTasks();
        tasks = tasks.filter(t => t.id !== task.id);
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
            fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
        }
    }

    static async injectTask(task: Task) {
        await injectTextToChat(task.prompt, false);
    }

    static async injectText(text: string, autoSend: boolean = false) {
        try {
            await injectTextToChat(text, autoSend);
        } catch (error) {
            log(`inject: failed (${String(error)})`);
            vscode.window.showErrorMessage(`Injection failed: ${error}`);
        }
    }

    /**
     * Triggers the chat Send button.
     * Uses cursor-autopilot's proven approach:
     * built-in submit commands → Cmd+Enter keybind → AppleScript Cmd+Enter
     */
    static async triggerSend(): Promise<boolean> {
        try {
            const cmds = await vscode.commands.getCommands(true);
            log('triggerSend: requested');

            // First try to send in the currently open chat input.
            await focusChatInput(cmds, false);
            let sent = await submitChat(cmds);
            if (sent) {
                log('triggerSend: success on existing chat');
                return true;
            }

            // If that fails, open/focus chat and retry once.
            log('triggerSend: retrying after open/focus chat');
            await focusChatInput(cmds, true);
            sent = await submitChat(cmds);
            log(`triggerSend: final result=${sent}`);
            return sent;
        } catch (error) {
            log(`triggerSend: failed (${String(error)})`);
            vscode.window.showErrorMessage(`Send failed: ${error}`);
            return false;
        }
    }
}
