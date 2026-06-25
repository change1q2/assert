/**
 * 认证对话框模块
 * 处理登录、注册、验证码等认证相关操作
 */

import { apiRequest } from "../api/request.js";

/**
 * 处理认证提交
 * @param {Event} event - 表单提交事件
 * @returns {Promise<object|null>} 认证结果
 */
export async function handleAuthSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn.textContent;
  const account = form.querySelector('[name="account"]')?.value?.trim();
  const password = form.querySelector('[name="password"]')?.value;

  if (!account || !password) {
    showDialogError(form, "请填写账号和密码");
    return null;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "登录中...";
    const payload = await apiRequest("/auth/login", {
      method: "POST",
      body: { account, password },
    });
    completeAuthentication(payload);
    closeDialog(form);
    return payload;
  } catch (error) {
    showDialogError(form, error.message || "登录失败");
    return null;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * 处理发送验证码
 * @param {Event} event - 点击事件
 * @returns {Promise<boolean>} 是否发送成功
 */
export async function handleSendAuthCode(event) {
  const button = event.target;
  const form = button.closest("form");
  const mobile = form?.querySelector('[name="mobile"]')?.value?.trim();

  if (!mobile) {
    showDialogError(form, "请输入手机号");
    return false;
  }

  if (!/^1\d{10}$/.test(mobile)) {
    showDialogError(form, "手机号格式不正确");
    return false;
  }

  try {
    button.disabled = true;
    button.textContent = "发送中...";
    await apiRequest("/auth/code", {
      method: "POST",
      body: { mobile },
    });
    startCountdown(button, 60);
    showDialogSuccess(form, "验证码已发送");
    return true;
  } catch (error) {
    showDialogError(form, error.message || "发送失败");
    return false;
  } finally {
    if (!button.textContent.includes("秒")) {
      button.disabled = false;
      button.textContent = "发送验证码";
    }
  }
}

/**
 * 完成认证流程
 * @param {object} payload - 认证响应数据
 */
export function completeAuthentication(payload) {
  if (!payload?.token || !payload?.user) return;
  auth.token = payload.token;
  auth.currentUser = payload.user.account;
  const existing = auth.users.find((u) => u.account === payload.user.account);
  if (existing) {
    existing.profile = payload.user;
  } else {
    auth.users.push({ account: payload.user.account, profile: payload.user });
  }
  if (typeof saveAuth === "function") saveAuth();
  if (typeof syncUserFromAuth === "function") syncUserFromAuth();
}

/**
 * 验证码倒计时
 * @param {HTMLElement} button - 倒计时按钮
 * @param {number} seconds - 倒计时秒数
 */
function startCountdown(button, seconds) {
  let remaining = seconds;
  const timer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(timer);
      button.disabled = false;
      button.textContent = "发送验证码";
    } else {
      button.textContent = `${remaining}秒后重试`;
    }
  }, 1000);
}

/**
 * 显示对话框错误信息
 * @param {HTMLElement} form - 表单元素
 * @param {string} message - 错误信息
 */
function showDialogError(form, message) {
  const errorEl = form.querySelector(".dialog-error") || createDialogMessage(form, "error");
  errorEl.textContent = message;
  errorEl.style.display = "block";
  setTimeout(() => {
    errorEl.style.display = "none";
  }, 3000);
}

/**
 * 显示对话框成功信息
 * @param {HTMLElement} form - 表单元素
 * @param {string} message - 成功信息
 */
function showDialogSuccess(form, message) {
  const successEl = form.querySelector(".dialog-success") || createDialogMessage(form, "success");
  successEl.textContent = message;
  successEl.style.display = "block";
  setTimeout(() => {
    successEl.style.display = "none";
  }, 3000);
}

/**
 * 创建对话框消息元素
 * @param {HTMLElement} form - 表单元素
 * @param {string} type - 消息类型 (error/success)
 * @returns {HTMLElement} 消息元素
 */
function createDialogMessage(form, type) {
  const el = document.createElement("div");
  el.className = `dialog-${type}`;
  el.style.cssText = "padding:8px 12px;border-radius:4px;margin-bottom:8px;display:none;";
  el.style.backgroundColor = type === "error" ? "#fee" : "#efe";
  el.style.color = type === "error" ? "#c33" : "#3c3";
  form.insertBefore(el, form.firstChild);
  return el;
}

/**
 * 关闭对话框
 * @param {HTMLElement} form - 表单元素
 */
function closeDialog(form) {
  const dialog = form.closest(".dialog-overlay") || form.closest("[role='dialog']");
  if (dialog) {
    dialog.style.display = "none";
  }
}
