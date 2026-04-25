import * as vscode from 'vscode';
import { TaskProvider } from './taskProvider';
import { TaskManager, Task } from './taskManager';
import { TaskDashboard } from './taskDashboard';
import { TelegramManager } from './telegramManager';

export function activate(context: vscode.ExtensionContext) {
    const taskProvider = new TaskProvider();
    
    // Read from settings
    const config = vscode.workspace.getConfiguration('cursorTaskFlow');
    const token = config.get<string>('telegramBotToken');
    const enabled = config.get<boolean>('enableTelegramSync');

    if (enabled && token) {
        TelegramManager.startSync(token);
    }

    // Handle configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('cursorTaskFlow')) {
            const newConfig = vscode.workspace.getConfiguration('cursorTaskFlow');
            const newToken = newConfig.get<string>('telegramBotToken');
            const newEnabled = newConfig.get<boolean>('enableTelegramSync');

            if (newEnabled && newToken) {
                TelegramManager.startSync(newToken);
            } else {
                TelegramManager.stopSync();
            }
        }
    });

    // Register the TreeView
    vscode.window.registerTreeDataProvider('cursorTaskFlowView', taskProvider);

    // Register Dashboard Command
    context.subscriptions.push(
        vscode.commands.registerCommand('cursorTaskFlow.openDashboard', () => {
            TaskDashboard.show(context, taskProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cursorTaskFlow.refreshTasks', () => {
            taskProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cursorTaskFlow.addTask', async () => {
            TaskDashboard.show(context, taskProvider, true);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cursorTaskFlow.deleteTask', async (item: any) => {
            // item can be a TaskTreeItem (from context menu) or a Task (from direct call)
            const task = item.task || item; 
            if (task && task.id) {
                await TaskManager.deleteTask(task);
                taskProvider.refresh();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cursorTaskFlow.injectTask', async (task: Task) => {
            await TaskManager.injectTask(task);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cursorTaskFlow.openLogs', () => {
            TaskManager.showDebugLogs();
        })
    );

    // Initial load message
    console.log('Cursor Task Flow is now active!');
}

export function deactivate() {}
