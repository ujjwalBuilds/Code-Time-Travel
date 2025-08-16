# ⏱️ Code Time Travel
A VS Code extension that tracks your code changes visually with an interactive timeline and instant restore points—like git history but for every save, no git required.

Link - https://marketplace.visualstudio.com/items?itemName=ujjwalBuilds.code-time-travel

<img width="885" height="979" alt="image" src="https://github.com/user-attachments/assets/10c6a538-a309-4521-8d63-0bfb8c02847d" />

---

## 🚀 Features

### 📊 Visual Timeline
- **Waveform Timeline**: See your coding activity as an interactive graph where height = intensity of changes
- **Real-time Updates**: Timeline updates automatically as you code and save files
- **Clickable Points**: Click any timeline point to see details or restore to that moment

### ⚡ Smart Tracking
- **Auto-Save Snapshots**: Tracks every file save with intelligent change detection
- **Configurable Intervals**: Choose snapshot frequency (1, 2, or 5 minutes)
- **Lightweight Storage**: Uses efficient diff-based storage, not full file copies

### 🎯 Time Travel
- **One-Click Restore**: Instantly restore any file to any previous state
- **Recent Changes Panel**: Quick access to latest snapshots with restore buttons
- **Safe Restoration**: Confirmation dialogs prevent accidental overwrites

---

## 📱 Tech Stack
- **Extension**: TypeScript + VS Code API
- **UI**: HTML5 Canvas + CSS3 (VS Code native theming)
- **Storage**: Local JSON files with diff-match-patch
- **Timeline**: Custom canvas-based waveform visualization

---

## 🛡 How It Works
- Listens for file save events in your workspace
- Calculates actual line changes (not total lines)
- Stores compressed diffs locally in VS Code storage
- Renders interactive timeline in side panel
- One-click restoration reconstructs file from diffs

---

## 🧑💻 Getting Started

### ✅ Prerequisites
- VS Code 1.60.0 or higher
- Any workspace with text files

### 📦 Installation & Usage
```bash
# Clone the repository
git clone https://github.com/ujjwalBuilds/ctt.git

# Navigate to project
cd ctt

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Open in VS Code and press F5 to test
