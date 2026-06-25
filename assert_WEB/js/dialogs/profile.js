/**
 * 资料对话框模块
 * 处理用户资料和偏好设置的提交
 */

import { apiRequest } from "../api/request.js";

/**
 * 处理资料提交
 * @param {Event} event - 表单提交事件
 * @returns {Promise<object|null>} 提交结果
 */
export async function handleProfileSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn.textContent;

  const fields = ["name", "mobile", "email", "idNumber", "address"];
  const profile = {};
  fields.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input) {
      const value = input.value?.trim();
      if (value) profile[field] = value;
    }
  });

  if (Object.keys(profile).length === 0) {
    showDialogMessage(form, "请填写至少一项资料", "error");
    return null;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "保存中...";
    const payload = await apiRequest("/user/profile", {
      method: "PUT",
      body: profile,
    });

    if (typeof updateStateUser === "function") {
      updateStateUser(profile);
    }
    if (typeof saveProfileToAuth === "function") {
      saveProfileToAuth();
    }

    showDialogMessage(form, "资料已更新", "success");
    closeDialogIfSuccess(form);
    return payload;
  } catch (error) {
    showDialogMessage(form, error.message || "保存失败", "error");
    return null;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * 处理偏好设置提交
 * @param {Event} event - 表单提交事件
 * @returns {Promise<object|null>} 提交结果
 */
export async function handlePreferenceSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn.textContent;

  const preferences = {};

  const currencyEl = form.querySelector('[name="currency"]');
  if (currencyEl) preferences.currency = currencyEl.value;

  const languageEl = form.querySelector('[name="language"]');
  if (languageEl) preferences.language = languageEl.value;

  const themeEl = form.querySelector('[name="theme"]');
  if (themeEl) preferences.theme = themeEl.value;

  const notificationsEl = form.querySelector('[name="notifications"]');
  if (notificationsEl) preferences.notifications = notificationsEl.checked;

  const reminderEl = form.querySelector('[name="reminder"]');
  if (reminderEl) preferences.reminder = reminderEl.value;

  const reminderTimeEl = form.querySelector('[name="reminderTime"]');
  if (reminderTimeEl) preferences.reminderTime = reminderTimeEl.value;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "保存中...";
    const payload = await apiRequest("/user/preferences", {
      method: "PUT",
      body: preferences,
    });

    if (preferences.currency && typeof updateFiltersCurrency === "function") {
      updateFiltersCurrency(preferences.currency);
    }
    if (preferences.theme && typeof applyTheme === "function") {
      applyTheme(preferences.theme);
    }

    if (typeof saveState === "function") {
      saveState();
    }

    showDialogMessage(form, "偏好设置已保存", "success");
    closeDialogIfSuccess(form);
    return payload;
  } catch (error) {
    showDialogMessage(form, error.message || "保存失败", "error");
    return null;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * 更新状态中的用户信息
 * @param {object} profile - 用户资料
 */
function updateStateUser(profile) {
  if (typeof state !== "undefined" && state.user) {
    Object.assign(state.user, profile);
  }
}

/**
 * 更新过滤器的货币设置
 * @param {string} currency - 货币代码
 */
function updateFiltersCurrency(currency) {
  if (typeof filters !== "undefined") {
    filters.currency = currency;
  }
}

/**
 * 应用主题
 * @param {string} theme - 主题名称
 */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("preferred-theme", theme);
}

/**
 * 成功后关闭对话框
 * @param {HTMLElement} form - 表单元素
 */
function closeDialogIfSuccess(form) {
  setTimeout(() => {
    const dialog = form.closest(".dialog-overlay") || form.closest("[role='dialog']");
    if (dialog) {
      dialog.style.display = "none";
    }
  }, 1500);
}

/**
 * 显示对话框消息
 * @param {HTMLElement} form - 表单元素
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 */
function showDialogMessage(form, message, type) {
  const el = form.querySelector(`.dialog-${type}`) || createMessageEl(form, type);
  el.textContent = message;
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
  }, 3000);
}

/**
 * 创建消息元素
 * @param {HTMLElement} form - 表单元素
 * @param {string} type - 消息类型
 * @returns {HTMLElement} 消息元素
 */
function createMessageEl(form, type) {
  const el = document.createElement("div");
  el.className = `dialog-${type}`;
  el.style.cssText = "padding:8px 12px;border-radius:4px;margin-bottom:8px;display:none;";
  el.style.backgroundColor = type === "error" ? "#fee" : "#efe";
  el.style.color = type === "error" ? "#c33" : "#3c3";
  form.insertBefore(el, form.firstChild);
  return el;
}
