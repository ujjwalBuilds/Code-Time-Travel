import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { diff_match_patch } from 'diff-match-patch';

export interface TimelineEntry {
    timestamp: number;
    filePath: string;
    fileName: string;
    content: string;
    changeCount: number;
    diff?: string;
}

export class TimelineManager {
  private timeline: TimelineEntry[] = [];
  private storageFile: string;
  private dmp = new diff_match_patch();
  private previousContent: Map<string, string> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    this.storageFile = path.join(
      context.globalStorageUri.fsPath,
      "timeline.json"
    );
    this.ensureStorageDirectory();
    this.loadTimeline();
  }

  private ensureStorageDirectory() {
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadTimeline() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, "utf8");
        this.timeline = JSON.parse(data);
        console.log(`Loaded ${this.timeline.length} timeline entries`);
      }
    } catch (error) {
      console.error("Failed to load timeline:", error);
      this.timeline = [];
    }
  }

  private saveTimeline() {
    try {
      fs.writeFileSync(
        this.storageFile,
        JSON.stringify(this.timeline, null, 2)
      );
    } catch (error) {
      console.error("Failed to save timeline:", error);
    }
  }

  public recordChange(document: vscode.TextDocument) {
    const filePath = document.uri.fsPath;
    const fileName = path.basename(filePath);
    const currentContent = document.getText();

    // Skip if no real workspace (untitled files, etc.)
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      return;
    }

    // Calculate changes
    const previousContent = this.previousContent.get(filePath) || "";
    const changeCount = this.calculateChangeCount(
      previousContent,
      currentContent
    );

    // Only record if there are actual changes
    if (changeCount > 0 || !this.previousContent.has(filePath)) {
      const entry: TimelineEntry = {
        timestamp: Date.now(),
        filePath: filePath,
        fileName: fileName,
        content: currentContent,
        changeCount: changeCount,
        diff: previousContent
          ? this.createDiff(previousContent, currentContent)
          : undefined,
      };

      this.timeline.push(entry);
      this.previousContent.set(filePath, currentContent);

      // Keep only last 1000 entries to prevent storage bloat
      if (this.timeline.length > 1000) {
        this.timeline = this.timeline.slice(-1000);
      }

      this.saveTimeline();
      console.log(`Recorded change: ${fileName} - ${changeCount} changes`);
    }
  }

  private calculateChangeCount(oldContent: string, newContent: string): number {
    if (!oldContent) return 1; // First save = 1 change, not all lines

    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");

    let changes = 0;
    const maxLength = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLength; i++) {
      const oldLine = oldLines[i] || "";
      const newLine = newLines[i] || "";
      if (oldLine !== newLine) {
        changes++;
      }
    }

    return Math.max(changes, 1); // At least 1 change if file was saved
  }

  private createDiff(oldContent: string, newContent: string): string {
    const diffs = this.dmp.diff_main(oldContent, newContent);
    this.dmp.diff_cleanupSemantic(diffs);
    return this.dmp.diff_prettyHtml(diffs);
  }

  public getTimeline(): TimelineEntry[] {
    return this.timeline.slice(); // Return copy
  }

  public getTimelineData() {
    // Group entries by time intervals (5 minutes)
    const interval = 5 * 60 * 1000; // 5 minutes in milliseconds
    const groups: {
      [key: number]: {
        timestamp: number;
        changes: number;
        entries: TimelineEntry[];
      };
    } = {};

    this.timeline.forEach((entry) => {
      const groupKey = Math.floor(entry.timestamp / interval) * interval;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          timestamp: groupKey,
          changes: 0,
          entries: [],
        };
      }
      groups[groupKey].changes += entry.changeCount;
      groups[groupKey].entries.push(entry);
    });

    return Object.values(groups).sort((a, b) => a.timestamp - b.timestamp);
  }

  public async restoreSnapshot(entry: TimelineEntry) {
    try {
      // Open the file and replace content
      const document = await vscode.workspace.openTextDocument(entry.filePath);
      const editor = await vscode.window.showTextDocument(document);

      await editor.edit((editBuilder) => {
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        editBuilder.replace(fullRange, entry.content);
      });

      vscode.window.showInformationMessage(
        `Restored ${entry.fileName} to ${new Date(
          entry.timestamp
        ).toLocaleString()}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to restore file: ${error}`);
    }
  }

  public clearHistory() {
    this.timeline = [];
    this.previousContent.clear();
    this.saveTimeline();
  }
}