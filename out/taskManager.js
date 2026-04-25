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
exports.TaskManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TaskManager {
    static async getTasks() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return [];
        const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
        if (!fs.existsSync(filePath)) {
            await this.initializeFile(filePath);
            return this.getDefaultTasks();
        }
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            return [];
        }
    }
    static async initializeFile(filePath) {
        fs.writeFileSync(filePath, JSON.stringify(this.getDefaultTasks(), null, 2), 'utf8');
    }
    static getDefaultTasks() {
        return [
            { id: '1', title: 'Refactor Code', prompt: 'Please refactor this code to be more readable and efficient.' },
            { id: '2', title: 'Add Unit Tests', prompt: 'Please write unit tests for the following code using Jest.' }
        ];
    }
    static async saveNewTask(title, prompt) {
        const tasks = await this.getTasks();
        tasks.push({ id: Date.now().toString(), title, prompt });
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
            fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
        }
    }
    static async deleteTask(task) {
        let tasks = await this.getTasks();
        tasks = tasks.filter(t => t.id !== task.id);
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
            fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
        }
    }
    static async injectTask(task) {
        await this.injectText(task.prompt);
    }
    /**
     * Injects text into the Cursor chat window.
     * This is the SIMPLE approach: copy to clipboard → focus chat → paste.
     * This is proven to work from the sidebar.
     */
    static async injectText(text, _autoSend = false) {
        try {
            // 1. Copy text to clipboard
            await vscode.env.clipboard.writeText(text);
            // 2. Focus the chat window (same window, not new)
            try {
                await vscode.commands.executeCommand('cursor.chat.focus');
            }
            catch (e) { }
            // 3. Wait for focus to settle
            await new Promise(resolve => setTimeout(resolve, 500));
            // 4. Paste
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Injection failed: ${error}`);
        }
    }
    /**
     * Attempts to trigger the "Send" button in Cursor's chat.
     * Note: This is best-effort. Cursor's chat widget doesn't expose
     * a reliable submit command. You may need to press Enter manually.
     */
    static async triggerSend() {
        const sendCommands = [
            'aichat.action.submit',
            'aichat.accept',
            'cursor.chat.accept',
            'composer.action.accept',
            'composer.submit',
            'workbench.action.chat.acceptInput'
        ];
        for (const cmd of sendCommands) {
            try {
                await vscode.commands.executeCommand(cmd);
            }
            catch (e) { }
        }
    }
}
exports.TaskManager = TaskManager;
TaskManager.fileName = '.promptingtasks';
//# sourceMappingURL=taskManager.js.map