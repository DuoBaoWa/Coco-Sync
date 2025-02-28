# CocoSync 🔄 - Real-time Folder Synchronization Tool

<div align="center">
  <img src="./assets/tray-icon.png" alt="CocoSync Logo" width="120">
</div>

<div align="center">

[![中文文档](https://img.shields.io/badge/文档-中文版-orange.svg)](./README_CN.md)
[![English Docs](https://img.shields.io/badge/Docs-English-blue.svg)](./README_EN.md)

</div>

## 📝 Project Introduction

Welcome to CocoSync! This is a super cute and practical real-time folder synchronization tool ✨. Whether you need to backup important files or keep files synchronized across multiple locations, CocoSync has got you covered!

CocoSync features a modern interface design that's simple and intuitive, making it easy for even non-technical users to get started quickly. It monitors file changes in real-time and synchronizes automatically according to your settings, so you never have to worry about version confusion or lost files again~

## ✨ Features

### 🔍 Basic Features

- **Real-time Synchronization** - Automatically detects file changes and syncs immediately, never missing any modifications
- **Multiple Sync Modes** - Supports mirror mode, incremental mode, and delta mode
- **File Filtering** - Set rules to exclude files you don't want to synchronize
- **Conflict Resolution** - Intelligently resolves file conflicts with multiple resolution strategies
- **Visual Interface** - Beautiful and intuitive user interface, easy to operate
- **Real-time Logs** - Detailed records of all synchronization operations at a glance

### 🚀 Advanced Features

- **Delta Transfer** - Only transfers the changed parts of files, saving bandwidth and time
- **Version Control** - Preserves historical versions of files, allowing you to roll back at any time
- **Dark Mode** - Protects your eyes and provides a comfortable night-time experience
- **Custom Filter Rules** - Flexibly set filter rules using glob patterns

## 🔧 Installation Guide

### System Requirements

- Windows 10/11
- macOS 10.13 or higher
- Linux (mainstream distributions)

### Download and Install

1. Download the latest version from the [Releases page](https://github.com/yourusername/coco-sync/releases)
2. Run the installer and follow the prompts to complete installation
3. Launch CocoSync and start enjoying the convenient file synchronization experience!

## 📖 User Guide

### Quick Start

1. **Set Source Folder** - Click the "Select Folder" button and choose the source folder you want to synchronize
2. **Set Target Folder** - Choose the destination location for file synchronization
3. **Choose Sync Mode** - Select a synchronization mode based on your needs:
   - Mirror Mode: The target folder will completely replicate the contents of the source folder
   - Incremental Mode: Only adds new files, doesn't delete files in the target folder
   - Delta Mode: Supports delta transfers, only transferring the changed parts of files
4. **Start Sync** - Click the "Start Sync" button to begin synchronization

### Advanced Configuration

#### Filter Rules

You can set filter rules to exclude specific files or folders from synchronization:

1. Enter one rule per line in the filter rules text area
2. Use glob patterns like `*.tmp` or `*.bak` to match file types
3. Folders can be excluded by name, e.g., `node_modules/`

#### Conflict Resolution

Choose how CocoSync should handle file conflicts:

- **Overwrite**: Always use the source file (default)
- **Rename**: Keep both files by renaming the new one
- **Skip**: Keep the target file and skip synchronization

#### Version Control

When enabled, CocoSync will maintain historical versions of modified files:

1. Enable the "Version Control" option in the settings
2. Set the maximum number of versions to keep
3. Historical versions are stored in a hidden `.versions` folder in the target directory

## ❓ FAQ

### Q: Can I synchronize between different operating systems?
**A:** Yes! CocoSync handles path differences and file compatibility between Windows, macOS, and Linux.

### Q: Will CocoSync consume a lot of system resources?
**A:** No! CocoSync is optimized to use minimal system resources even when monitoring many files.

### Q: How do I pause synchronization?
**A:** Click the "Stop Sync" button to pause the synchronization process. Click "Start Sync" again to resume.

### Q: Does it support external storage device synchronization?
**A:** Absolutely! You can select any accessible storage location as your source or target folder.

### Q: How can I view synchronization history?
**A:** The sync log area displays a history of all synchronization operations.

## 🛠️ Technical Support

If you encounter any issues while using CocoSync or have feature suggestions, please contact us through:

- Submit a [GitHub Issue](https://github.com/yourusername/coco-sync/issues)
- Send an email to: support@cocosync.example.com

## 📜 License

CocoSync is open-source under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>🌟 If you like CocoSync, don't forget to give us a star! 🌟</p>
  <p>💖 Made with love by the CocoSync Team 💖</p>
</div>