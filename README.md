# TODOS##

**The best way to save, view, and manage your tasks without leaving your code.**

TODOS## scans your workspace for Conventional Commits-style task tags and organizes them into a grouped Tree View in the VS Code Activity Bar. It supports standard text files as well as **Jupyter Notebooks (.ipynb)**, automatically cleaning up JSON artifacts so your tasks look clean.

## ✨ Features

* **Activity Bar Integration:** View all tasks in a dedicated explorer panel.
* **Smart Grouping:** Tasks are automatically grouped into categorized folders (e.g., Features, Bug Fixes, Refactors) for easier navigation.
* **Conventional Types:** Distinguish between tasks using standard keywords like `feat`, `fix`, `docs`, `refactor`, and more.
* **Scope Support:** Add optional context to your tasks using parentheses (e.g., `feat(ui)::`).
* **Clean Syntax:** Uses a double-colon `::` delimiter to ensure tasks are explicitly marked and never confused with standard text, comments, or actual git commits.
* **Urgency Levels:** Append `!` to any tag (e.g., `fix!::`) to mark it as **Important**. This highlights the item in red with an error color.
* **Ignore Support:** Exclude specific files or folders using a `.todoignore` file.
* **Auto-Refresh:** The list updates automatically when you save a file or type a new tag.

## 🚀 Usage

Simply add comments to your code using the specific Conventional Commits syntax followed by a double colon `::`.

**Format:** `keyword(scope)!:: Your description`

### Supported Keywords

| Keyword | Icon | Description |
| --- | --- | --- |
| **feat** | ✨ | A new feature or addition. |
| **fix** | 🐛 | Bug fixes or broken code. |
| **docs** | 📚 | Changes to the documentation. |
| **style** | 🎨 | Formatting, missing semi-colons, etc; no production code change. |
| **refactor** | 🛠️ | Refactoring production code (e.g., renaming a variable). |
| **test** | 🧪 | Adding missing tests, refactoring tests; no production code change. |
| **chore** | ⚙️ | Changes that do not relate to a fix/feature and don't modify src/test files. |
| **perf** | ⚡ | Performance improvements. |
| **ci** | 🖥️ | Continuous integration related changes. |
| **build** | 📦 | Changes that affect the build system or external dependencies. |

### Mark as Important

Add an exclamation mark `!` immediately after the keyword (or scope) to mark it as urgent. These items will appear **Red** in the tree view.

### Examples

```typescript
// feat(auth):: Implement Google OAuth login
// fix!:: Critical memory leak in the main loop causing crash
// refactor(api):: Extract fetch logic to a separate service
// style:: Format document according to Prettier rules
// remove:: Deprecated legacy code (Use chore or refactor for this now)

```

In Python / Jupyter:

```python
# perf(db):: Optimize query execution time
# test:: Add unit tests for the user model

```

## ⚙️ Configuration (.todoignore)

By default, the extension ignores `node_modules`. To ignore other files or directories, create a `.todoignore` file in the root of your workspace.

The syntax is similar to `.gitignore`.

**Example `.todoignore`:**

```text
# Ignore build directories
dist/
build/

# Ignore specific files
legacy_script.js
temp_notes.txt

```

## ⌨️ Commands

* `myTodoView.refresh`: Manually triggers a scan of the workspace for TODOs.

---

**Enjoying the extension?** Feel free to contribute or report issues on GitHub!
