import * as vscode from 'vscode';
import { TaskProvider } from './taskProvider';
import { TaskManager, Task } from './taskManager';
import { TaskDashboard } from './taskDashboard';

export function activate(context: vscode.ExtensionContext) {
    const taskProvider = new TaskProvider();
    
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

    // Initial load message
    console.log('Cursor Task Flow is now active!');
}

export function deactivate() {}
