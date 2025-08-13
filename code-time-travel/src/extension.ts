import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { TimelineManager } from "./timelineManager";
import { TimelineWebviewProvider } from "./webviewProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("Code Timeline extension activated!");

  // Initialize the timeline manager
  const timelineManager = new TimelineManager(context);

  // Initialize the webview provider
  const webviewProvider = new TimelineWebviewProvider(
    context.extensionUri,
    timelineManager
  );

  // Register commands
  const showTimelineCommand = vscode.commands.registerCommand(
    "codeTimeline.showTimeline",
    () => {
      webviewProvider.show();
    }
  );

  const clearHistoryCommand = vscode.commands.registerCommand(
    "codeTimeline.clearHistory",
    () => {
      timelineManager.clearHistory();
      vscode.window.showInformationMessage("Timeline history cleared!");
    }
  );

  // Listen for document changes
  const onDidSaveDocument = vscode.workspace.onDidSaveTextDocument(
    (document) => {
      if (document.uri.scheme === "file") {
        timelineManager.recordChange(document);
      }
    }
  );

  // Add to subscriptions for proper cleanup
  context.subscriptions.push(
    showTimelineCommand,
    clearHistoryCommand,
    onDidSaveDocument,
    webviewProvider
  );

  // Show welcome message
  vscode.window.showInformationMessage(
    'Code Timeline is now tracking your changes! Use "Show Code Timeline" command to view.'
  );
}

export function deactivate() {
  console.log("Code Timeline extension deactivated!");
}
