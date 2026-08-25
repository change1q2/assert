import { DEFAULT_EXCHANGE_RATES, CURRENCIES } from '../utils/currency.js'
import { getCache, setCache, markPendingSync, getPendingSyncs, clearPendingSync, clearAllPendingSyncs, removeCache } from '../utils/cache.js'

export { getPendingSyncs }

const API_BASE = '/api'

// 内存级内存缓存 + 并发去重：避免多个页面同时mount时重复请求/state/接口
const MEM_CACHE_TTL = 10 * 1000 // 10秒内相同请求直接返回内存缓存
const memCache = new Map() // key -> { data, expireAt }
const pendingRequests = new Map() // key -> Promise

function getMemCache(key) {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expireAt) {
    memCache.delete(key)
    return null
  }
  return entry.data
}

function setMemCache(key, data, ttl = MEM_CACHE_TTL) {
  memCache.set(key, { data, expireAt: Date.now() + ttl })
}

async function withMemCache(key, fetcher, ttl) {
  const cached = getMemCache(key)
  if (cached) return cached
  const pending = pendingRequests.get(key)
  if (pending) return pending
  const promise = (async () => {
    try {
      const result = await fetcher()
      setMemCache(key, result, ttl)
      return result
    } finally {
      pendingRequests.delete(key)
    }
  })()
  pendingRequests.set(key, promise)
  return promise
}

async function request(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    if (response.status === 401) {
      return { success: false, data: null, error: '未授权' }
    }
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json()
}

export async function fetchAssets() {
  try {
    const response = await request('/assets')
    const data = response.data || []
    setCache('assets', data)
    return data
  } catch {
    const cached = getCache('assets')
    return cached || []
  }
}

export async function fetchOverview() {
  try {
    const response = await request('/overview')
    const data = response.data || {}
    setCache('overview', data)
    return data
  } catch {
    const cached = getCache('overview')
    return cached || {}
  }
}

export async function fetchRecords() {
  try {
    const response = await request('/records')
    const data = response.data || []
    setCache('records', data)
    return data
  } catch {
    const cached = getCache('records')
    return cached || []
  }
}

export async function fetchDebts() {
  try {
    const response = await request('/debts')
    const data = response.data || []
    setCache('debts', data)
    return data
  } catch {
    const cached = getCache('debts')
    return cached || []
  }
}

export async function fetchAccounts() {
  try {
    const response = await request('/accounts')
    const data = response.data || []
    setCache('accounts', data)
    return data
  } catch {
    const cached = getCache('accounts')
    if (cached) return cached
    return [
      { id: '1', name: '工商银行储蓄卡', owner: '本人', currency: 'CNY', type: 'bank', balance: 10000, liability: 0, enabled: true, is_default: true, sort_order: 0 },
      { id: '2', name: '支付宝余额', owner: '本人', currency: 'CNY', type: 'wallet', balance: 5000, liability: 0, enabled: true, is_default: false, sort_order: 1 },
      { id: '3', name: '微信零钱', owner: '本人', currency: 'CNY', type: 'wallet', balance: 2000, liability: 0, enabled: true, is_default: false, sort_order: 2 },
    ]
  }
}

export async function fetchAssetClasses() {
  try {
    const response = await request('/asset-classes')
    const data = response.data || []
    setCache('assetClasses', data)
    return data
  } catch {
    const cached = getCache('assetClasses')
    return cached || []
  }
}

export async function fetchAnalysis() {
  try {
    const response = await request('/analysis')
    const data = response.data || {}
    setCache('analysis', data)
    return data
  } catch {
    const cached = getCache('analysis')
    return cached || {}
  }
}

