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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const taskProvider_1 = require("./taskProvider");
const taskManager_1 = require("./taskManager");
const taskDashboard_1 = require("./taskDashboard");
const telegramManager_1 = require("./telegramManager");
function activate(context) {
    const taskProvider = new taskProvider_1.TaskProvider();
    // Read from settings
    const config = vscode.workspace.getConfiguration('cursorTaskFlow');
    const token = config.get('telegramBotToken');
    const enabled = config.get('enableTelegramSync');
    if (enabled && token) {
        telegramManager_1.TelegramManager.startSync(token);
    }
    // Handle configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('cursorTaskFlow')) {
            const newConfig = vscode.workspace.getConfiguration('cursorTaskFlow');
            const newToken = newConfig.get('telegramBotToken');
            const newEnabled = newConfig.get('enableTelegramSync');
            if (newEnabled && newToken) {
                telegramManager_1.TelegramManager.startSync(newToken);
            }
            else {
                telegramManager_1.TelegramManager.stopSync();
            }
        }
    });
    // Register the TreeView
    vscode.window.registerTreeDataProvider('cursorTaskFlowView', taskProvider);
    // Register Dashboard Command
    context.subscriptions.push(vscode.commands.registerCommand('cursorTaskFlow.openDashboard', () => {
        taskDashboard_1.TaskDashboard.show(context, taskProvider);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('cursorTaskFlow.refreshTasks', () => {
        taskProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('cursorTaskFlow.addTask', async () => {
        taskDashboard_1.TaskDashboard.show(context, taskProvider, true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('cursorTaskFlow.deleteTask', async (item) => {
        // item can be a TaskTreeItem (from context menu) or a Task (from direct call)
        const task = item.task || item;
        if (task && task.id) {
            await taskManager_1.TaskManager.deleteTask(task);
            taskProvider.refresh();
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('cursorTaskFlow.injectTask', async (task) => {
        await taskManager_1.TaskManager.injectTask(task);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('cursorTaskFlow.openLogs', () => {
        taskManager_1.TaskManager.showDebugLogs();
    }));
    // Initial load message
    console.log('Cursor Task Flow is now active!');
}
function deactivate() { }
//# sourceMappingURL=extension.js.map