import * as vscode from 'vscode';
import { Task, TaskManager } from './taskManager';

export class TaskProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | void> = new vscode.EventEmitter<TaskTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
        if (element) {
            return [];
        } else {
            const tasks = await TaskManager.getTasks();
            return tasks.map(task => new TaskTreeItem(
                task,
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'cursorTaskFlow.injectTask',
                    title: 'Inject Task',
                    arguments: [task]
                }
            ));
        }
    }
}

class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly task: Task,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        command?: vscode.Command
    ) {
        super(task.title, collapsibleState);
        this.command = command;
        this.tooltip = task.prompt;
        this.description = task.prompt.substring(0, 50) + '...';
        this.contextValue = 'task';
    }
}
