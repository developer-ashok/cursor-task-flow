export interface Task {
    id: string;
    title: string;
    prompt: string;
    category?: string;
}
export declare class TaskManager {
    private static fileName;
    static getTasks(): Promise<Task[]>;
    private static initializeFile;
    private static getDefaultTasks;
    static injectTask(task: Task): Promise<void>;
}
//# sourceMappingURL=taskManager.d.ts.map