const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');
const md5File = require('md5-file');
const { minimatch } = require('minimatch');
const { createLogger } = require('./utils/logger');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream');
const pipelineAsync = promisify(pipeline);

// 创建同步引擎的日志记录器
const logger = createLogger('sync-engine');

class SyncEngine {
  constructor(options) {
    this.options = options;
    this.store = options.store;
    this.watcher = null;
    this.syncInProgress = false;
    this.syncQueue = [];
    this.paused = this.store.get('sync.paused', false);
    this.onError = options.onError || (() => {});
    this.onSyncEvent = options.onSyncEvent || (() => {});
    
    // 增量传输相关配置
    this.chunkSize = 1024 * 1024; // 默认块大小为1MB
    this.signatureCache = new Map(); // 缓存文件签名
    
    // 历史版本保留相关配置
    this.versionEnabled = false; // 是否启用版本控制
    this.maxVersions = 5; // 默认保留5个历史版本
    this.versionDir = ''; // 版本存储目录
  }

  // 启动同步过程
  startSync(config) {
    if (this.watcher) {
      this.stopSync();
    }

    this.config = {
      sourcePath: config.sourcePath,
      targetPath: config.targetPath,
      syncMode: config.syncMode || 'mirror', // mirror, increment 或 delta
      deltaTransfer: config.deltaTransfer !== undefined ? config.deltaTransfer : false, // 是否启用增量传输
      deleteMode: config.deleteMode !== undefined ? config.deleteMode : true,
      includeHidden: config.includeHidden || false,
      followSymlinks: config.followSymlinks || false,
      filters: config.filters || [],
      maxFileSize: config.maxFileSize || 0, // 0表示无限制
      conflictResolution: config.conflictResolution || 'overwrite', // overwrite, rename, skip
      versionControl: config.versionControl !== undefined ? config.versionControl : false, // 是否启用版本控制
      maxVersions: config.maxVersions || 5, // 最大保留版本数
      ...config
    };
    
    // 设置版本控制相关参数
    this.versionEnabled = this.config.versionControl;
    this.maxVersions = this.config.maxVersions;
    if (this.versionEnabled) {
      this.versionDir = path.join(this.config.targetPath, '.versions');
      try {
        fs.ensureDirSync(this.versionDir);
      } catch (error) {
        logger.error('创建版本目录失败', error);
        this.versionEnabled = false;
      }
    }

    // 验证源路径和目标路径
    if (!fs.existsSync(this.config.sourcePath)) {
      this.onError(new Error(`源路径不存在: ${this.config.sourcePath}`));
      return;
    }

    // 确保目标路径存在
    try {
      fs.ensureDirSync(this.config.targetPath);
    } catch (error) {
      this.onError(new Error(`无法创建目标路径: ${error.message}`));
      return;
    }

    // 设置监控选项
    const watchOptions = {
      persistent: true,
      ignoreInitial: false, // 首次启动时同步所有文件
      awaitWriteFinish: {
        stabilityThreshold: 2000, // 文件修改后等待2秒再同步，避免频繁写入
        pollInterval: 100
      },
      ignorePermissionErrors: true,
      followSymlinks: this.config.followSymlinks,
      ignored: this.getIgnoredPatterns()
    };

    // 创建文件监控器
    this.watcher = chokidar.watch(this.config.sourcePath, watchOptions);

    // 绑定事件处理器
    this.watcher
      .on('add', this.handleFileAdded.bind(this))
      .on('change', this.handleFileChanged.bind(this))
      .on('unlink', this.handleFileRemoved.bind(this))
      .on('addDir', this.handleDirAdded.bind(this))
      .on('unlinkDir', this.handleDirRemoved.bind(this))
      .on('error', error => {
        logger.error('监控错误', error);
        this.onError(error);
      })
      .on('ready', () => {
        logger.info('初始扫描完成，开始监控文件变化');
        this.onSyncEvent({
          type: 'ready',
          message: '初始扫描完成，开始监控文件变化'
        });

        // 如果是镜像模式，执行一次完整同步以确保目标文件夹与源文件夹一致
        if (this.config.syncMode === 'mirror' && this.config.deleteMode) {
          this.performFullSync();
        }
      });

    logger.info('开始监控', { source: this.config.sourcePath, target: this.config.targetPath });
  }

