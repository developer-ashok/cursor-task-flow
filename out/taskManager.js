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
        if (!workspaceFolders) {
            return [];
        }
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
            vscode.window.showErrorMessage(`Failed to read ${this.fileName}: ${error}`);
            return [];
        }
    }
    static async initializeFile(filePath) {
        const defaultTasks = this.getDefaultTasks();
        fs.writeFileSync(filePath, JSON.stringify(defaultTasks, null, 2), 'utf8');
        vscode.window.showInformationMessage(`Initialized ${this.fileName} with default tasks.`);
    }
    static getDefaultTasks() {
        return [
            {
                id: "1",
                title: "Write Unit Tests",
                prompt: "Please write comprehensive unit tests for the selected code using Jest. Include edge cases and mock dependencies where necessary.",
                category: "Testing"
            },
            {
                id: "2",
                title: "Refactor for Readability",
                prompt: "Refactor this code to improve readability and maintainability. Follow SOLID principles and ensure naming is clear.",
                category: "Refactoring"
            }
        ];
    }
    static async addTask() {
        const title = await vscode.window.showInputBox({ prompt: "Enter task title", placeHolder: "e.g. My New Task" });
        if (!title)
            return;
        const prompt = await vscode.window.showInputBox({ prompt: "Enter the prompt template", placeHolder: "e.g. Please refactor this..." });
        if (!prompt)
            return;
        await this.saveNewTask(title, prompt);
    }
    static async saveNewTask(title, prompt) {
        try {
            const tasks = await this.getTasks();
            const newTask = {
                id: Date.now().toString(),
                title,
                prompt
            };
            tasks.push(newTask);
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
                fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
                vscode.window.showInformationMessage(`Task "${title}" saved!`);
            }
            else {
                throw new Error("No open workspace found. Please open a folder first.");
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error saving task: ${error}`);
        }
    }
    static async deleteTask(task) {
        const confirm = await vscode.window.showWarningMessage(`Are you sure you want to delete task "${task.title}"?`, { modal: true }, "Delete");
        if (confirm !== "Delete")
            return;
        let tasks = await this.getTasks();
        tasks = tasks.filter(t => t.id !== task.id);
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
            fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
            vscode.window.showInformationMessage(`Task "${task.title}" deleted.`);
        }
    }
    static async injectTask(task) {
        // 1. Copy to clipboard
        await vscode.env.clipboard.writeText(task.prompt);
        // 2. Try to focus the AI Chat window
        // We try multiple known Cursor command IDs
        const chatCommands = [
            'aichat.focus',
            'cursor.chat.focus',
            'composer.focus',
            'cursor.composer.focus',
            'workbench.action.chat.open',
            'aichat.new'
        ];
        let focused = false;
        for (const cmd of chatCommands) {
            try {
                await vscode.commands.executeCommand(cmd);
                focused = true;
                break;
            }
            catch (e) {
                // Command might not exist, ignore and try next
            }
        }
        // 3. Paste the content
        if (focused) {
            // Wait slightly longer for the window to open and focus
            setTimeout(async () => {
                await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            }, 300);
        }
        else {
            vscode.window.showInformationMessage(`Prompt copied! Paste it into the chat (Cmd+L or Cmd+I).`);
        }
    }
}
exports.TaskManager = TaskManager;
TaskManager.fileName = '.promptingtasks';
//# sourceMappingURL=taskManager.js.map