# CocoSync 🔄 - 超可爱的实时文件夹同步工具

<div align="center">
  <img src="./assets/tray-icon.png" alt="CocoSync Logo" width="150">
</div>

<div align="center">

[![中文文档](https://img.shields.io/badge/文档-中文版-orange.svg)](./README_CN.md)
[![English Docs](https://img.shields.io/badge/Docs-English-blue.svg)](./README_EN.md)

</div>

## 📝 项目简介

哇！欢迎来到 CocoSync 的奇妙世界~！这是一个超级可爱又超级实用的实时文件夹同步工具 ✨。无论你是需要备份重要文件，还是在多个位置保持文件同步，CocoSync 都能像魔法一样帮你轻松搞定！

CocoSync 采用了超级现代化的界面设计，操作简单得不能再简单啦，即使是技术小白也能在几分钟内上手使用。它能够实时监控文件变化，并根据你的设置自动同步，让你再也不用担心文件版本混乱或丢失的烦恼啦~ 就像有一个小精灵在默默守护你的文件安全！

## ✨ 功能特点

### 🔍 基本功能

- **实时同步** 🔄 - 自动检测文件变化并立即同步，像忠实的小卫士一样不错过任何修改
- **多种同步模式** 🌈 - 支持镜像模式、增量模式和差异模式，满足你的各种同步需求
- **文件过滤** 🧩 - 可以设置规则排除不需要同步的文件，让同步更加智能
- **冲突处理** 🛡️ - 智能解决文件冲突，提供多种冲突解决策略，不再为文件冲突而烦恼
- **可视化界面** 🎨 - 美观直观的用户界面，操作简单，让同步变得有趣
- **实时日志** 📝 - 详细记录所有同步操作，一目了然，让你掌握每一步同步情况

### 🚀 高级功能

- **增量传输** ⚡ - 只传输文件的变化部分，节省带宽和时间，同步快得像闪电一样
- **版本控制** 📚 - 保留文件的历史版本，随时可以回退，像时光机一样守护你的文件历史
- **暗黑模式** 🌙 - 保护你的眼睛，提供舒适的夜间使用体验，熬夜工作也不怕
- **自定义过滤规则** 🔍 - 使用 glob 模式灵活设置过滤规则，让同步更加个性化

## 🔧 安装指南

### 系统要求

- Windows 10/11 🪟

### 下载安装

1. 从 [发布页面](https://github.com/yourusername/coco-sync/releases) 下载最新版本 📥
2. 运行安装程序，按照提示完成安装 ⚙️
3. 启动 CocoSync，开始享受便捷的文件同步体验！🎉

## 📖 使用教程

### 快速开始

1. **设置源文件夹** 📁 - 点击"选择文件夹"按钮，选择你想要同步的源文件夹
2. **设置目标文件夹** 📂 - 选择文件同步的目标位置
3. **选择同步模式** 🔄 - 根据需要选择同步模式：
   - 镜像模式：目标文件夹将完全复制源文件夹的内容，就像照镜子一样
   - 增量模式：只添加新文件，不删除目标文件夹中的文件，安全又贴心
   - 差异模式：支持增量传输，只传输文件的变化部分，又快又省资源
4. **开始同步** ▶️ - 点击"开始同步"按钮，CocoSync 就会开始工作啦

### 高级配置

#### 过滤规则

你可以设置过滤规则来排除特定的文件或文件夹：

1. 在过滤规则文本区域中每行输入一条规则 📝
2. 使用 glob 模式如 `*.tmp` 或 `*.bak` 来匹配文件类型
3. 可以通过名称排除文件夹，例如 `node_modules/`

#### 冲突解决

选择 CocoSync 应如何处理文件冲突：

- **覆盖**：始终使用源文件（默认选项）
- **重命名**：通过重命名新文件保留两个文件
- **跳过**：保留目标文件并跳过同步

#### 版本控制

启用后，CocoSync 将维护修改文件的历史版本：

1. 在设置中启用"版本控制"选项
2. 设置要保留的最大版本数
3. 历史版本存储在目标目录中的隐藏 `.versions` 文件夹中

## ❓ 常见问题

### Q: 我可以在不同Windows设备之间同步吗？
**A:** 当然可以！CocoSync 能够在不同的Windows设备之间轻松同步文件，保持数据一致性。

### Q: CocoSync 会消耗大量系统资源吗？
**A:** 不会哦！CocoSync 经过优化，即使在监控大量文件时也只使用最少的系统资源，轻巧不卡顿。

### Q: 如何暂停同步？
**A:** 点击"停止同步"按钮即可暂停同步过程。再次点击"开始同步"即可恢复。简单方便！

### Q: 它支持外部存储设备同步吗？
**A:** 绝对支持！你可以选择任何可访问的存储位置作为源文件夹或目标文件夹，U盘、移动硬盘都没问题。

### Q: 如何查看同步历史？
**A:** 同步日志区域会显示所有同步操作的历史记录，清晰明了。

## 🚀 技术栈

<div align="center">

### ✨ CocoSync 由这些强大的技术驱动 ✨

</div>

<div align="center">

[![Electron](https://img.shields.io/badge/⚡%20Electron-34.3.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/🟢%20Node.js-Latest-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/💛%20JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

[![Chokidar](https://img.shields.io/badge/👁️%20Chokidar-3.5.3-9B59B6?style=for-the-badge)](https://github.com/paulmillr/chokidar)
[![FS Extra](https://img.shields.io/badge/📂%20FS%20Extra-11.2.0-2ECC71?style=for-the-badge)](https://github.com/jprichardson/node-fs-extra)
[![Winston](https://img.shields.io/badge/📝%20Winston-3.11.0-3498DB?style=for-the-badge)](https://github.com/winstonjs/winston)

</div>

<div align="center">

### 🔧 开发工具 🔧

[![Electron Builder](https://img.shields.io/badge/🏗️%20Electron%20Builder-24.9.1-31A8FF?style=for-the-badge)](https://www.electron.build/)
[![Jest](https://img.shields.io/badge/🧪%20Jest-29.7.0-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)

</div>

<div align="center">

### 💻 平台支持 💻

[![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)]()

</div>

## 🛠️ 技术支持

如果你在使用 CocoSync 时遇到任何问题或有功能建议，请通过以下方式联系我们：

- 提交 [GitHub Issue](https://github.com/yourusername/coco-sync/issues)
- 发送电子邮件至：support@cocosync.example.com

## 📜 许可证

CocoSync 在 MIT 许可证下开源。有关详细信息，请参阅 [LICENSE](LICENSE) 文件。

---

<div align="center">
  <p>🌟 如果你喜欢 CocoSync，别忘了给我们点个星星哦！ 🌟</p>
  <p>💖 CocoSync 团队用爱制作 💖</p>
</div>