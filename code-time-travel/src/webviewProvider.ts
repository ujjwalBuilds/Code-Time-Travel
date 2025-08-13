import * as vscode from "vscode";
import { TimelineManager, TimelineEntry } from "./timelineManager";

export class TimelineWebviewProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly timelineManager: TimelineManager
  ) {}

  public show() {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "codeTimeline",
      "Code Timeline",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = this.getHtmlContent();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "restore":
          const entry: TimelineEntry = message.entry;
          await this.timelineManager.restoreSnapshot(entry);
          break;
        case "refresh":
          this.panel!.webview.postMessage({
            type: "timelineData",
            data: this.timelineManager.getTimelineData(),
          });
          break;
      }
    });

    // Clean up when panel is closed
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Send initial data
    setTimeout(() => {
      this.panel!.webview.postMessage({
        type: "timelineData",
        data: this.timelineManager.getTimelineData(),
      });
    }, 100);
  }

  private getHtmlContent(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Timeline</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .timeline-container {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        
        .stat-label {
            font-size: 12px;
            opacity: 0.8;
        }
        
        .timeline-chart {
            position: relative;
            height: 300px;
            margin-bottom: 20px;
        }
        
        .recent-changes {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            padding: 15px;
        }
        
        .change-entry {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .change-entry:last-child {
            border-bottom: none;
        }
        
        .change-info {
            flex: 1;
        }
        
        .change-file {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        
        .change-time {
            font-size: 11px;
            opacity: 0.7;
        }
        
        .change-count {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
            margin-right: 8px;
        }
        
        .restore-btn {
            background: var(--vscode-inputOption-activeBackground);
            color: var(--vscode-inputOption-activeForeground);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }
        
        .restore-btn:hover {
            opacity: 0.8;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Code Timeline</h1>
            <p>Visual timeline of your code changes with restore points</p>
        </div>
        
        <div class="controls">
            <button class="btn" onclick="refreshData()">🔄 Refresh</button>
            <button class="btn" onclick="clearHistory()">🗑️ Clear History</button>
        </div>
        
        <div class="stats" id="stats">
            <!-- Stats will be populated by JavaScript -->
        </div>
        
        <div class="timeline-container">
            <h3>📊 Timeline View</h3>
            <div class="timeline-chart">
                <canvas id="timelineChart"></canvas>
            </div>
        </div>
        
        <div class="recent-changes">
            <h3>📝 Recent Changes</h3>
            <div id="recentChanges">
                <!-- Recent changes will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let chart = null;
        let timelineData = [];

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'timelineData':
                    timelineData = message.data;
                    updateDisplay();
                    break;
            }
        });

        function updateDisplay() {
            updateStats();
            updateChart();
            updateRecentChanges();
        }

        function updateStats() {
            const totalEntries = timelineData.reduce((sum, group) => sum + group.entries.length, 0);
            const totalChanges = timelineData.reduce((sum, group) => sum + group.changes, 0);
            const uniqueFiles = new Set();
            
            timelineData.forEach(group => {
                group.entries.forEach(entry => uniqueFiles.add(entry.filePath));
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayChanges = timelineData
                .filter(group => group.timestamp >= today.getTime())
                .reduce((sum, group) => sum + group.changes, 0);

            document.getElementById('stats').innerHTML = \`
                <div class="stat-card">
                    <div class="stat-number">\${totalEntries}</div>
                    <div class="stat-label">Total Snapshots</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${totalChanges}</div>
                    <div class="stat-label">Total Changes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${uniqueFiles.size}</div>
                    <div class="stat-label">Files Tracked</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">\${todayChanges}</div>
                    <div class="stat-label">Changes Today</div>
                </div>
            \`;
        }

        function updateChart() {
            const ctx = document.getElementById('timelineChart').getContext('2d');
            
            if (chart) {
                chart.destroy();
            }

            if (timelineData.length === 0) {
                document.querySelector('.timeline-chart').innerHTML = 
                    '<div class="empty-state">No timeline data yet. Make some code changes to see your timeline!</div>';
                return;
            }

            const labels = timelineData.map(group => 
                new Date(group.timestamp).toLocaleDateString() + ' ' + 
                new Date(group.timestamp).toLocaleTimeString()
            );
            const changes = timelineData.map(group => group.changes);

            chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Changes',
                        data: changes,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const group = timelineData[index];
                            showGroupDetails(group);
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Changes'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        function updateRecentChanges() {
            const allEntries = [];
            timelineData.forEach(group => {
                allEntries.push(...group.entries);
            });
            
            allEntries.sort((a, b) => b.timestamp - a.timestamp);
            const recent = allEntries.slice(0, 10);

            if (recent.length === 0) {
                document.getElementById('recentChanges').innerHTML = 
                    '<div class="empty-state">No changes recorded yet. Save a file to start tracking!</div>';
                return;
            }

            document.getElementById('recentChanges').innerHTML = recent.map(entry => \`
                <div class="change-entry">
                    <div class="change-info">
                        <div class="change-file">\${entry.fileName}</div>
                        <div class="change-time">\${new Date(entry.timestamp).toLocaleString()}</div>
                    </div>
                    <div>
                        <span class="change-count">\${entry.changeCount} changes</span>
                        <button class="restore-btn" onclick="restoreSnapshot(\${JSON.stringify(entry).replace(/"/g, '&quot;')})">
                            Restore
                        </button>
                    </div>
                </div>
            \`).join('');
        }

        function showGroupDetails(group) {
            alert(\`Time Group: \${new Date(group.timestamp).toLocaleString()}\\n\` +
                  \`Total Changes: \${group.changes}\\n\` +
                  \`Files: \${group.entries.map(e => e.fileName).join(', ')}\`);
        }

        function restoreSnapshot(entry) {
            if (confirm(\`Restore \${entry.fileName} to \${new Date(entry.timestamp).toLocaleString()}?\\n\\nThis will replace the current file content.\`)) {
                vscode.postMessage({
                    type: 'restore',
                    entry: entry
                });
            }
        }

        function refreshData() {
            vscode.postMessage({ type: 'refresh' });
        }

        function clearHistory() {
            if (confirm('This will clear all timeline history. Are you sure?')) {
                vscode.postMessage({ type: 'clear' });
                setTimeout(() => refreshData(), 100);
            }
        }

        // Request initial data
        refreshData();
    </script>
</body>
</html>`;
  }

  public dispose() {
    this.panel?.dispose();
  }
}
