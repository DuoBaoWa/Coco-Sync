const { contextBridge, ipcRenderer } = require('electron');

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('api', {
  // 同步操作
  startSync: (config) => ipcRenderer.send('start-sync', config),
  stopSync: () => ipcRenderer.send('stop-sync'),
  
  // 配置操作
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.send('save-config', config),
  
  // 文件夹选择
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // 日志获取
  getLogs: (options) => ipcRenderer.invoke('get-logs', options),
  
  // 事件监听
  onSyncEvent: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('sync-event', listener);
    return () => ipcRenderer.removeListener('sync-event', listener);
  },
  
  onSyncError: (callback) => {
    const listener = (event, error) => callback(error);
    ipcRenderer.on('sync-error', listener);
    return () => ipcRenderer.removeListener('sync-error', listener);
  },
  
  onSyncStateChanged: (callback) => {
    const listener = (event, state) => callback(state);
    ipcRenderer.on('sync-state-changed', listener);
    return () => ipcRenderer.removeListener('sync-state-changed', listener);
  },
  
  onTriggerSync: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('trigger-sync', listener);
    return () => ipcRenderer.removeListener('trigger-sync', listener);
  }
});