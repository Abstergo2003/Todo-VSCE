import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// 1. Defined valid types
type TodoType = "TODO" | "FIX" | "ADD" | "REMOVE";

interface TodoItem {
    fileUri: vscode.Uri;
    line: number;
    text: string;
    important: boolean;
    type: TodoType; // 2. Added type property
}

export function activate(context: vscode.ExtensionContext) {
    const todoProvider = new TodoTreeDataProvider();
    vscode.window.registerTreeDataProvider("myTodoView", todoProvider);

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
            todoProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
            const text = e.document.getText();
            // 3. Updated quick check to include new keywords
            if (/(TODO|FIX|ADD|REMOVE)/.test(text)) {
                todoProvider.refresh();
            }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
            todoProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeVisibleTextEditors(() => {
            todoProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("myTodoView.refresh", () => {
            todoProvider.refresh();
        })
    );

    const interval = setInterval(() => todoProvider.refresh(), 60_000);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });

    todoProvider.refresh();
}

async function readTodoIgnore(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) { return []; };

    const ignoreFiles: string[] = [];
    for (const folder of workspaceFolders) {
        const ignorePath = path.join(folder.uri.fsPath, ".todoignore");
        if (fs.existsSync(ignorePath)) {
            const lines = fs.readFileSync(ignorePath, "utf-8")
                .split(/\r?\n/)
                .map(l => l.trim())
                .filter(l => !!l && !l.startsWith("#"));
            lines.forEach(l => ignoreFiles.push(l));
        }
    }
    return ignoreFiles;
}

async function findTodosInWorkspace(): Promise<TodoItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) { return []; };

    const ignorePatterns = await readTodoIgnore();
    const ignoreGlob = ignorePatterns.length > 0 ? `{${ignorePatterns.join(",")}}` : undefined;

    const files = await vscode.workspace.findFiles("**/*", ignoreGlob ?? "**/node_modules/**");
    const results: TodoItem[] = [];

    // Captures the Keyword (Group 1) and the Optional Exclamation (Group 2)
    const todoRegex = /\b(TODO|FIX|ADD|REMOVE)(!?)/;

    for (const file of files) {
        try {
            const doc = await vscode.workspace.openTextDocument(file);
            const lines = doc.getText().split(/\r?\n/);
            const isJsonOrIpynb = file.fsPath.endsWith(".ipynb") || file.fsPath.endsWith(".json");

            lines.forEach((line, index) => {
                const match = line.match(todoRegex);
                
                if (match) {
                    const type = match[1] as TodoType;
                    const isImportant = match[2] === "!"; // Checks if "!" exists in Group 2
                    
                    // 1. Cut off the keyword
                    let cleanText = line.substring(match.index! + match[0].length);
                    
                    // 2. Remove standard separators (: or space)
                    cleanText = cleanText.replace(/^[:\s]+/, "");

                    // 3. Clean JSON/IPYNB artifacts
                    if (isJsonOrIpynb) {
                        cleanText = cleanText.replace(/\\n/g, "");
                        cleanText = cleanText.replace(/['",]+$/, "");
                    }

                    results.push({
                        fileUri: file,
                        line: index + 1,
                        text: cleanText.trim(),
                        important: isImportant,
                        type: type
                    });
                }
            });
        } catch {
            // Silently skip
        }
    }

    return results;
}

class TodoTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private items: TodoItem[] = [];
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private isSearching = false;
    private refreshPromise: Promise<void> | null = null;

    async refresh() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.doRefresh();
        await this.refreshPromise;
        this.refreshPromise = null;
    }

    private async doRefresh() {
        try {
            this.isSearching = true;
            this._onDidChangeTreeData.fire();

            const todos = await findTodosInWorkspace();
            this.items = todos;
        } catch (error) {
            console.error("Error refreshing TODOs:", error);
        } finally {
            this.isSearching = false;
            this._onDidChangeTreeData.fire();
        }
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        if (this.isSearching) {
            return Promise.resolve([new SearchingNode("Scanning workspace...")]);
        }

        if (this.items.length === 0) {
            return Promise.resolve([new EmptyNode()]);
        }

        const activeEditor = vscode.window.activeTextEditor;
        const currentPath = activeEditor?.document.uri.fsPath.toLowerCase() ?? "";

        const currentFileTodos = this.items.filter(
            t => t.fileUri.fsPath.toLowerCase() === currentPath
        );
        const otherTodos = this.items.filter(
            t => t.fileUri.fsPath.toLowerCase() !== currentPath
        );

        const nodes: vscode.TreeItem[] = [];

        for (const item of currentFileTodos) {
            nodes.push(new TodoNode(item));
        }

        if (currentFileTodos.length > 0 && otherTodos.length > 0) {
            nodes.push(new SpacerNode());
        }

        for (const item of otherTodos) {
            nodes.push(new TodoNode(item));
        }

        return Promise.resolve(nodes);
    }
}

class TodoNode extends vscode.TreeItem {
    constructor(item: TodoItem) {
        super(`${item.text || "(no description)"}`);
        
        const fileName = path.basename(item.fileUri.fsPath);
        
        this.description = `${item.type} @ ${fileName}:${item.line}`;
        this.tooltip = `[${item.type}${item.important ? "!" : ""}] ${item.fileUri.fsPath}:${item.line}\n${item.text}`;

        this.iconPath = this.getIconForType(item.type, item.important);

        this.command = {
            command: "vscode.open",
            title: "Open Item",
            arguments: [
                item.fileUri,
                { selection: new vscode.Range(item.line - 1, 0, item.line - 1, 0) }
            ]
        };
    }

    private getIconForType(type: TodoType, important: boolean): vscode.ThemeIcon {
        // If important, color the icon Red ("list.errorForeground")
        const iconColor = important ? new vscode.ThemeColor("list.errorForeground") : undefined;

        switch (type) {
            case "FIX":
                return new vscode.ThemeIcon("bug", iconColor);
            case "ADD":
                return new vscode.ThemeIcon("diff-added", iconColor);
            case "REMOVE":
                return new vscode.ThemeIcon("diff-removed", iconColor);
            case "TODO":
            default:
                return new vscode.ThemeIcon("checklist", iconColor);
        }
    }
}

class SpacerNode extends vscode.TreeItem {
    constructor() {
        super("──────────", vscode.TreeItemCollapsibleState.None);
        this.contextValue = "spacer";
    }
}

class SearchingNode extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon("loading~spin");
        this.contextValue = "searching";
    }
}

class EmptyNode extends vscode.TreeItem {
    constructor() {
        super("No items found", vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon("check-all");
        this.contextValue = "empty";
    }
}