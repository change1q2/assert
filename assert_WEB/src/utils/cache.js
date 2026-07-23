const CACHE_PREFIX = 'asset_platform_'
const CACHE_EXPIRE = 7 * 24 * 60 * 60 * 1000
const PENDING_SYNC_KEY = 'pending_sync'

export function getCache(key) {
  try {
    const data = localStorage.getItem(`${CACHE_PREFIX}${key}`)
    if (!data) return null
    const parsed = JSON.parse(data)
    if (parsed.expire && Date.now() > parsed.expire) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

export function setCache(key, data, expireMs = CACHE_EXPIRE) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
      data,
      expire: Date.now() + expireMs,
      timestamp: Date.now(),
    }))
  } catch {
    console.warn(`Failed to set cache for ${key}`)
  }
}

export function removeCache(key) {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`)
  } catch {
    console.warn(`Failed to remove cache for ${key}`)
  }
}

export function clearAllCache() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch {
    console.warn('Failed to clear all cache')
  }
}

// 标记有待同步数据（离线保存的数据）
export function markPendingSync(key, data) {
  try {
    const pending = getPendingSyncs()
    pending[key] = { data, timestamp: Date.now() }
    localStorage.setItem(`${CACHE_PREFIX}${PENDING_SYNC_KEY}`, JSON.stringify(pending))
  } catch {
    console.warn('Failed to mark pending sync')
  }
}

// 获取所有待同步数据
export function getPendingSyncs() {
  try {
    const data = localStorage.getItem(`${CACHE_PREFIX}${PENDING_SYNC_KEY}`)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

// 清除指定待同步数据
export function clearPendingSync(key) {
  try {
    const pending = getPendingSyncs()
    delete pending[key]
    localStorage.setItem(`${CACHE_PREFIX}${PENDING_SYNC_KEY}`, JSON.stringify(pending))
  } catch {
    console.warn('Failed to clear pending sync')
  }
}

// 清除所有待同步数据
export function clearAllPendingSyncs() {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${PENDING_SYNC_KEY}`)
  } catch {
    console.warn('Failed to clear all pending syncs')
  }
}