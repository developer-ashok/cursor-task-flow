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
    static fileName = '.promptingtasks';
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
    static async injectTask(task) {
        // Copy to clipboard as a fallback or if no direct API exists
        await vscode.env.clipboard.writeText(task.prompt);
        // Try to focus Cursor Chat and paste
        // Note: Cursor specific commands are often proprietary, but 'aichat.focus' or 'cursor.chat.focus' sometimes work.
        try {
            await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
            // This is a common way to trigger AI chat in Cursor if configured
            // Or we just tell the user it's copied.
            vscode.window.showInformationMessage(`Prompt copied to clipboard: "${task.title}". Paste it in the AI chat.`);
        }
        catch (e) {
            console.error(e);
        }
    }
}
exports.TaskManager = TaskManager;
//# sourceMappingURL=taskManager.js.map