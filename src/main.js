const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const Store = require('electron-store');
const { setupSyncEngine } = require('./sync-engine');
const { setupLogger } = require('./utils/logger');

// 禁用GPU硬件加速，解决GPU缓存错误
app.disableHardwareAcceleration();
// 禁用GPU进程沙盒
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
// 禁用GPU沙盒
app.commandLine.appendSwitch('disable-gpu-sandbox');
// 禁用软件光栅化器
app.commandLine.appendSwitch('disable-software-rasterizer');
// 完全禁用GPU
app.commandLine.appendSwitch('disable-gpu');
// 禁用GPU合成
app.commandLine.appendSwitch('disable-gpu-compositing');
// 设置磁盘缓存大小为0
app.commandLine.appendSwitch('disk-cache-size', '0');

// 初始化配置存储
const store = new Store();

// 初始化日志系统
const logger = setupLogger();

// 保持对窗口对象的全局引用，避免JavaScript对象被垃圾回收时窗口关闭
let mainWindow;
let tray;
let isQuitting = false;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // 加载应用的主页面
  mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

  // 创建应用菜单（中文版）
  createApplicationMenu();

  // 开发环境下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 当窗口关闭时触发
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // 窗口关闭时清除引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建系统托盘
  createTray();
}

// 创建应用程序菜单（中文版）
function createApplicationMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开源文件夹',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory']
            });
            if (!result.canceled) {
              mainWindow.webContents.send('set-source-path', result.filePaths[0]);
            }
          }
        },
        {
          label: '打开目标文件夹',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory']
            });
            if (!result.canceled) {
              mainWindow.webContents.send('set-target-path', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '删除', role: 'delete' },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '同步',
      submenu: [
        {
          label: '开始同步',
          click: () => {
            mainWindow.webContents.send('menu-start-sync');
          }
        },
        {
          label: '停止同步',
          click: () => {
            mainWindow.webContents.send('menu-stop-sync');
          }
        },
        { type: 'separator' },
        {
          label: '暂停同步',
          type: 'checkbox',
          checked: store.get('sync.paused', false),
          click: (menuItem) => {
            store.set('sync.paused', menuItem.checked);
            mainWindow.webContents.send('sync-state-changed', { paused: menuItem.checked });
            logger.info(`同步状态已${menuItem.checked ? '暂停' : '恢复'}`);
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 CocoSync',
              message: 'CocoSync - 实时文件夹同步工具',
              detail: '版本: 1.0.0\n开发者: CocoSync Team',
              buttons: ['确定']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 创建系统托盘图标和菜单
function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示主窗口', 
      click: () => { mainWindow.show(); }
    },
    { 
      label: '立即同步', 
      click: () => { 
        mainWindow.webContents.send('trigger-sync');
        logger.info('用户触发手动同步');
      }
    },
    { type: 'separator' },
    { 
      label: '暂停同步', 
      type: 'checkbox',
      checked: store.get('sync.paused', false),
      click: (menuItem) => {
        store.set('sync.paused', menuItem.checked);
        mainWindow.webContents.send('sync-state-changed', { paused: menuItem.checked });
        logger.info(`同步状态已${menuItem.checked ? '暂停' : '恢复'}`);
      }
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('CocoSync - 文件夹同步工具');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();
  
  // 初始化同步引擎
  const syncEngine = setupSyncEngine({
    onError: (error) => {
      logger.error('同步错误', error);
      mainWindow.webContents.send('sync-error', error);
    },
    onSyncEvent: (event) => {
      mainWindow.webContents.send('sync-event', event);
    },
    store: store
  });
  
  // 设置IPC通信
  setupIPC(syncEngine);
});

// 设置IPC通信
function setupIPC(syncEngine) {
  // 开始同步
  ipcMain.on('start-sync', (event, config) => {
    logger.info('开始同步', { source: config.sourcePath, target: config.targetPath });
    syncEngine.startSync(config);
  });

  // 停止同步
  ipcMain.on('stop-sync', () => {
    logger.info('停止同步');
    syncEngine.stopSync();
  });

  // 选择文件夹
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });

  // 获取配置
  ipcMain.handle('get-config', () => {
    return store.get('sync.config', {});
  });

  // 保存配置
  ipcMain.on('save-config', (event, config) => {
    store.set('sync.config', config);
    logger.info('配置已保存');
  });

  // 获取日志
  ipcMain.handle('get-logs', async (event, options) => {
    try {
      const { readLogs } = require('./utils/logger');
      const logs = await readLogs(options);
      return logs;
    } catch (error) {
      logger.error('获取日志失败', error);
      return [];
    }
  });
}

// 在macOS上，当点击dock图标并且没有其他窗口打开时，
// 通常在应用程序中重新创建一个窗口。
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，除非用户用Cmd + Q确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});