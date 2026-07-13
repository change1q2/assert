import { DEFAULT_EXCHANGE_RATES, CURRENCIES } from '../utils/currency.js'

const API_BASE = '/api'

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
    return response.data || []
  } catch {
    return []
  }
}

export async function fetchOverview() {
  try {
    const response = await request('/overview')
    return response.data || {}
  } catch {
    return {}
  }
}

export async function fetchRecords() {
  try {
    const response = await request('/records')
    return response.data || []
  } catch {
    return []
  }
}

export async function fetchDebts() {
  try {
    const response = await request('/debts')
    return response.data || []
  } catch {
    return []
  }
}

export async function fetchAccounts() {
  try {
    const response = await request('/accounts')
    return response.data || []
  } catch {
    return []
  }
}

export async function fetchAssetClasses() {
  try {
    const response = await request('/asset-classes')
    return response.data || []
  } catch {
    return []
  }
}

export async function fetchAnalysis() {
  try {
    const response = await request('/analysis')
    return response.data || {}
  } catch {
    return {}
  }
}

export async function createRecord(data) {
  try {
    const response = await request('/records', {
      method: 'POST',
      body: JSON.stringify(data),
    })
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
    return response
  } catch {
    return { success: true, data: { ...data, id: Date.now() } }
  }
}

export async function fetchState() {
  try {
    const response = await request('/state')
    if (response.error && response.error.includes('未授权')) {
      localStorage.removeItem('token')
      localStorage.removeItem('state')
      window.location.reload()
      return {}
    }
    if (response.message && response.message.includes('登录')) {
      return {
        debts: [],
        records: [],
        accounts: [],
        assetClasses: [],
        overviewGoals: {},
        books: [],
        tags: [],
      }
    }
    return response.state || response.data || {
      debts: [],
      records: [],
      accounts: [],
      assetClasses: [],
      overviewGoals: {},
      books: [],
      tags: [],
    }
  } catch {
    return {
      debts: [],
      records: [],
      accounts: [],
      assetClasses: [],
      overviewGoals: {},
      books: [],
      tags: [],
    }
  }
}

export async function saveState(state) {
  const response = await request('/state', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  })
  if (response && response.ok) return response
  throw new Error(response?.error || '保存状态失败')
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

export async function lookupFinance(q) {
  try {
    const response = await request(`/finance/lookup?q=${encodeURIComponent(q)}`)
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

export async function fetchFundNav(code) {
  try {
    const response = await request(`/finance/fund-nav?code=${encodeURIComponent(code)}`, {
      method: 'GET',
    })
    return response
  } catch {
    return null
  }
}
