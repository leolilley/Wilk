# Wilk CLI Task Execution Display System

## Overview

Inspired by Claude Code's sophisticated task execution display, Wilk CLI will provide real-time visibility into agent operations with hierarchical task breakdown, tool usage tracking, and expandable details. This creates transparency and understanding of complex agent workflows.

## Claude Code Task Display Analysis

### Visual Structure

```
● Task(Analyze LibreChat thinking implementation)
│     ⎿  Read 374 lines (ctrl+r to expand)
│        Found 13 files (ctrl+r to expand)
│        +6 more tool uses
│     Task(Analyze LibreChat thinking implementation)
│     ⎿  Read(client/src/components/Artifacts/Thinking.tsx)
│        Read 90 lines (ctrl+r to expand)
│        +2 more tool uses
```

### Key Features

1. **Hierarchical Task Structure** - Parent tasks contain sub-tasks
2. **Live Progress Updates** - Real-time tool execution feedback
3. **Expandable Details** - `(ctrl+r to expand)` for detailed views
4. **Tool Usage Tracking** - Visible file reads, searches, etc.
5. **Completion Status** - Visual indicators for task states
6. **Aggregated Summaries** - `+6 more tool uses` for brevity

## Wilk CLI Task Display Design

### Basic Task Execution

```bash
$ wilk @code-analyzer "review this codebase for security issues"

● Task(Security Code Review)
│     ⎿  Scanning project structure...
│        Found 127 files (enter to expand)
│        ⎿  Analyzing TypeScript files...
│           ├─ src/auth/login.ts (3 issues found)
│           ├─ src/api/users.ts (1 issue found)
│           └─ src/utils/crypto.ts (checking...)
│        ⎿  Checking dependencies...
│           Found 2 vulnerable packages (enter to expand)
│           +15 more dependency checks
│
● Task(Generate Security Report)
│     ⎿  Categorizing findings...
│        ├─ Critical: 2 issues
│        ├─ High: 4 issues
│        └─ Medium: 8 issues
│     ⎿  Creating recommendations...
│        ✓ Report generated

✓ Security analysis complete (47.3s)
```

### Multi-Agent Collaboration

```bash
$ wilk @code-analyzer @security-expert "comprehensive security audit"

● Task(Comprehensive Security Audit)
│
├─ Agent(code-analyzer)
│  ● Task(Static Analysis)
│  │     ⎿  Read(package.json)
│  │        Loaded 47 dependencies (enter to expand)
│  │     ⎿  Scan(src/**/*.ts)
│  │        Analyzed 89 files (enter to expand)
│  │        +12 more file operations
│  │
├─ Agent(security-expert)
│  ● Task(Vulnerability Assessment)
│  │     ⎿  Check(OWASP Top 10)
│  │        SQL Injection: Not found
│  │        XSS: 3 potential vectors (enter to expand)
│  │        +8 more security checks
│  │     ⎿  Review(authentication flows)
│  │        Found weak password policy (enter to expand)
│  │
● Task(Synthesis & Recommendations)
│     ⎿  Correlating findings...
│        ├─ Cross-referenced 14 issues
│        └─ Prioritized by CVSS score
│     ✓ Final report ready

✓ Audit complete - 23 issues found (2m 15s)
```

### Complex Workflow with Tool Chains

```bash
$ wilk @researcher "analyze market trends and create presentation"

● Task(Market Trend Analysis & Presentation)
│
├─ Subtask(Data Collection)
│  │     ⎿  Web Search("electric vehicle market 2024")
│  │        Found 847 results (enter to expand)
│  │        ⎿  Selected 12 high-quality sources
│  │           ├─ McKinsey Global EV Report
│  │           ├─ Tesla Q3 2024 Earnings
│  │           └─ IEA Electric Vehicle Outlook
│  │        +9 more sources
│  │     ⎿  RAG Search(internal research database)
│  │        Retrieved 34 relevant documents (enter to expand)
│  │
├─ Subtask(Data Analysis)
│  │     ⎿  Processing market data...
│  │        ├─ Growth rates calculated
│  │        ├─ Regional breakdown complete
│  │        └─ Competitive analysis done
│  │     ⎿  Identifying key trends...
│  │        Found 7 major trends (enter to expand)
│  │
├─ Subtask(Presentation Creation)
│  │     ⎿  File Write(market_analysis.md)
│  │        Created outline with 8 sections
│  │     ⎿  Generate(charts and graphs)
│  │        ├─ Market size chart created
│  │        ├─ Growth projection graph created
│  │        └─ Regional adoption map created
│  │     ⎿  File Write(presentation.pptx)
│  │        Generated 24 slides (enter to expand)
│  │
✓ Analysis and presentation complete (4m 32s)
   📊 Generated: market_analysis.md, presentation.pptx
   📈 Key finding: 67% YoY growth in EV adoption
```

