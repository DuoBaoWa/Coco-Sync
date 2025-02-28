const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');
const readline = require('readline');

// 确保日志目录存在
let logDir;
try {
  // 在生产环境中使用应用数据目录
  logDir = app.getPath('userData');
} catch (e) {
  // 在开发环境中可能无法获取app对象
  logDir = path.join(process.cwd(), 'logs');
}

fs.ensureDirSync(logDir);

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => {
    return `${info.timestamp} [${info.level.toUpperCase()}] ${info.label || 'app'}: ${info.message} ${info.data ? JSON.stringify(info.data) : ''}`;
  })
);

// 创建主日志记录器
const setupLogger = () => {
  const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'coco-sync' },
    transports: [
      // 控制台输出
      new winston.transports.Console(),
      // 文件输出 - 错误日志
      new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'), 
        level: 'error' 
      }),
      // 文件输出 - 所有日志
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });

  return logger;
};

// 创建带有标签的日志记录器
const createLogger = (label) => {
  const logger = setupLogger();
  
  // 创建一个包装器，添加标签
  const wrapper = {};
  const levels = ['error', 'warn', 'info', 'debug'];
  
  levels.forEach(level => {
    wrapper[level] = (message, data) => {
      logger[level](message, { label, data });
    };
  });
  
  return wrapper;
};

// 读取日志文件
const readLogs = async (options = {}) => {
  const { 
    filename = 'combined.log', 
    maxLines = 100, 
    level = null,
    search = null,
    startDate = null,
    endDate = null 
  } = options;
  
  const logFilePath = path.join(logDir, filename);
  
  // 检查文件是否存在
  if (!fs.existsSync(logFilePath)) {
    return [];
  }
  
  return new Promise((resolve, reject) => {
    const logs = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(logFilePath),
      crlfDelay: Infinity
    });
    
    rl.on('line', (line) => {
      try {
        // 解析日志行
        const match = line.match(/^(\S+\s\S+)\s\[(\w+)\]\s([^:]+):\s(.+)$/);
        if (!match) return;
        
        const [, timestamp, logLevel, label, rest] = match;
        let message = rest;
        let data = null;
        
        // 尝试提取JSON数据部分
        const dataMatch = rest.match(/(.+)\s(\{.+\})$/);
        if (dataMatch) {
          try {
            message = dataMatch[1].trim();
            data = JSON.parse(dataMatch[2]);
          } catch (e) {
            // 如果JSON解析失败，使用整个消息
          }
        }
        
        // 应用过滤条件
        if (level && logLevel.toLowerCase() !== level.toLowerCase()) return;
        if (search && !line.toLowerCase().includes(search.toLowerCase())) return;
        
        const logDate = new Date(timestamp);
        if (startDate && logDate < new Date(startDate)) return;
        if (endDate && logDate > new Date(endDate)) return;
        
        logs.push({
          timestamp,
          level: logLevel.toLowerCase(),
          label,
          message,
          data,
          raw: line
        });
        
        // 限制返回的日志行数
        if (logs.length > maxLines) {
          logs.shift(); // 移除最旧的日志
        }
      } catch (error) {
        // 忽略无法解析的行
      }
    });
    
    rl.on('close', () => {
      resolve(logs.reverse()); // 返回最新的日志在前面
    });
    
    rl.on('error', (err) => {
      reject(err);
    });
  });
};

module.exports = { setupLogger, createLogger, readLogs };