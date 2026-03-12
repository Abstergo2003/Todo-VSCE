import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

type TodoType = "feat" | "fix" | "docs" | "style" | "refactor" | "test" | "chore" | "perf" | "ci" | "build";

interface TodoItem {
    fileUri: vscode.Uri;
    line: number;
    text: string;
    important: boolean;
    type: TodoType;
    scope?: string;
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
            if (/\b(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(?:\([^)]+\))?(!?)::/.test(text)) {
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

    const todoRegex = /\b(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(?:\(([^)]+)\))?(!?)::/;

    for (const file of files) {
        try {
            const doc = await vscode.workspace.openTextDocument(file);
            const lines = doc.getText().split(/\r?\n/);
            const isJsonOrIpynb = file.fsPath.endsWith(".ipynb") || file.fsPath.endsWith(".json");

            lines.forEach((line, index) => {
                const match = line.match(todoRegex);
                
                if (match) {
                    const type = match[1] as TodoType;
                    const scope = match[2];
                    const isImportant = match[3] === "!";
                    
                    let cleanText = line.substring(match.index! + match[0].length);
                    
                    cleanText = stripCommentClosings(cleanText.replace(/^[:\s]+/, ""));

                    if (isJsonOrIpynb) {
                        cleanText = cleanText.replace(/\\n/g, "");
                        cleanText = cleanText.replace(/['",]+$/, "");
                    }

                    results.push({
                        fileUri: file,
                        line: index + 1,
                        text: cleanText.trim(),
                        important: isImportant,
                        type: type,
                        scope: scope
                    });
                }
            });
        } catch {
            // Silently skip
        }
    }

    return results;
}

function getIconForType(type: TodoType, important: boolean): vscode.ThemeIcon {
    const iconColor = important ? new vscode.ThemeColor("list.errorForeground") : undefined;

    switch (type) {
        case "feat": return new vscode.ThemeIcon("sparkle", iconColor);
        case "fix": return new vscode.ThemeIcon("bug", iconColor);
        case "docs": return new vscode.ThemeIcon("book", iconColor);
        case "style": return new vscode.ThemeIcon("paintcan", iconColor);
        case "refactor": return new vscode.ThemeIcon("tools", iconColor);
        case "test": return new vscode.ThemeIcon("beaker", iconColor);
        case "chore": return new vscode.ThemeIcon("gear", iconColor);
        case "perf": return new vscode.ThemeIcon("zap", iconColor);
        case "ci": return new vscode.ThemeIcon("server-process", iconColor);
        case "build": return new vscode.ThemeIcon("package", iconColor);
        default: return new vscode.ThemeIcon("checklist", iconColor);
    }
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

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (this.isSearching) {
            return Promise.resolve([new SearchingNode("Scanning workspace...")]);
        }

        if (this.items.length === 0) {
            return Promise.resolve([new EmptyNode()]);
        }

        if (element instanceof GroupNode) {
            const nodes = element.items.map(item => new TodoNode(item));
            return Promise.resolve(nodes);
        }

        const groups = new Map<TodoType, TodoItem[]>();
        for (const item of this.items) {
            if (!groups.has(item.type)) {
                groups.set(item.type, []);
            }
            groups.get(item.type)!.push(item);
        }

        const groupOrder: TodoType[] = ["feat", "fix", "refactor", "perf", "style", "test", "docs", "build", "ci", "chore"];
        const nodes: vscode.TreeItem[] = [];

        for (const type of groupOrder) {
            const groupItems = groups.get(type);
            if (groupItems && groupItems.length > 0) {
                nodes.push(new GroupNode(type, groupItems));
            }
        }

        return Promise.resolve(nodes);
    }
}

class GroupNode extends vscode.TreeItem {
    constructor(public readonly type: TodoType, public readonly items: TodoItem[]) {
        super(GroupNode.getGroupLabel(type, items.length), vscode.TreeItemCollapsibleState.Expanded);
        
        this.iconPath = getIconForType(type, false);
        this.contextValue = "group";
        this.tooltip = `Contains ${items.length} ${type} item(s)`;
    }

    private static getGroupLabel(type: TodoType, count: number): string {
        const labels: Record<TodoType, string> = {
            feat: "Features",
            fix: "Bug Fixes",
            docs: "Documentation",
            style: "Styles",
            refactor: "Refactors",
            test: "Tests",
            chore: "Chores",
            perf: "Performance",
            ci: "CI",
            build: "Builds"
        };
        return `${labels[type]} (${count})`;
    }
}

class TodoNode extends vscode.TreeItem {
    constructor(item: TodoItem) {
        super(`${item.text || "(no description)"}`);
        
        const fileName = path.basename(item.fileUri.fsPath);
        const scopeText = item.scope ? `(${item.scope}) ` : "";
        
        this.description = `${scopeText}@ ${fileName}:${item.line}`;
        this.tooltip = `${item.scope ? `(${item.scope.toUpperCase()})` : ""} \n${item.text}\n${item.fileUri.fsPath}:${item.line}`;

        this.iconPath = getIconForType(item.type, item.important);

        this.command = {
            command: "vscode.open",
            title: "Open Item",
            arguments: [
                item.fileUri,
                { selection: new vscode.Range(item.line - 1, 0, item.line - 1, 0) }
            ]
        };
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

function stripCommentClosings(text: string): string {
    const closingTags = [
        "*/",   // C, C++, Java, JS, TS, CSS, SQL
        "-->",  // HTML, XML, Markdown
        '"""',  // Python (docstrings)
        "'''",  // Python (docstrings)
        "=#",   // Julia (wielolinijkowe)
        "=end", // Ruby
        "#>",   // PowerShell
        "-}",   // Haskell
        "*)",   // Pascal, Delphi, F#
        "%}",   // MATLAB
        "|#"    // Lisp, Clojure
    ];

    let earliestCutIndex = -1;

    for (const tag of closingTags) {
        const index = text.indexOf(tag);
        if (index !== -1) {
            if (earliestCutIndex === -1 || index < earliestCutIndex) {
                earliestCutIndex = index;
            }
        }
    }

    if (earliestCutIndex !== -1) {
        return text.substring(0, earliestCutIndex).trim();
    }

    return text.trim();
}