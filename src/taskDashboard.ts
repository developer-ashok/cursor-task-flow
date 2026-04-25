import * as vscode from 'vscode';
import { TaskManager } from './taskManager';

export class TaskDashboard {
    public static readonly viewType = 'taskDashboard';

    public static show(_context: vscode.ExtensionContext, taskProvider: any, showForm: boolean = false) {
        const panel = vscode.window.createWebviewPanel(
            this.viewType,
            'Task Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const config = vscode.workspace.getConfiguration('cursorTaskFlow');
        const initialToken = config.get<string>('telegramBotToken') || '';
        const initialEnabled = config.get<boolean>('enableTelegramSync') || false;

        panel.webview.html = this._getHtmlForWebview(initialToken, initialEnabled);

        if (showForm) {
            setTimeout(() => {
                panel.webview.postMessage({ command: 'openForm' });
            }, 500);
        }

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'saveNewTask':
                    await TaskManager.saveNewTask(message.title, message.prompt);
                    const updatedTasks = await TaskManager.getTasks();
                    panel.webview.postMessage({ command: 'renderTasks', tasks: updatedTasks });
                    taskProvider.refresh();
                    break;
                case 'deleteTask':
                    await TaskManager.deleteTask(message.task);
                    const tasksAfterDelete = await TaskManager.getTasks();
                    panel.webview.postMessage({ command: 'renderTasks', tasks: tasksAfterDelete });
                    taskProvider.refresh();
                    break;
                case 'injectTask':
                    // Close the dashboard first so it doesn't steal focus from chat
                    panel.dispose();
                    // Small delay to let the panel close
                    await new Promise(r => setTimeout(r, 300));
                    await TaskManager.injectTask(message.task);
                    break;
                case 'saveSettings':
                    const config = vscode.workspace.getConfiguration('cursorTaskFlow');
                    await config.update('telegramBotToken', message.token, vscode.ConfigurationTarget.Global);
                    await config.update('enableTelegramSync', message.enabled, vscode.ConfigurationTarget.Global);
                    vscode.window.showInformationMessage("Telegram Settings Updated!");
                    break;
            }
        });

        TaskManager.getTasks().then(tasks => {
            panel.webview.postMessage({ command: 'renderTasks', tasks });
        });
    }

    private static _getHtmlForWebview(token: string, enabled: boolean) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
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
                    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                    h1 { font-size: 28px; font-weight: 800; margin: 0; background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                    .nav-actions { display: flex; gap: 12px; }
                    .panel { display: none; background: var(--card-bg); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 24px; margin-bottom: 40px; }
                    .form-group { margin-bottom: 16px; }
                    label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text-dim); }
                    input, textarea { width: 100%; background: var(--input-bg); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; color: white; font-family: inherit; box-sizing: border-box; }
                    .checkbox-group { display: flex; align-items: center; gap: 10px; cursor: pointer; }
                    .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
                    .btn-primary { background: var(--accent); color: white; }
                    .btn-ghost { background: transparent; color: var(--text-dim); border: 1px solid rgba(255, 255, 255, 0.1); }
                    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
                    .card { background: var(--card-bg); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 24px; transition: all 0.3s ease; display: flex; flex-direction: column; }
                    .card:hover { border-color: var(--accent); transform: translateY(-8px); }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Task Flow</h1>
                    <div class="nav-actions">
                        <button class="btn btn-ghost" onclick="toggleSettings()">⚙️ Settings</button>
                        <button class="btn btn-primary" onclick="showForm()">+ Add Task</button>
                    </div>
                </div>

                <div id="settingsPanel" class="panel">
                    <h2 style="margin-top:0">Telegram Sync Settings</h2>
                    <div class="form-group">
                        <label>Bot Token</label>
                        <input type="password" id="botToken" value="${token}">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-group">
                            <input type="checkbox" id="syncEnabled" ${enabled ? 'checked' : ''}>
                            Enable Telegram Live Sync
                        </label>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button class="btn btn-ghost" onclick="toggleSettings()">Close</button>
                        <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
                    </div>
                </div>

                <div id="taskForm" class="panel">
                    <h2 style="margin-top:0">Create New Task</h2>
                    <div class="form-group">
                        <label>Task Title</label>
                        <input type="text" id="title" onkeydown="handleKey(event)">
                    </div>
                    <div class="form-group">
                        <label>Prompt Template</label>
                        <textarea id="prompt" rows="4" onkeydown="handleKey(event)"></textarea>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button class="btn btn-ghost" onclick="hideForm()">Cancel</button>
                        <button class="btn btn-primary" onclick="submitTask()">Save Task</button>
                    </div>
                </div>

                <div id="grid" class="grid"></div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function toggleSettings() {
                        const panel = document.getElementById('settingsPanel');
                        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
                        document.getElementById('taskForm').style.display = 'none';
                    }

                    function saveSettings() {
                        const token = document.getElementById('botToken').value;
                        const enabled = document.getElementById('syncEnabled').checked;
                        vscode.postMessage({ command: 'saveSettings', token, enabled });
                        toggleSettings();
                    }

                    function showForm() {
                        document.getElementById('taskForm').style.display = 'block';
                        document.getElementById('settingsPanel').style.display = 'none';
                        document.getElementById('title').focus();
                    }

                    function hideForm() {
                        document.getElementById('taskForm').style.display = 'none';
                    }

                    function submitTask() {
                        const title = document.getElementById('title').value;
                        const prompt = document.getElementById('prompt').value;
                        if (title && prompt) {
                            vscode.postMessage({ command: 'saveNewTask', title, prompt });
                            hideForm();
                        }
                    }

                    function handleKey(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            if (e.target.tagName === 'TEXTAREA' && !e.metaKey && !e.ctrlKey) return;
                            submitTask();
                        }
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
                            grid.innerHTML = '<div style="color: var(--text-dim); text-align: center; grid-column: 1/-1; padding: 40px;">No tasks yet.</div>';
                            return;
                        }
                        grid.innerHTML = tasks.map(task => {
                            return \`
                                <div class="card">
                                    <h3 style="margin:0 0 12px 0; font-size:20px;">\${task.title}</h3>
                                    <p style="font-size:14px; color:var(--text-dim); line-height:1.6; margin-bottom:24px; flex-grow:1;">\${task.prompt}</p>
                                    <div style="display:flex; gap:12px;">
                                        <button class="btn btn-primary" style="flex-grow:1; justify-content:center;" onclick='vscode.postMessage({command:"injectTask",task:\${JSON.stringify(task)}})'>Inject</button>
                                        <button class="btn btn-ghost" style="color:var(--danger);" onclick='vscode.postMessage({command:"deleteTask",task:\${JSON.stringify(task)}})'>🗑️</button>
                                    </div>
                                </div>
                            \`;
                        }).join('');
                    }
                </script>
            </body>
            </html>
        `;
    }
}
