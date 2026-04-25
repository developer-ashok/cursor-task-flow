import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Task {
    id: string;
    title: string;
    prompt: string;
}

export class TaskManager {
    private static fileName = '.promptingtasks';

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
        await this.injectText(task.prompt);
    }

    /**
     * Injects text into the Cursor chat window.
     * This is the SIMPLE approach: copy to clipboard → focus chat → paste.
     * This is proven to work from the sidebar.
     */
    static async injectText(text: string, _autoSend: boolean = false) {
        try {
            // 1. Copy text to clipboard
            await vscode.env.clipboard.writeText(text);

            // 2. Focus the chat window (same window, not new)
            try {
                await vscode.commands.executeCommand('cursor.chat.focus');
            } catch (e) {}

            // 3. Wait for focus to settle
            await new Promise(resolve => setTimeout(resolve, 500));

            // 4. Paste
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        } catch (error) {
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
            } catch (e) {}
        }
    }
}