export async function createRecord(data) {
  try {
    const response = await request('/records', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    removeCache('records')
    removeCache('state')
    return response
  } catch {
    return { success: true, data: { ...data, id: Date.now() } }
  }
}

export async function createDebt(data) {
  try {
    const response = await request('/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    removeCache('debts')
    removeCache('state')
    return response
  } catch {
    return { success: true, data: { ...data, id: Date.now() } }
  }
}

export async function createAccount(data) {
  try {
    const response = await request('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    removeCache('accounts')
    removeCache('state')
    return response
  } catch {
    return { success: true, data: { ...data, id: Date.now() } }
  }
}

export async function updateAccount(id, data) {
  try {
    const response = await request(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    removeCache('accounts')
    removeCache('state')
    return response
  } catch {
    return { success: true, data: { ...data, id } }
  }
}

export async function deleteAccount(id) {
  try {
    const response = await request(`/accounts/${id}`, {
      method: 'DELETE',
    })
    removeCache('accounts')
    removeCache('state')
    return response
  } catch {
    return { success: true }
  }
}

export async function createAsset(data) {
  try {
    const response = await request('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    removeCache('assets')
    removeCache('state')
    return response
  } catch {
    return { success: true, data: { ...data, id: Date.now() } }
  }
}

export async function fetchState() {
  return withMemCache('state', async () => {
  try {
    const response = await request('/state')
    if (response.error && response.error.includes('未授权')) {
      // token 失效：清除凭证，返回缓存/默认状态，不 reload 以避免中止其他请求导致 ERR_ABORTED
      localStorage.removeItem('token')
      const cached = getCache('state')
      if (cached) return cached
      return getDefaultState()
    }
    if (response.message && response.message.includes('登录')) {
      const cached = getCache('state')
      if (cached) return cached
      return getDefaultState()
    }
    const data = response.state || response.data || getDefaultState()
    setCache('state', data)
    return data
  } catch (err) {
    console.warn('Fetch state failed, using cache:', err.message)
    const cached = getCache('state')
    if (cached) return cached
    // 没有缓存且请求失败：返回默认状态，但不覆盖已有缓存
    // 检查是否有 strategies_cache 备份
    try {
      const saved = localStorage.getItem('strategies_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && Array.isArray(parsed.list)) {
          const defaultState = getDefaultState()
          defaultState.strategies = parsed
          return defaultState
        }
      }
    } catch {}
    console.info('No cache found, using default state')
    const defaultState = getDefaultState()
    return defaultState
  }
  }, 10 * 1000)
}

// 同步获取缓存的 state（用于 SWR：组件先立即渲染旧内容，再后台静默更新）
export function peekCachedState() {
  const mem = getMemCache('state')
  if (mem) return mem
  const storage = getCache('state')
  if (storage) return storage
  // localStorage 备份
  try {
    const accounts = localStorage.getItem('wealth_os_accounts')
    const assets = localStorage.getItem('wealth_os_independent_assets')
    if (accounts || assets) {
      return {
        accounts: accounts ? JSON.parse(accounts) : [],
        independentAssets: assets ? JSON.parse(assets) : {},
      }
    }
  } catch {}
  return null
}

// 主动失效 state 缓存（保存数据后调用）
export function invalidateStateCache() {
  memCache.delete('state')
  pendingRequests.delete('state')
}

function getDefaultState() {
  return {
    debts: [],
    records: [],
    accounts: [
      { id: '1', name: '工商银行储蓄卡', owner: '本人', currency: 'CNY', type: 'bank', balance: 10000, liability: 0, enabled: true, is_default: true, sort_order: 0 },
      { id: '2', name: '支付宝余额', owner: '本人', currency: 'CNY', type: 'wallet', balance: 5000, liability: 0, enabled: true, is_default: false, sort_order: 1 },
      { id: '3', name: '微信零钱', owner: '本人', currency: 'CNY', type: 'wallet', balance: 2000, liability: 0, enabled: true, is_default: false, sort_order: 2 },
    ],
    assetClasses: [],
    overviewGoals: {},
    books: [],
    tags: [],
    exchangeRates: {},
    customRecordCategories: [],
    financeTertiaryCategories: [],
    recordTags: [],
    recorders: [],
    reminders: [],
    debtPayments: [],
    debtCategories: [],
    strategies: { list: [], pools: {} },
    userSettings: {},
    financeAssets: [],
    financeAssetTransactions: [],
    financeAssetIndoorTransactions: [],
    financeAssetOutdoorTransactions: [],
  }
}

export async function saveState(state) {
  try {
    const response = await request('/state', {
      method: 'PUT',
      body: JSON.stringify({ state }),
    })
    // 服务端可能返回 { ok: true } / { success: true } / { state: ... } / { data: ... }
    // 只要响应是 truthy 且没有 error, 都视为成功
    const isOk = response && !response.error && (
      response.ok === true ||
      response.success === true ||
      response.state ||
      response.data ||
      (typeof response === 'object' && Object.keys(response).length > 0)
    )
    if (isOk) {
      // 只缓存轻量索引，避免 full_state 超过 localStorage 配额
      try {
        const accountsSnap = state.accounts ? state.accounts.map(a => ({
          id: a.id, name: a.name, type: a.type, balance: a.balance,
          owners: a.owners, ownershipType: a.ownershipType,
          category: a.category, subCategory: a.subCategory,
        })) : [];
        localStorage.setItem('wealth_os_accounts', JSON.stringify(accountsSnap));
      } catch (_) { /* ignore */ }
      clearPendingSync('state')
      invalidateStateCache()
      // 同时清除 localStorage 中的 state 缓存，确保刷新/下次拉取直接走后端最新数据，
      // 避免仅在"后端失败时"才 fallback 到旧缓存导致手动修改的状态看起来"没保存"
      removeCache('state')
      removeCache('debts')
      return { ok: true, server: true }
    }
    // 服务端返回非成功状态
    throw new Error(response?.error || response?.message || '保存状态失败')
  } catch (err) {
    console.error('[saveState] 服务端保存失败:', err.message)
    // 缓存到 localStorage 作为临时回退
    try {
      const accountsSnap = state.accounts ? state.accounts.map(a => ({
        id: a.id, name: a.name, type: a.type, balance: a.balance,
        owners: a.owners, ownershipType: a.ownershipType,
        category: a.category, subCategory: a.subCategory,
      })) : [];
      localStorage.setItem('wealth_os_accounts', JSON.stringify(accountsSnap));
      markPendingSync('state', state)
      return { ok: true, server: false, cached: true, error: err.message }
    } catch {
      return { ok: false, server: false, error: err.message }
    }
  }
}

// 同步待同步数据到数据库
export async function syncPendingData() {
  const pending = getPendingSyncs()
  const keys = Object.keys(pending)

  if (keys.length === 0) {
    return { synced: 0, message: '没有待同步的数据' }
  }

  let syncedCount = 0
  const errors = []

  for (const key of keys) {
    try {
      if (key === 'state') {
        const response = await request('/state', {
          method: 'PUT',
          body: JSON.stringify({ state: pending[key].data }),
        })
        if (response && (response.ok || response.success)) {
          clearPendingSync('state')
          syncedCount++
        }
      }
    } catch (err) {
      errors.push({ key, error: err.message })
    }
  }

  if (syncedCount > 0) {
    console.log(`✅ 已同步 ${syncedCount} 条本地数据到数据库`)
  }

  return {
    synced: syncedCount,
    total: keys.length,
    errors: errors.length > 0 ? errors : null,
    message: errors.length > 0 ? `同步完成，${errors.length} 条失败` : `已同步 ${syncedCount} 条数据`
  }
}

// 检查网络连接并自动同步
export async function checkAndSync() {
  if (!navigator.onLine) {
    return { online: false, message: '网络未连接' }
  }

  try {
    const response = await request('/state')
    if (response && !response.error) {
      const syncResult = await syncPendingData()
      return { online: true, connected: true, ...syncResult }
    }
  } catch {
    return { online: true, connected: false, message: '数据库未连接' }
  }

  return { online: true, connected: true, synced: 0 }
}

export async function fetchBooks() {
  try {
    const response = await request('/state')
    return response.data?.books || []
  } catch {
    return []
  }
}

export async function createBook(data) {
  try {
    const response = await request('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  } catch {
    return { success: true, data: { ...data, id: Date.now() } }
  }
}

export async function saveBooks(books) {
  try {
    const response = await request('/state', {
      method: 'PUT',
      body: JSON.stringify({ books }),
    })
    return response
  } catch {
    return { success: false, error: '保存账本失败' }
  }
}

export async function fetchPremium(force = false) {
  try {
    const url = force ? '/tools/premium?refresh=1' : '/tools/premium'
    const response = await request(url)
    return response
  } catch {
    return {
      rows: [],
      fetchedAt: new Date().toISOString(),
      source: '本地缓存',
      sourceCount: 0,
    }
  }
}

export async function fetchHkIpo(params = {}) {
  try {
    const query = new URLSearchParams(params).toString()
    const url = `/tools/hk-ipo${query ? '?' + query : ''}`
    const response = await request(url)
    return response
  } catch {
    return {
      rows: [],
      recommendations: [],
      bigVRows: [],
      scoreRows: [],
      rules: [],
      validationRows: [],
      dataSources: [],
      stats: null,
      fetchedAt: '',
      source: '',
      threshold: 6,
    }
  }
}

export async function saveHkIpoRules(data) {
  try {
    const response = await request('/tools/hk-ipo/rules', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response
  } catch {
    return { ok: false, error: '保存失败' }
  }
}

export async function exportHkIpo(params = {}) {
  try {
    const token = localStorage.getItem('token')
    const query = new URLSearchParams(params).toString()
    const url = `/api/tools/hk-ipo/export${query ? '?' + query : ''}`
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error('导出失败')
    return response.blob()
  } catch {
    throw new Error('导出失败')
  }
}

export async function fetchExchangeRates(baseCurrency = 'CNY') {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    const data = await response.json()

    const supportedCodes = new Set(CURRENCIES.map(c => c.code))
    const rates = {}
    const baseToCny = data.rates['CNY'] || 1

    for (const code of supportedCodes) {
      if (code === 'CNY') {
        rates[code] = 1
      } else if (data.rates[code]) {
        rates[code] = baseToCny / data.rates[code]
      } else {
        rates[code] = DEFAULT_EXCHANGE_RATES[code]
      }
    }

    return rates
  } catch {
    return { ...DEFAULT_EXCHANGE_RATES }
  }
}

export async function fetchRealTimeExchangeRates(force = false) {
  try {
    const url = force ? '/tools/exchange-rates?refresh=1' : '/tools/exchange-rates'
    const response = await request(url)
    return response.rates || { ...DEFAULT_EXCHANGE_RATES }
  } catch {
    return { ...DEFAULT_EXCHANGE_RATES }
  }
}

// 获取港股通参考汇率
export async function fetchHkConnectRate(force = false) {
  try {
    const url = force ? '/tools/hk-connect-rate?refresh=1' : '/tools/hk-connect-rate'
    const response = await request(url)
    return response || null
  } catch {
    return null
  }
}

export async function lookupFinance(q, market, options = {}) {
  try {
    const params = new URLSearchParams({ q });
    if (market) params.append('market', market);
    if (options.excludeStock) params.append('excludeStock', '1');
    const response = await request(`/finance/lookup?${params.toString()}`)
    return response.items || []
  } catch {
    return []
  }
}

export async function fetchFinanceQuotes(codes) {
  try {
    const response = await request('/finance/quotes', {
      method: 'POST',
      body: JSON.stringify({ codes }),
    })
    return response.quotes || []
  } catch {
    return []
  }
}

export async function fetchFundNav(codes) {
  try {
    const response = await request('/finance/fund-nav', {
      method: 'POST',
      body: JSON.stringify({ codes }),
    })
    return response.funds || []
  } catch {
    return []
  }
}

export async function fetchFundNavDetail(code) {
  try {
    const response = await request(`/finance/fund-nav?code=${encodeURIComponent(code)}`, {
      method: 'GET',
    })
    return response
  } catch {
    return null
  }
}

export async function fetchMoneyFundData(codes) {
  try {
    const response = await request('/finance/money-fund', {
      method: 'POST',
      body: JSON.stringify({ codes }),
    })
    return response.funds || []
  } catch {
    return []
  }
}

// 货币基金：每万份收益 + 7日年化（走 python-server，经 vite 代理 /api/vi-api -> /api）
export async function fetchMoneyFund(code) {
  try {
    const response = await fetch(`/api/vi-api/fund/money/${encodeURIComponent(code)}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// 货币基金网页兜底：从天天基金网页直接抓取万份收益和七日年化
// 当 API 接口无法获取数据时，通过 Vite 代理请求天天基金基金详情页 HTML 并解析
export async function fetchMoneyFundFromWeb(code) {
  try {
    // 天天基金基金详情页：https://fund.eastmoney.com/{code}.html
    // 页面中包含"每万份收益"和"7日年化"数据
    const url = `/api/eastmoney/${encodeURIComponent(code)}.html`
    const response = await fetch(url)
    if (!response.ok) return null
    const html = await response.text()

    // 解析万份收益：页面中格式为 "每万份收益</a> (MM-DD)\n 数值"
    // 或 <span class="Mingcheng">每万份收益</span> ... 数值
    let navPer10k = null
    let annualized7d = null
    let navDate = ''
    let name = ''

    // 提取基金名称
    const nameMatch = html.match(/<title>([^<]+?)\(/)
    if (nameMatch) name = nameMatch[1].trim()

    // 提取万份收益：匹配 "每万份收益" 后面的数值
    // 页面格式: 每万份收益</a> (08-14)\n0.3773
    const navMatch = html.match(/每万份收益[\s\S]*?\(([\d-]+)\)[\s\S]*?>([\d.]+)</)
    if (navMatch) {
      navPer10k = parseFloat(navMatch[2])
      navDate = navMatch[1]
    } else {
      // 备用正则：更宽松匹配
      const navMatch2 = html.match(/每万份收益[\s\S]{0,200}?>([\d.]+)</)
      if (navMatch2) navPer10k = parseFloat(navMatch2[1])
    }

    // 提取七日年化：匹配 "7日年化" 后面的数值
    const annMatch = html.match(/7日年化[\s\S]*?\(([\d-]+)\)[\s\S]*?>([\d.]+)%?</)
    if (annMatch) {
      annualized7d = parseFloat(annMatch[2])
      if (!navDate) navDate = annMatch[1]
    } else {
      // 备用正则
      const annMatch2 = html.match(/7日年化[\s\S]{0,200}?>([\d.]+)%?</)
      if (annMatch2) annualized7d = parseFloat(annMatch2[1])
    }

    if (navPer10k == null && annualized7d == null) return null
    return {
      nav_per_10k: navPer10k,
      annualized_7d: annualized7d,
      date: navDate || '',
      name: name || '',
      _source: 'web',
    }
  } catch {
    return null
  }
}

// 通用基金净值（LOF/ETF/场外基金）：最新净值 + 前一日净值（走 python-server）
export async function fetchFundNavQuote(code) {
  try {
    const response = await fetch(`/api/vi-api/fund/nav/${encodeURIComponent(code)}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}
