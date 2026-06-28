import { mockAssets, mockRecords, mockDebts, mockAccounts, mockAssetClasses, mockAnalysis } from '../data/mockData'

const API_BASE = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  ? 'http://127.0.0.1:3000/api'
  : '/api'

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
    return response.data || mockAssets
  } catch {
    return mockAssets
  }
}

export async function fetchOverview() {
  try {
    const response = await request('/overview')
    return response.data || mockAnalysis
  } catch {
    return mockAnalysis
  }
}

export async function fetchRecords() {
  try {
    const response = await request('/records')
    return response.data || mockRecords
  } catch {
    return mockRecords
  }
}

export async function fetchDebts() {
  try {
    const response = await request('/debts')
    return response.data || mockDebts
  } catch {
    return mockDebts
  }
}

export async function fetchAccounts() {
  try {
    const response = await request('/accounts')
    return response.data || mockAccounts
  } catch {
    return mockAccounts
  }
}

export async function fetchAssetClasses() {
  try {
    const response = await request('/asset-classes')
    return response.data || mockAssetClasses
  } catch {
    return mockAssetClasses
  }
}

export async function fetchAnalysis() {
  try {
    const response = await request('/analysis')
    return response.data || mockAnalysis
  } catch {
    return mockAnalysis
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
      debts: mockDebts,
      records: mockRecords,
      accounts: mockAccounts,
      assetClasses: mockAssetClasses,
      overviewGoals: {},
    }
  } catch {
    return {
      debts: mockDebts,
      records: mockRecords,
      accounts: mockAccounts,
      assetClasses: mockAssetClasses,
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
