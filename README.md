# TODOS##

**The best way to save, view, and manage your tasks without leaving your code.**

TODOS## scans your workspace for task tags and organizes them into a convenient Tree View in the VS Code Activity Bar. It supports standard text files as well as **Jupyter Notebooks (.ipynb)**, automatically cleaning up JSON artifacts so your tasks look clean.

## ✨ Features

  * **Activity Bar Integration:** View all tasks in a dedicated explorer panel.
  * **Multiple Tag Types:** Distinguish between tasks using `TODO`, `FIX`, `ADD`, and `REMOVE`.
  * **Smart Icons:** Each tag type has a specific icon (Checklist, Bug, Plus, Minus) for quick visual scanning.
  * **Urgency Levels:** Append `!` to any tag (e.g., `FIX!`) to mark it as **Important**. This highlights the item in red with a warning icon.
  * **Ignore Support:** Exclude specific files or folders using a `.todoignore` file.
  * **Auto-Refresh:** The list updates automatically when you save a file or type a new tag.

## 🚀 Usage

Simply add comments to your code using one of the supported keywords.

### Supported Keywords

| Keyword | Icon | Description |
| :--- | :--- | :--- |
| **TODO** | ☑️ | General tasks or reminders. |
| **FIX** | 🐛 | Bug fixes or broken code. |
| **ADD** | ➕ | New features or additions. |
| **REMOVE**| ➖ | Deprecated code or cleanup tasks. |

### Mark as Important

Add an exclamation mark `!` immediately after any keyword to mark it as urgent. These items will appear **Red** in the tree view.

### Examples

```typescript
// TODO Refactor this function later
// FIX! logic error causing crash on startup
// ADD Add unit tests for the login module
// REMOVE Remove console.logs before production
```

In Python / Jupyter:

```python
# TODO: Check data normalization
# FIX! KeyError in loop
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

-----

**Enjoying the extension?** Feel free to contribute or report issues on GitHub\!