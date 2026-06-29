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
    return response.data || {
      debts: [],
      records: [],
      accounts: [],
      assetClasses: [],
      overviewGoals: {},
    }
  } catch {
    return {
      debts: [],
      records: [],
      accounts: [],
      assetClasses: [],
      overviewGoals: {},
    }
  }
}

export async function saveState(state) {
  try {
    const response = await request('/state', {
      method: 'PUT',
      body: JSON.stringify(state),
    })
    return response
  } catch {
    return { success: false, error: '保存状态失败' }
  }
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
