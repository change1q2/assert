/**
 * API 请求模块
 * 提供统一的API请求函数和会话管理
 */

// API 基础URL，需要在调用前设置
let API_BASE = "";

// 认证信息，需要在调用前设置
let auth = { token: "", currentUser: "", users: [] };

/**
 * 设置API基础配置
 * @param {string} baseUrl - API服务器地址
 * @param {object} authInfo - 认证信息对象
 */
export function configure(baseUrl, authInfo) {
  API_BASE = baseUrl;
  if (authInfo) auth = authInfo;
}

/**
 * 获取当前认证信息
 * @returns {object} 认证信息
 */
export function getAuth() {
  return auth;
}

/**
 * 设置认证信息
 * @param {object} authInfo - 新的认证信息
 */
export function setAuth(authInfo) {
  auth = authInfo;
}

/**
 * 统一的API请求函数
 * @param {string} path - API路径
 * @param {object} options - 请求选项
 * @returns {Promise<object>} 响应数据
 */
export async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      auth = { token: "", currentUser: "", users: [] };
      if (typeof saveAuth === "function") saveAuth();
    }
    throw new Error(payload.message || "服务器请求失败");
  }
  return payload;
}

/**
 * 引导会话，获取用户信息和完整状态
 * @param {function} normalizeLoadedState - 状态规范化函数
 * @param {function} saveAuthFn - 保存认证的函数
 * @param {object} seed - 初始种子数据
 * @param {function} saveStateFn - 保存状态的函数
 * @returns {Promise<{user: object, state: object}>}
 */
export async function bootstrapSession(normalizeLoadedState, saveAuthFn, seed, saveStateFn) {
  if (!auth.token) return null;
  try {
    const [{ user }, stateResponse] = await Promise.all([
      apiRequest("/auth/me"),
      apiRequest("/state"),
    ]);
    auth.currentUser = user.account;
    auth.users = [{ account: user.account, profile: user }];
    const state = normalizeLoadedState(stateResponse.state);
    localStorage.setItem("asset-platform-v18", JSON.stringify(state));
    if (saveAuthFn) saveAuthFn();
    return { user, state };
  } catch (error) {
    console.warn("登录会话恢复失败", error);
    auth = { token: "", currentUser: "", users: [] };
    const state = normalizeLoadedState(structuredClone(seed));
    if (saveAuthFn) saveAuthFn();
    return null;
  }
}

/**
 * 发布目录加载状态
 */
export const releaseCatalogState = {
  loading: false,
  loadedAt: null,
  items: [],
  error: "",
};

/**
 * 加载发布目录
 * @param {string} currentModule - 当前模块名称
 * @param {function} renderFn - 渲染函数
 * @param {boolean} force - 是否强制刷新
 */
export async function loadReleaseCatalog(currentModule, renderFn, force = false) {
  if (releaseCatalogState.loading) return;
  if (releaseCatalogState.loadedAt && !force) return;
  releaseCatalogState.loading = true;
  releaseCatalogState.error = "";
  if (currentModule === "downloads" && renderFn) renderFn();
  try {
    const payload = await apiRequest("/v2/releases");
    releaseCatalogState.items = Array.isArray(payload.releases) ? payload.releases : [];
    releaseCatalogState.loadedAt = new Date().toISOString();
  } catch (error) {
    releaseCatalogState.error = error.message || "发布清单读取失败";
  } finally {
    releaseCatalogState.loading = false;
    if (currentModule === "downloads" && renderFn) renderFn();
  }
}

/**
 * 显示同步状态
 * @param {string} message - 状态消息
 */
export function showSyncStatus(message) {
  const status = document.querySelector("#syncStatus");
  if (status) status.textContent = message;
}
