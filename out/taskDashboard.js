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
exports.TaskDashboard = void 0;
const vscode = __importStar(require("vscode"));
const taskManager_1 = require("./taskManager");
class TaskDashboard {
    static show(_context, taskProvider, showForm = false) {
        const panel = vscode.window.createWebviewPanel(this.viewType, 'Task Dashboard', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this._getHtmlForWebview();
        // If showForm is true, tell the webview to open it
        if (showForm) {
            setTimeout(() => {
                panel.webview.postMessage({ command: 'openForm' });
            }, 500);
        }
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'getTasks':
                    const tasks = await taskManager_1.TaskManager.getTasks();
                    panel.webview.postMessage({ command: 'renderTasks', tasks });
                    break;
                case 'saveNewTask':
                    await taskManager_1.TaskManager.saveNewTask(message.title, message.prompt);
                    const updatedTasks = await taskManager_1.TaskManager.getTasks();
                    panel.webview.postMessage({ command: 'renderTasks', tasks: updatedTasks });
                    taskProvider.refresh();
                    break;
                case 'deleteTask':
                    await taskManager_1.TaskManager.deleteTask(message.task);
                    const tasksAfterDelete = await taskManager_1.TaskManager.getTasks();
                    panel.webview.postMessage({ command: 'renderTasks', tasks: tasksAfterDelete });
                    taskProvider.refresh();
                    break;
                case 'injectTask':
                    await taskManager_1.TaskManager.injectTask(message.task);
                    break;
            }
        });
        // Initial load
        taskManager_1.TaskManager.getTasks().then(tasks => {
            panel.webview.postMessage({ command: 'renderTasks', tasks });
        });
    }
    static _getHtmlForWebview() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Task Dashboard</title>
                <style>
                    :root {
                        --bg: #0f1117;
                        --card-bg: rgba(255, 255, 255, 0.05);
                        --accent: #3b82f6;
                        --accent-hover: #2563eb;
                        --text: #e2e8f0;
                        --text-dim: #94a3b8;
                        --danger: #ef4444;
                        --input-bg: rgba(255, 255, 255, 0.07);
                    }
                    body {
                        background-color: var(--bg);
                        color: var(--text);
                        font-family: 'Inter', -apple-system, sans-serif;
                        padding: 40px;
                        margin: 0;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 30px;
                    }
                    h1 {
                        font-size: 28px;
                        font-weight: 800;
                        margin: 0;
                        background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    
                    /* Form Styles */
                    #taskForm {
                        display: none;
                        background: var(--card-bg);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 16px;
                        padding: 24px;
                        margin-bottom: 40px;
                        animation: slideDown 0.3s ease-out;
                    }
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .form-group {
                        margin-bottom: 16px;
                    }
                    label {
                        display: block;
                        font-size: 14px;
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: var(--text-dim);
                    }
                    input, textarea {
                        width: 100%;
                        background: var(--input-bg);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        padding: 12px;
                        color: white;
                        font-family: inherit;
                        box-sizing: border-box;
                    }
                    input:focus, textarea:focus {
                        outline: none;
                        border-color: var(--accent);
                    }
                    .form-actions {
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                    }

                    /* Button Styles */
                    .btn {
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        border: none;
                        transition: all 0.2s;
                    }
                    .btn-primary { background: var(--accent); color: white; }
                    .btn-primary:hover { background: var(--accent-hover); }
                    .btn-ghost { background: transparent; color: var(--text-dim); border: 1px solid rgba(255, 255, 255, 0.1); }
                    .btn-ghost:hover { background: rgba(255, 255, 255, 0.05); color: white; }

                    .grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                        gap: 24px;
                    }
                    .card {
                        background: var(--card-bg);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        padding: 24px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        flex-direction: column;
                    }
                    .card:hover {
                        border-color: var(--accent);
                        transform: translateY(-8px);
                        box-shadow: 0 12px 24px rgba(0,0,0,0.3);
                    }
                    .card h3 {
                        margin: 0 0 12px 0;
                        font-size: 20px;
                        font-weight: 700;
                    }
                    .card p {
                        font-size: 15px;
                        color: var(--text-dim);
                        line-height: 1.6;
                        flex-grow: 1;
                        margin-bottom: 24px;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .card-actions {
                        display: flex;
                        gap: 12px;
                    }
                    .btn-inject {
                        flex-grow: 1;
                        background: rgba(59, 130, 246, 0.15);
                        color: var(--accent);
                        border: 1px solid var(--accent);
                    }
                    .btn-inject:hover { background: var(--accent); color: white; }
                    .btn-delete {
                        color: var(--danger);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        background: transparent;
                    }
                    .btn-delete:hover { background: var(--danger); color: white; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Task Flow</h1>
                    <button class="btn btn-primary" onclick="showForm()">+ Add Task</button>
                </div>

                <div id="taskForm">
                    <div class="form-group">
                        <label>Task Title</label>
                        <input type="text" id="title" placeholder="e.g. Optimized Refactor" onkeydown="handleKey(event)">
                    </div>
                    <div class="form-group">
                        <label>Prompt Template</label>
                        <textarea id="prompt" rows="4" placeholder="Enter your AI prompt here..." onkeydown="handleKey(event)"></textarea>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-ghost" onclick="hideForm()">Cancel</button>
                        <button class="btn btn-primary" onclick="submitTask()">Save Task (Enter)</button>
                    </div>
                </div>

                <div id="grid" class="grid">
                    <!-- Tasks will be injected here -->
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function handleKey(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            if (e.target.tagName === 'TEXTAREA' && !e.metaKey && !e.ctrlKey) return;
                            submitTask();
                        }
                    }

                    function showForm() {
                        document.getElementById('taskForm').style.display = 'block';
                        document.getElementById('title').focus();
                    }

                    function hideForm() {
                        document.getElementById('taskForm').style.display = 'none';
                        document.getElementById('title').value = '';
                        document.getElementById('prompt').value = '';
                    }

                    function submitTask() {
                        const title = document.getElementById('title').value;
                        const prompt = document.getElementById('prompt').value;
                        if (title && prompt) {
                            vscode.postMessage({ command: 'saveNewTask', title, prompt });
                            hideForm();
                        }
                    }

                    function injectTask(task) {
                        vscode.postMessage({ command: 'injectTask', task });
                    }

                    function deleteTask(task) {
                        vscode.postMessage({ command: 'deleteTask', task });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'renderTasks') {
                            render(message.tasks);
                        } else if (message.command === 'openForm') {
                            showForm();
                        }
                    });

                    function render(tasks) {
                        const grid = document.getElementById('grid');
                        if (tasks.length === 0) {
                            grid.innerHTML = '<div style="color: var(--text-dim); text-align: center; grid-column: 1/-1; padding: 40px;">No tasks yet. Click "+ Add Task" to get started!</div>';
                            return;
                        }
                        grid.innerHTML = tasks.map(task => \`
                            <div class="card">
                                <h3>\${task.title}</h3>
                                <p>\${task.prompt}</p>
                                <div class="card-actions">
                                    <button class="btn btn-inject" onclick='injectTask(\${JSON.stringify(task)})'>Inject to Chat</button>
                                    <button class="btn btn-delete btn" onclick='deleteTask(\${JSON.stringify(task)})'>Delete</button>
                                </div>
                            </div>
                        \`).join('');
                    }
                </script>
            </body>
            </html>
        `;
    }
}
exports.TaskDashboard = TaskDashboard;
TaskDashboard.viewType = 'taskDashboard';
//# sourceMappingURL=taskDashboard.js.map