## Implementation Architecture

### 1. Task Execution Tracker

```typescript
interface TaskNode {
  id: string;
  name: string;
  type: 'task' | 'subtask' | 'operation' | 'tool_use';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  parent?: string;
  children: string[];

  // Display properties
  expandable: boolean;
  expanded: boolean;
  summary?: string;
  details?: string[];

  // Tool-specific data
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: any;

  // Progress tracking
  progress?: {
    current: number;
    total: number;
    units: string;
  };
}

class TaskExecutionTracker {
  private tasks: Map<string, TaskNode> = new Map();
  private activeTaskId?: string;
  private display: TaskDisplayManager;

  constructor(display: TaskDisplayManager) {
    this.display = display;
  }

  /**
   * Start a new top-level task
   */
  startTask(name: string, description?: string): string {
    const taskId = this.generateId();
    const task: TaskNode = {
      id: taskId,
      name,
      type: 'task',
      status: 'running',
      startTime: new Date(),
      children: [],
      expandable: false,
      expanded: true,
      summary: description,
    };

    this.tasks.set(taskId, task);
    this.activeTaskId = taskId;
    this.display.renderTasks();

    return taskId;
  }

  /**
   * Start a subtask under current or specified parent
   */
  startSubtask(name: string, parentId?: string): string {
    const parent = parentId || this.activeTaskId;
    if (!parent) throw new Error('No active task for subtask');

    const subtaskId = this.generateId();
    const subtask: TaskNode = {
      id: subtaskId,
      name,
      type: 'subtask',
      status: 'running',
      startTime: new Date(),
      parent,
      children: [],
      expandable: false,
      expanded: true,
    };

    this.tasks.set(subtaskId, subtask);

    // Add to parent's children
    const parentTask = this.tasks.get(parent)!;
    parentTask.children.push(subtaskId);

    this.display.renderTasks();
    return subtaskId;
  }

  /**
   * Record tool usage
   */
  recordToolUse(toolName: string, args: Record<string, any>, parentId?: string): string {
    const parent = parentId || this.activeTaskId;
    if (!parent) throw new Error('No active task for tool use');

    const toolId = this.generateId();
    const toolNode: TaskNode = {
      id: toolId,
      name: this.formatToolName(toolName, args),
      type: 'tool_use',
      status: 'running',
      startTime: new Date(),
      parent,
      children: [],
      expandable: true,
      expanded: false,
      toolName,
      toolArgs: args,
    };

    this.tasks.set(toolId, toolNode);

    // Add to parent
    const parentTask = this.tasks.get(parent)!;
    parentTask.children.push(toolId);

    this.display.renderTasks();
    return toolId;
  }

  /**
   * Update tool result and completion
   */
  completeToolUse(toolId: string, result: any, summary?: string) {
    const tool = this.tasks.get(toolId);
    if (!tool) return;

    tool.status = 'completed';
    tool.endTime = new Date();
    tool.toolResult = result;
    tool.summary = summary || this.generateToolSummary(tool.toolName!, result);

    this.display.renderTasks();
  }

  /**
   * Add progress update to running task
   */
  updateProgress(taskId: string, current: number, total: number, units: string = 'items') {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = { current, total, units };
    this.display.renderTasks();
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, summary?: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.endTime = new Date();
    if (summary) task.summary = summary;

    this.display.renderTasks();
  }

  private formatToolName(toolName: string, args: Record<string, any>): string {
    switch (toolName) {
      case 'file_read':
        return `Read(${args.path})`;
      case 'file_write':
        return `Write(${args.path})`;
      case 'web_search':
        return `Web Search("${args.query}")`;
      case 'shell_exec':
        return `Shell(${args.command})`;
      case 'rag_search':
        return `RAG Search("${args.query}")`;
      default:
        return `${toolName}(${JSON.stringify(args).substring(0, 50)})`;
    }
  }

  private generateToolSummary(toolName: string, result: any): string {
    switch (toolName) {
      case 'file_read':
        const lines = result.content?.split('\n').length || 0;
        return `Read ${lines} lines`;
      case 'web_search':
        const resultCount = result.results?.length || 0;
        return `Found ${resultCount} results`;
      case 'shell_exec':
        return result.success ? 'Command executed' : 'Command failed';
      case 'rag_search':
        const docCount = result.documents?.length || 0;
        return `Retrieved ${docCount} documents`;
      default:
        return 'Completed';
    }
  }
}
```

