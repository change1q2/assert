/**
 * 结构化日志工具
 * 替代 console.log/error，提供统一的日志格式和级别控制
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

function log(level, levelName, message, ...args) {
  if (level > currentLevel) return;

  const meta = args.length === 1 && typeof args[0] === 'object' ? args[0] : {};
  const extraArgs = args.length === 1 && typeof args[0] === 'object' ? [] : args;

  const formatted = formatMessage(levelName, message, meta);
  if (level === LOG_LEVELS.ERROR) {
    console.error(formatted, ...extraArgs);
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(formatted, ...extraArgs);
  } else {
    console.log(formatted, ...extraArgs);
  }
}

export const logger = {
  error: (message, ...args) => log(LOG_LEVELS.ERROR, 'ERROR', message, ...args),
  warn: (message, ...args) => log(LOG_LEVELS.WARN, 'WARN', message, ...args),
  info: (message, ...args) => log(LOG_LEVELS.INFO, 'INFO', message, ...args),
  debug: (message, ...args) => log(LOG_LEVELS.DEBUG, 'DEBUG', message, ...args),

  // 带请求上下文的日志
  withRequest: (req, message, ...args) => {
    const meta = {
      method: req.method,
      url: req.url,
      ip: req.socket?.remoteAddress || req.headers['x-forwarded-for'],
    };
    log(LOG_LEVELS.INFO, 'INFO', message, meta, ...args);
  },

  // 带性能数据的日志
  withTiming: (message, startTime, meta = {}) => {
    const duration = Date.now() - startTime;
    log(LOG_LEVELS.INFO, 'INFO', message, { duration: `${duration}ms`, ...meta });
  },
};

export default logger;
