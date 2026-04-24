import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Task {
    id: string;
    title: string;
    prompt: string;
    category?: string;
}

export class TaskManager {
    private static fileName = '.promptingtasks';

    static async getTasks(): Promise<Task[]> {
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
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to read ${this.fileName}: ${error}`);
            return [];
        }
    }

    private static async initializeFile(filePath: string) {
        const defaultTasks = this.getDefaultTasks();
        fs.writeFileSync(filePath, JSON.stringify(defaultTasks, null, 2), 'utf8');
        vscode.window.showInformationMessage(`Initialized ${this.fileName} with default tasks.`);
    }

    private static getDefaultTasks(): Task[] {
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
        if (!title) return;
        const prompt = await vscode.window.showInputBox({ prompt: "Enter the prompt template", placeHolder: "e.g. Please refactor this..." });
        if (!prompt) return;
        await this.saveNewTask(title, prompt);
    }

    static async saveNewTask(title: string, prompt: string) {
        try {
            const tasks = await this.getTasks();
            const newTask: Task = {
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
            } else {
                throw new Error("No open workspace found. Please open a folder first.");
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error saving task: ${error}`);
        }
    }

    static async deleteTask(task: Task) {
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete task "${task.title}"?`,
            { modal: true },
            "Delete"
        );

        if (confirm !== "Delete") return;

        let tasks = await this.getTasks();
        tasks = tasks.filter(t => t.id !== task.id);
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const filePath = path.join(workspaceFolders[0].uri.fsPath, this.fileName);
            fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf8');
            vscode.window.showInformationMessage(`Task "${task.title}" deleted.`);
        }
    }

    static async injectTask(task: Task) {
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
            } catch (e) {
                // Command might not exist, ignore and try next
            }
        }

        // 3. Paste the content
        if (focused) {
            // Wait slightly longer for the window to open and focus
            setTimeout(async () => {
                await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            }, 300);
        } else {
            vscode.window.showInformationMessage(`Prompt copied! Paste it into the chat (Cmd+L or Cmd+I).`);
        }
    }
}