### 2. Task Display Manager

```typescript
class TaskDisplayManager {
  private tracker: TaskExecutionTracker;
  private expandedTasks: Set<string> = new Set();
  private keyboardHandler: KeyboardHandler;

  constructor(tracker: TaskExecutionTracker) {
    this.tracker = tracker;
    this.setupKeyboardHandler();
  }

  /**
   * Render current task tree
   */
  renderTasks() {
    // Clear previous output and re-render
    this.clearDisplay();

    const rootTasks = this.getRootTasks();
    for (const task of rootTasks) {
      this.renderTaskNode(task, 0);
    }
  }

  private renderTaskNode(task: TaskNode, depth: number) {
    const indent = '│  '.repeat(depth);
    const symbol = this.getTaskSymbol(task);
    const status = this.getStatusIcon(task.status);

    // Main task line
    let line = `${indent}${symbol} ${task.name}`;
    if (task.status === 'completed' && task.endTime) {
      const duration = this.formatDuration(task.startTime, task.endTime);
      line += ` (${duration})`;
    }
    console.log(line);

    // Progress or summary line
    if (task.progress) {
      const progressBar = this.renderProgressBar(task.progress);
      console.log(`${indent}     ${progressBar}`);
    } else if (task.summary) {
      const expandHint = task.expandable ? ' (enter to expand)' : '';
      console.log(`${indent}     ${task.summary}${expandHint}`);
    }

    // Tool details if expanded
    if (task.expandable && this.expandedTasks.has(task.id)) {
      this.renderExpandedDetails(task, depth + 1);
    }

    // Child tasks
    if (task.children.length > 0) {
      // Show first few children, then summary
      const visibleChildren = task.children.slice(0, 3);
      const remainingCount = task.children.length - visibleChildren.length;

      for (const childId of visibleChildren) {
        const child = this.tracker.getTask(childId);
        if (child) {
          this.renderTaskNode(child, depth + 1);
        }
      }

      if (remainingCount > 0) {
        console.log(`${indent}     +${remainingCount} more ${this.getTaskTypeLabel(task.type)}`);
      }
    }
  }

  private getTaskSymbol(task: TaskNode): string {
    switch (task.type) {
      case 'task':
        return '●';
      case 'subtask':
        return '├─';
      case 'tool_use':
        return '⎿ ';
      default:
        return '  ';
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'running':
        return '⋯';
      default:
        return ' ';
    }
  }

  private renderProgressBar(progress: { current: number; total: number; units: string }): string {
    const percentage = Math.round((progress.current / progress.total) * 100);
    const barWidth = 20;
    const filled = Math.round((percentage / 100) * barWidth);
    const empty = barWidth - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${progress.current}/${progress.total} ${progress.units} (${percentage}%)`;
  }

  private renderExpandedDetails(task: TaskNode, depth: number) {
    const indent = '│  '.repeat(depth);

    if (task.toolResult) {
      const details = this.formatToolResult(task.toolName!, task.toolResult);
      details.forEach((detail) => {
        console.log(`${indent}  ${detail}`);
      });
    }
  }

  private formatToolResult(toolName: string, result: any): string[] {
    switch (toolName) {
      case 'file_read':
        return [
          `File size: ${result.size} bytes`,
          `Lines: ${result.content.split('\n').length}`,
          `Encoding: ${result.encoding || 'utf-8'}`,
        ];
      case 'web_search':
        return (
          result.results
            ?.slice(0, 5)
            .map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.url}`) || []
        );
      case 'rag_search':
        return (
          result.documents
            ?.slice(0, 3)
            .map(
              (doc: any, i: number) => `${i + 1}. ${doc.title} (score: ${doc.score.toFixed(2)})`,
            ) || []
        );
      default:
        return [JSON.stringify(result, null, 2).substring(0, 200)];
    }
  }

  private setupKeyboardHandler() {
    this.keyboardHandler = new KeyboardHandler();

    // Enter key to expand/collapse tasks
    this.keyboardHandler.on('enter', () => {
      const selectedTask = this.getSelectedTask();
      if (selectedTask?.expandable) {
        this.toggleExpansion(selectedTask.id);
      }
    });

    // Ctrl+R to expand all
    this.keyboardHandler.on('ctrl+r', () => {
      this.expandAll();
    });
  }

  private toggleExpansion(taskId: string) {
    if (this.expandedTasks.has(taskId)) {
      this.expandedTasks.delete(taskId);
    } else {
      this.expandedTasks.add(taskId);
    }
    this.renderTasks();
  }
}
```

### 3. Agent Integration

```typescript
class WilkAgent {
  private taskTracker: TaskExecutionTracker;

  async executePrompt(prompt: string): Promise<string> {
    const mainTaskId = this.taskTracker.startTask(`Agent Task(${this.name})`);

    try {
      // Break down the prompt into subtasks
      const plan = await this.planExecution(prompt);

      for (const step of plan.steps) {
        const subtaskId = this.taskTracker.startSubtask(step.description, mainTaskId);

        for (const toolUse of step.toolUses) {
          const toolId = this.taskTracker.recordToolUse(toolUse.name, toolUse.args, subtaskId);

          const result = await this.executeTool(toolUse.name, toolUse.args);

          this.taskTracker.completeToolUse(
            toolId,
            result,
            this.generateToolSummary(toolUse.name, result),
          );
        }

        this.taskTracker.completeTask(subtaskId);
      }

      const response = await this.generateResponse(plan.results);
      this.taskTracker.completeTask(mainTaskId, 'Task completed successfully');

      return response;
    } catch (error) {
      this.taskTracker.failTask(mainTaskId, error.message);
      throw error;
    }
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    // Tool execution with progress updates
    switch (toolName) {
      case 'file_read':
        return await this.executeFileRead(args);
      case 'web_search':
        return await this.executeWebSearch(args);
      case 'rag_search':
        return await this.executeRAGSearch(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async executeFileRead(args: { path: string }): Promise<any> {
    // Show progress for large files
    const stats = await fs.stat(args.path);
    if (stats.size > 1024 * 1024) {
      // 1MB+
      // Show reading progress
      this.taskTracker.updateProgress(this.currentToolId, 0, stats.size, 'bytes');
    }

    const content = await fs.readFile(args.path, 'utf-8');
    return {
      content,
      size: stats.size,
      lines: content.split('\n').length,
    };
  }
}
```

## Configuration and CLI Integration

### Task Display Settings

```bash
# Configure task display preferences
wilk config set tasks.auto_expand true
wilk config set tasks.max_children 5
wilk config set tasks.show_progress true
wilk config set tasks.show_timing true

# Task-specific commands
wilk tasks list --active           # Show currently running tasks
wilk tasks expand --all            # Expand all expandable items
wilk tasks export session-123      # Export task tree to file
wilk tasks replay session-123      # Replay task execution
```

### Keyboard Controls

- **Enter**: Expand/collapse selected expandable item
- **Ctrl+R**: Expand all expandable items in view
- **Ctrl+C**: Interrupt current task execution
- **Arrow Keys**: Navigate between tasks (when implemented)
- **Tab**: Jump to next expandable item

### Integration with Multi-Choice System

```bash
● Task(Security Analysis)
│     ⎿  Found 15 security issues
│        ├─ Critical: 3 issues
│        ├─ High: 7 issues
│        └─ Medium: 5 issues
│     ✓ Analysis complete

┌─ What would you like to do? ────────────────────────────┐
│  1. 💬 Custom prompt                                     │
│  2. 🔍 Show detailed vulnerability report               │
│  3. 🛠️  Auto-fix critical issues                       │
│  4. 📝 Generate security checklist                     │
│  5. 🚨 Create GitHub security alert                    │
└──────────────────────────────────────────────────────────┘
```

This creates a sophisticated task execution display that provides transparency into agent operations while maintaining the elegant, hierarchical structure that makes Claude Code so effective for understanding complex workflows.