  // 停止同步
  stopSync() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('停止监控');
      this.onSyncEvent({
        type: 'stop',
        message: '同步已停止'
      });
    }
  }

  // 暂停/恢复同步
  setPaused(paused) {
    this.paused = paused;
    this.store.set('sync.paused', paused);
    logger.info(`同步已${paused ? '暂停' : '恢复'}`);
  }

  // 获取忽略的文件模式
  getIgnoredPatterns() {
    const patterns = [];
    
    // 不同步隐藏文件
    if (!this.config.includeHidden) {
      patterns.push(/(^|\/)\..+/);
    }
    
    // 添加用户自定义过滤规则
    if (this.config.filters && this.config.filters.length > 0) {
      patterns.push(...this.config.filters);
    }
    
    return patterns;
  }

  // 检查文件是否应该被过滤
  shouldFilter(filePath) {
    const relativePath = path.relative(this.config.sourcePath, filePath);
    
    // 检查文件大小限制
    if (this.config.maxFileSize > 0) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > this.config.maxFileSize * 1024 * 1024) { // 转换为字节
          logger.info(`跳过大文件: ${relativePath} (${stats.size} bytes)`);
          return true;
        }
      } catch (error) {
        logger.error(`无法获取文件大小: ${relativePath}`, error);
      }
    }
    
    // 检查过滤规则
    for (const pattern of this.config.filters) {
      if (minimatch(relativePath, pattern)) {
        logger.debug(`文件被过滤: ${relativePath} (匹配规则: ${pattern})`);
        return true;
      }
    }
    
    return false;
  }

  // 处理文件添加事件
  async handleFileAdded(filePath) {
    if (this.paused) return;
    
    try {
      const relativePath = path.relative(this.config.sourcePath, filePath);
      const targetPath = path.join(this.config.targetPath, relativePath);
      
      // 检查是否应该过滤此文件
      if (this.shouldFilter(filePath)) {
        return;
      }
      
      logger.info(`检测到新文件: ${relativePath}`);
      
      // 确保目标目录存在
      await fs.ensureDir(path.dirname(targetPath));
      
      // 复制文件
      await fs.copy(filePath, targetPath, { overwrite: true });
      
      logger.info(`文件已同步: ${relativePath}`);
      this.onSyncEvent({
        type: 'add',
        path: relativePath,
        message: `文件已同步: ${relativePath}`
      });
    } catch (error) {
      logger.error(`同步文件失败: ${filePath}`, error);
      this.onError(error);
    }
  }

  // 处理文件变更事件
  async handleFileChanged(filePath) {
    if (this.paused) return;
    
    try {
      const relativePath = path.relative(this.config.sourcePath, filePath);
      const targetPath = path.join(this.config.targetPath, relativePath);
      
      // 检查是否应该过滤此文件
      if (this.shouldFilter(filePath)) {
        return;
      }
      
      logger.info(`检测到文件变更: ${relativePath}`);
      
      // 检查冲突
      if (await this.checkConflict(filePath, targetPath)) {
        return; // 冲突处理函数会处理后续操作
      }
      
      // 如果启用了版本控制，先保存当前版本
      if (this.versionEnabled && fs.existsSync(targetPath)) {
        await this.saveFileVersion(targetPath, relativePath);
      }
      
      // 如果启用了增量传输，使用增量传输方式
      if (this.config.deltaTransfer && fs.existsSync(targetPath)) {
        await this.deltaTransferFile(filePath, targetPath, relativePath);
      } else {
        // 否则使用普通复制
        await fs.copy(filePath, targetPath, { overwrite: true });
      }
      
      logger.info(`文件已更新: ${relativePath}`);
      this.onSyncEvent({
        type: 'change',
        path: relativePath,
        message: `文件已更新: ${relativePath}`
      });
    } catch (error) {
      logger.error(`更新文件失败: ${filePath}`, error);
      this.onError(error);
    }
  }

  // 处理文件删除事件
  async handleFileRemoved(filePath) {
    if (this.paused || !this.config.deleteMode) return;
    
    try {
      const relativePath = path.relative(this.config.sourcePath, filePath);
      const targetPath = path.join(this.config.targetPath, relativePath);
      
      // 检查目标文件是否存在
      if (!fs.existsSync(targetPath)) {
        return;
      }
      
      logger.info(`检测到文件删除: ${relativePath}`);
      
      // 删除目标文件
      await fs.remove(targetPath);
      
      logger.info(`文件已删除: ${relativePath}`);
      this.onSyncEvent({
        type: 'unlink',
        path: relativePath,
        message: `文件已删除: ${relativePath}`
      });
    } catch (error) {
      logger.error(`删除文件失败: ${filePath}`, error);
      this.onError(error);
    }
  }

  // 处理目录添加事件
  async handleDirAdded(dirPath) {
    if (this.paused) return;
    
    try {
      const relativePath = path.relative(this.config.sourcePath, dirPath);
      const targetPath = path.join(this.config.targetPath, relativePath);
      
      logger.info(`检测到新目录: ${relativePath}`);
      
      // 创建目标目录
      await fs.ensureDir(targetPath);
      
      logger.info(`目录已创建: ${relativePath}`);
      this.onSyncEvent({
        type: 'addDir',
        path: relativePath,
        message: `目录已创建: ${relativePath}`
      });
    } catch (error) {
      logger.error(`创建目录失败: ${dirPath}`, error);
      this.onError(error);
    }
  }

  // 处理目录删除事件
  async handleDirRemoved(dirPath) {
    if (this.paused || !this.config.deleteMode) return;
    
    try {
      const relativePath = path.relative(this.config.sourcePath, dirPath);
      const targetPath = path.join(this.config.targetPath, relativePath);
      
      // 检查目标目录是否存在
      if (!fs.existsSync(targetPath)) {
        return;
      }
      
      logger.info(`检测到目录删除: ${relativePath}`);
      
      // 删除目标目录
      await fs.remove(targetPath);
      
      logger.info(`目录已删除: ${relativePath}`);
      this.onSyncEvent({
        type: 'unlinkDir',
        path: relativePath,
        message: `目录已删除: ${relativePath}`
      });
    } catch (error) {
      logger.error(`删除目录失败: ${dirPath}`, error);
      this.onError(error);
    }
  }

  // 检查文件冲突
  async checkConflict(sourcePath, targetPath) {
    // 如果目标文件不存在，则没有冲突
    if (!fs.existsSync(targetPath)) {
      return false;
    }
    
    try {
      // 获取源文件和目标文件的哈希值
      const sourceHash = await md5File(sourcePath);
      const targetHash = await md5File(targetPath);
      
      // 如果哈希值相同，则文件内容相同，不需要同步
      if (sourceHash === targetHash) {
        return true; // 跳过同步
      }
      
      // 获取文件的最后修改时间
      const sourceStats = fs.statSync(sourcePath);
      const targetStats = fs.statSync(targetPath);
      
      // 如果目标文件比源文件更新，可能存在冲突
      if (targetStats.mtime > sourceStats.mtime) {
        const relativePath = path.relative(this.config.sourcePath, sourcePath);
        logger.warn(`检测到文件冲突: ${relativePath}`);
        
        // 根据冲突解决策略处理
        switch (this.config.conflictResolution) {
          case 'overwrite':
            // 默认覆盖，不做特殊处理
            logger.info(`冲突解决: 覆盖目标文件 ${relativePath}`);
            return false;
            
          case 'rename':
            // 保留两者，重命名新文件
            const ext = path.extname(targetPath);
            const base = path.basename(targetPath, ext);
            const dir = path.dirname(targetPath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const newTargetPath = path.join(dir, `${base}_conflict_${timestamp}${ext}`);
            
            // 复制源文件到新名称
            await fs.copy(sourcePath, newTargetPath);
            
            logger.info(`冲突解决: 保留两者 ${relativePath} -> ${path.basename(newTargetPath)}`);
            this.onSyncEvent({
              type: 'conflict',
              path: relativePath,
              message: `文件冲突已解决: ${relativePath} (保留两者)`
            });
            return true;
            
          case 'skip':
            // 跳过此文件
            logger.info(`冲突解决: 跳过文件 ${relativePath}`);
            this.onSyncEvent({
              type: 'conflict',
              path: relativePath,
              message: `文件冲突已解决: ${relativePath} (跳过)`
            });
            return true;
            
          default:
            return false;
        }
      }
      
      return false;
    } catch (error) {
      logger.error(`检查文件冲突失败: ${sourcePath}`, error);
      this.onError(error);
      return false;
    }
  }
  
  // 执行完整同步（镜像模式）
  async performFullSync() {
    if (this.paused) return;
    
    logger.info('开始执行完整同步...');
    this.onSyncEvent({
      type: 'fullSync',
      message: '开始执行完整同步...'
    });
    
    try {
      // 获取源目录中的所有文件
      const sourceFiles = await this.getAllFiles(this.config.sourcePath);
      
      // 获取目标目录中的所有文件
      const targetFiles = await this.getAllFiles(this.config.targetPath);
      
      // 找出目标目录中多余的文件（在目标中存在但在源中不存在）
      const extraFiles = targetFiles.filter(targetFile => {
        const relativePath = path.relative(this.config.targetPath, targetFile);
        const sourcePath = path.join(this.config.sourcePath, relativePath);
        return !fs.existsSync(sourcePath);
      });
      
      // 删除多余的文件
      if (this.config.deleteMode) {
        for (const extraFile of extraFiles) {
          const relativePath = path.relative(this.config.targetPath, extraFile);
          
          // 检查是否是目录
          const stats = fs.statSync(extraFile);
          if (stats.isDirectory()) {
            // 检查目录是否为空
            const files = fs.readdirSync(extraFile);
            if (files.length === 0) {
              await fs.remove(extraFile);
              logger.info(`删除多余目录: ${relativePath}`);
              this.onSyncEvent({
                type: 'unlinkDir',
                path: relativePath,
                message: `删除多余目录: ${relativePath}`
              });
            }
          } else {
            await fs.remove(extraFile);
            logger.info(`删除多余文件: ${relativePath}`);
            this.onSyncEvent({
              type: 'unlink',
              path: relativePath,
              message: `删除多余文件: ${relativePath}`
            });
          }
        }
      }
      
      logger.info('完整同步完成');
      this.onSyncEvent({
        type: 'fullSync',
        message: '完整同步完成'
      });
    } catch (error) {
      logger.error('完整同步失败', error);
      this.onError(error);
    }
  }
  
  // 递归获取目录中的所有文件和文件夹
  async getAllFiles(dirPath) {
    const result = [];
    
    async function traverse(currentPath) {
      const files = await fs.readdir(currentPath);
      
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stats = await fs.stat(filePath);
        
        result.push(filePath);
        
        if (stats.isDirectory()) {
          await traverse(filePath);
        }
      }
    }
    
    await traverse(dirPath);
    return result;
  }
  
  // 保存文件的历史版本
  async saveFileVersion(filePath, relativePath) {
    try {
      // 创建版本目录结构
      const versionFilePath = path.join(this.versionDir, relativePath);
      const versionDir = path.dirname(versionFilePath);
      await fs.ensureDir(versionDir);
      
      // 生成版本文件名
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const versionFileName = `${baseName}_${timestamp}${ext}`;
      const versionPath = path.join(versionDir, versionFileName);
      
      // 复制当前文件作为历史版本
      await fs.copy(filePath, versionPath);
      
      // 压缩历史版本以节省空间
      // 管理历史版本数量，删除过多的旧版本
      await this.cleanupOldVersions(versionDir, baseName, ext);
      
      logger.info(`已保存文件历史版本: ${relativePath}`);
    } catch (error) {
      logger.error(`保存文件历史版本失败: ${relativePath}`, error);
    }
  }
  
  // 清理旧版本文件
  async cleanupOldVersions(versionDir, baseName, ext) {
    try {
      const files = await fs.readdir(versionDir);
      const versionFiles = files.filter(file => 
        file.startsWith(baseName + '_') && file.endsWith(ext)
      );
      
      if (versionFiles.length <= this.maxVersions) {
        return;
      }
      
      // 按时间戳排序（从新到旧）
      versionFiles.sort().reverse();
      
      // 删除多余的旧版本
      for (let i = this.maxVersions; i < versionFiles.length; i++) {
        const oldVersionPath = path.join(versionDir, versionFiles[i]);
        await fs.remove(oldVersionPath);
        logger.debug(`删除旧版本文件: ${versionFiles[i]}`);
      }
    } catch (error) {
      logger.error(`清理旧版本文件失败`, error);
    }
  }
}

// 设置同步引擎
function setupSyncEngine(options) {
  return new SyncEngine(options);
}

module.exports = {
  setupSyncEngine
};

module.exports = { SyncEngine, setupSyncEngine };