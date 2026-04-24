import * as vscode from 'vscode';
export declare class TaskProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | void>;
    refresh(): void;
    getTreeItem(element: TaskTreeItem): vscode.TreeItem;
    getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]>;
}
declare class TaskTreeItem extends vscode.TreeItem {
    readonly label: string;
    readonly prompt: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly command?: vscode.Command | undefined;
    constructor(label: string, prompt: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: vscode.Command | undefined);
}
export {};
//# sourceMappingURL=taskProvider.d.ts.map