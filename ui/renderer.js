// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  // DOM 元素
  const sourcePathInput = document.getElementById('source-path');
  const targetPathInput = document.getElementById('target-path');
  const selectSourceBtn = document.getElementById('select-source');
  const selectTargetBtn = document.getElementById('select-target');
  const syncModeSelect = document.getElementById('sync-mode');
  const deleteModeCheckbox = document.getElementById('delete-mode');
  const includeHiddenCheckbox = document.getElementById('include-hidden');
  const followSymlinksCheckbox = document.getElementById('follow-symlinks');
  const maxFileSizeInput = document.getElementById('max-file-size');
  const conflictResolutionSelect = document.getElementById('conflict-resolution');
  const filtersTextarea = document.getElementById('filters');
  const saveConfigBtn = document.getElementById('save-config');
  const startSyncBtn = document.getElementById('start-sync');
  const stopSyncBtn = document.getElementById('stop-sync');
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  const syncedFilesCount = document.getElementById('synced-files');
  const conflictsCount = document.getElementById('conflicts');
  const lastSyncTime = document.getElementById('last-sync');
  const logEntries = document.getElementById('log-entries');
  // 新增的高级功能UI元素
  const deltaTransferCheckbox = document.getElementById('delta-transfer');
  const versionControlCheckbox = document.getElementById('version-control');
  const maxVersionsInput = document.getElementById('max-versions');
  // 主题切换按钮
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');

  // 状态变量
  let isSyncing = false;
  let stats = {
    syncedFiles: 0,
    conflicts: 0,
    lastSync: null
  };

  // 初始化：加载保存的配置
  loadConfig();
  // 初始化：加载主题设置
  initTheme();

  // 选择源文件夹
  selectSourceBtn.addEventListener('click', async () => {
    const path = await window.api.selectFolder();
    if (path) {
      sourcePathInput.value = path;
    }
  });

  // 选择目标文件夹
  selectTargetBtn.addEventListener('click', async () => {
    const path = await window.api.selectFolder();
    if (path) {
      targetPathInput.value = path;
    }
  });

  // 保存配置
  saveConfigBtn.addEventListener('click', () => {
    saveConfig();
    addLogEntry('配置已保存', 'success');
  });

  // 开始同步
  startSyncBtn.addEventListener('click', () => {
    if (!validateConfig()) return;
    
    const config = getConfigFromForm();
    window.api.startSync(config);
    
    updateSyncStatus(true);
    saveConfig();
    addLogEntry('同步已开始', 'success');
  });

  // 停止同步
  stopSyncBtn.addEventListener('click', () => {
    window.api.stopSync();
    updateSyncStatus(false);
    addLogEntry('同步已停止', 'warning');
  });

  // 主题切换
  themeToggle.addEventListener('click', () => {
    toggleTheme();
  });

  // 监听同步事件
  window.api.onSyncEvent((data) => {
    handleSyncEvent(data);
  });

  // 监听同步错误
  window.api.onSyncError((error) => {
    addLogEntry(`错误: ${error.message}`, 'error');
  });

  // 监听同步状态变化
  window.api.onSyncStateChanged((state) => {
    if (state.paused !== undefined) {
      addLogEntry(`同步已${state.paused ? '暂停' : '恢复'}`, state.paused ? 'warning' : 'success');
      if (state.paused) {
        statusIcon.className = 'status-icon paused';
        statusText.textContent = '同步已暂停';
      } else if (isSyncing) {
        statusIcon.className = 'status-icon running';
        statusText.textContent = '正在同步';
      }
    }
  });

  // 监听手动触发同步
  window.api.onTriggerSync(() => {
    addLogEntry('手动触发同步', 'info');
  });

  // 处理同步事件
  function handleSyncEvent(event) {
    switch (event.type) {
      case 'add':
      case 'change':
        stats.syncedFiles++;
        syncedFilesCount.textContent = stats.syncedFiles;
        addLogEntry(`文件已同步: ${event.path}`);
        // 添加文件操作动画效果
        const fileOpEl = document.createElement('div');
        fileOpEl.className = 'file-operation';
        fileOpEl.textContent = `✓ ${event.path}`;
        fileOpEl.style.position = 'fixed';
        fileOpEl.style.bottom = '20px';
        fileOpEl.style.right = '20px';
        fileOpEl.style.padding = '10px';
        fileOpEl.style.backgroundColor = 'var(--success-color)';
        fileOpEl.style.color = 'white';
        fileOpEl.style.borderRadius = '4px';
        fileOpEl.style.zIndex = '1000';
        document.body.appendChild(fileOpEl);
        setTimeout(() => {
          fileOpEl.style.opacity = '0';
          setTimeout(() => document.body.removeChild(fileOpEl), 500);
        }, 2000);
        break;
      
      case 'unlink':
        addLogEntry(`文件已删除: ${event.path}`);
        break;
      
      case 'addDir':
        addLogEntry(`目录已创建: ${event.path}`);
        break;
      
      case 'unlinkDir':
        addLogEntry(`目录已删除: ${event.path}`);
        break;
      
      case 'conflict':
        stats.conflicts++;
        conflictsCount.textContent = stats.conflicts;
        addLogEntry(`文件冲突: ${event.path}`, 'warning');
        break;
      
      case 'ready':
        addLogEntry(event.message, 'info');
        break;
      
      case 'fullSync':
        addLogEntry(event.message, 'info');
        if (event.message.includes('完成')) {
          updateLastSyncTime();
        }
        break;
      
      case 'stop':
        updateSyncStatus(false);
        addLogEntry(event.message, 'warning');
        break;
      
      default:
        addLogEntry(event.message || JSON.stringify(event));
    }
  }

  // 更新同步状态UI
  function updateSyncStatus(syncing) {
    isSyncing = syncing;
    
    if (syncing) {
      statusIcon.className = 'status-icon running';
      statusText.innerHTML = '<span class="sync-animation">↻</span> 正在同步';
      startSyncBtn.disabled = true;
      stopSyncBtn.disabled = false;
      updateLastSyncTime();
    } else {
      statusIcon.className = 'status-icon stopped';
      statusText.textContent = '同步已停止';
      startSyncBtn.disabled = false;
      stopSyncBtn.disabled = true;
    }
  }

  // 更新最后同步时间
  function updateLastSyncTime() {
    stats.lastSync = new Date();
    lastSyncTime.textContent = formatDate(stats.lastSync);
  }

  // 添加日志条目
  function addLogEntry(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatTime(new Date());
    
    entry.appendChild(timestamp);
    entry.appendChild(document.createTextNode(message));
    
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
    
    // 限制日志条目数量，防止内存占用过多
    while (logEntries.children.length > 100) {
      logEntries.removeChild(logEntries.firstChild);
    }
  }

  // 从表单获取配置
  function getConfigFromForm() {
    // 处理过滤规则，将文本框中的每一行转换为数组
    const filters = filtersTextarea.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return {
      sourcePath: sourcePathInput.value,
      targetPath: targetPathInput.value,
      syncMode: syncModeSelect.value,
      deleteMode: deleteModeCheckbox.checked,
      includeHidden: includeHiddenCheckbox.checked,
      followSymlinks: followSymlinksCheckbox.checked,
      maxFileSize: parseInt(maxFileSizeInput.value, 10) || 0,
      conflictResolution: conflictResolutionSelect.value,
      // 增量传输和版本控制配置
      deltaTransfer: deltaTransferCheckbox.checked,
      versionControl: versionControlCheckbox.checked,
      maxVersions: parseInt(maxVersionsInput.value, 10) || 5,
      filters: filters
    };
  }

  // 验证配置
  function validateConfig() {
    if (!sourcePathInput.value) {
      alert('请选择源文件夹');
      return false;
    }
    
    if (!targetPathInput.value) {
      alert('请选择目标文件夹');
      return false;
    }
    
    if (sourcePathInput.value === targetPathInput.value) {
      alert('源文件夹和目标文件夹不能相同');
      return false;
    }
    
    return true;
  }

  // 保存配置到存储
  function saveConfig() {
    if (!sourcePathInput.value || !targetPathInput.value) return;
    
    const config = getConfigFromForm();
    window.api.saveConfig(config);
  }

  // 加载保存的配置
  async function loadConfig() {
    try {
      const config = await window.api.getConfig();
      
      if (config && config.sourcePath) {
        sourcePathInput.value = config.sourcePath;
        targetPathInput.value = config.targetPath || '';
        syncModeSelect.value = config.syncMode || 'mirror';
        deleteModeCheckbox.checked = config.deleteMode !== undefined ? config.deleteMode : true;
        includeHiddenCheckbox.checked = config.includeHidden || false;
        followSymlinksCheckbox.checked = config.followSymlinks || false;
        maxFileSizeInput.value = config.maxFileSize || 0;
        conflictResolutionSelect.value = config.conflictResolution || 'overwrite';
        
        // 加载增量传输和版本控制配置
        deltaTransferCheckbox.checked = config.deltaTransfer || false;
        versionControlCheckbox.checked = config.versionControl || false;
        maxVersionsInput.value = config.maxVersions || 5;
        
        if (config.filters && Array.isArray(config.filters)) {
          filtersTextarea.value = config.filters.join('\n');
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }

  // 初始化主题
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  // 切换主题
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateThemeIcon(newTheme);
    addLogEntry(`已切换到${newTheme === 'dark' ? '暗黑' : '明亮'}主题`, 'info');
  }

  // 更新主题图标
  function updateThemeIcon(theme) {
    if (theme === 'dark') {
      themeToggleIcon.innerHTML = `
        <path d="M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36c-0.98,1.37-2.58,2.26-4.4,2.26
        c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"/>
      `;
    } else {
      themeToggleIcon.innerHTML = `
        <path d="M12,18c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S15.3,18,12,18zM12,8c-2.2,0-4,1.8-4,4c0,2.2,1.8,4,4,4c2.2,0,4-1.8,4-4C16,9.8,14.2,8,12,8z"/>
        <path d="M12,4c-0.6,0-1-0.4-1-1V1c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,3.6,12.6,4,12,4z"/>
        <path d="M12,24c-0.6,0-1-0.4-1-1v-2c0-0.6,0.4-1,1-1s1,0.4,1,1v2C13,23.6,12.6,24,12,24z"/>
        <path d="M5.6,6.6c-0.3,0-0.5-0.1-0.7-0.3L3.5,4.9c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l1.4,1.4c0.4,0.4,0.4,1,0,1.4C6.2,6.5,5.9,6.6,5.6,6.6z"/>
        <path d="M19.8,20.8c-0.3,0-0.5-0.1-0.7-0.3l-1.4-1.4c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l1.4,1.4c0.4,0.4,0.4,1,0,1.4C20.3,20.7,20,20.8,19.8,20.8z"/>
        <path d="M3,13H1c-0.6,0-1-0.4-1-1s0.4-1,1-1h2c0.6,0,1,0.4,1,1S3.6,13,3,13z"/>
        <path d="M23,13h-2c-0.6,0-1-0.4-1-1s0.4-1,1-1h2c0.6,0,1,0.4,1,1S23.6,13,23,13z"/>
        <path d="M4.2,20.8c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-1.4,1.4C4.7,20.7,4.5,20.8,4.2,20.8z"/>
        <path d="M18.4,6.6c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l1.4-1.4c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-1.4,1.4C18.9,6.5,18.6,6.6,18.4,6.6z"/>
      `;
    }
  }

  // 格式化日期: YYYY-MM-DD HH:MM:SS
  function formatDate(date) {
    if (!date) return '-';
    
    const pad = (num) => String(num).padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // 格式化时间: HH:MM:SS
  function formatTime(date) {
    const pad = (num) => String(num).padStart(2, '0');
    
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${hours}:${minutes}:${seconds}`;
  }
});