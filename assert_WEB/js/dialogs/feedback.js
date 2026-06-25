/**
 * 反馈对话框模块
 * 处理反馈提交、附件预览和列表加载
 */

import { apiRequest } from "../api/request.js";

let feedbackEditor = null;
let feedbackAttachmentFiles = [];

/**
 * 绑定反馈编辑器
 * @param {string|HTMLElement} container - 编辑器容器选择器或元素
 */
export function bindFeedbackComposer(container) {
  const el = typeof container === "string" ? document.querySelector(container) : container;
  if (!el) return;

  feedbackEditor = el;
  feedbackAttachmentFiles = [];

  const fileInput = el.querySelector('[name="attachments"]');
  if (fileInput) {
    fileInput.addEventListener("change", handleAttachmentSelect);
  }

  const removeBtn = el.querySelector(".remove-attachment");
  if (removeBtn) {
    removeBtn.addEventListener("click", handleRemoveAttachment);
  }
}

/**
 * 处理附件选择
 * @param {Event} event - 文件选择事件
 */
function handleAttachmentSelect(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  feedbackAttachmentFiles = [...feedbackAttachmentFiles, ...files];
  renderFeedbackAttachmentPreview();
}

/**
 * 处理移除附件
 * @param {Event} event - 点击事件
 */
function handleRemoveAttachment(event) {
  const index = parseInt(event.target.dataset.index, 10);
  if (isNaN(index)) return;
  feedbackAttachmentFiles.splice(index, 1);
  renderFeedbackAttachmentPreview();
}

/**
 * 渲染反馈附件预览
 */
export function renderFeedbackAttachmentPreview() {
  if (!feedbackEditor) return;

  const previewEl = feedbackEditor.querySelector(".attachment-preview");
  if (!previewEl) return;

  if (feedbackAttachmentFiles.length === 0) {
    previewEl.innerHTML = "";
    previewEl.style.display = "none";
    return;
  }

  previewEl.style.display = "block";
  previewEl.innerHTML = feedbackAttachmentFiles
    .map((file, index) => {
      const isImage = file.type.startsWith("image/");
      const preview = isImage ? `<img src="${URL.createObjectURL(file)}" alt="${file.name}" style="max-width:80px;max-height:80px;" />` : `<span>${getFileIcon(file.type)}</span>`;
      return `
        <div class="attachment-item" data-index="${index}">
          ${preview}
          <span class="attachment-name" title="${file.name}">${truncateFilename(file.name, 12)}</span>
          <button type="button" class="remove-attachment" data-index="${index}" title="移除">×</button>
        </div>
      `;
    })
    .join("");

  previewEl.querySelectorAll(".remove-attachment").forEach((btn) => {
    btn.addEventListener("click", handleRemoveAttachment);
  });
}

/**
 * 处理反馈提交
 * @param {Event} event - 表单提交事件
 * @returns {Promise<object|null>} 提交结果
 */
export async function handleFeedbackSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn.textContent;
  const content = form.querySelector('[name="content"]')?.value?.trim();
  const category = form.querySelector('[name="category"]')?.value?.trim();

  if (!content) {
    showDialogMessage(form, "请填写反馈内容", "error");
    return null;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "提交中...";
    const formData = new FormData();
    formData.append("content", content);
    if (category) formData.append("category", category);
    feedbackAttachmentFiles.forEach((file) => {
      formData.append("attachments", file);
    });

    const payload = await apiRequest("/feedback", {
      method: "POST",
      body: formData,
    });

    showDialogMessage(form, "反馈已提交，感谢您的建议", "success");
    feedbackAttachmentFiles = [];
    renderFeedbackAttachmentPreview();
    form.reset();

    if (typeof loadFeedbackList === "function") {
      loadFeedbackList();
    }

    return payload;
  } catch (error) {
    showDialogMessage(form, error.message || "提交失败", "error");
    return null;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * 加载反馈列表
 * @param {string} containerSelector - 列表容器选择器
 * @param {object} options - 加载选项
 * @returns {Promise<void>}
 */
export async function loadFeedbackList(containerSelector = "#feedbackList", options = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const params = new URLSearchParams();
    if (options.category) params.append("category", options.category);
    if (options.status) params.append("status", options.status);
    params.append("page", options.page || 1);
    params.append("limit", options.limit || 20);

    const payload = await apiRequest(`/feedback?${params.toString()}`);
    const items = payload.feedbacks || payload.items || [];

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无反馈记录</div>';
      return;
    }

    container.innerHTML = items.map(renderFeedbackItem).join("");
    bindFeedbackItemActions(container);
  } catch (error) {
    container.innerHTML = `<div class="error-state">加载失败: ${error.message}</div>`;
  }
}

/**
 * 渲染单条反馈项
 * @param {object} item - 反馈数据
 * @returns {string} HTML字符串
 */
function renderFeedbackItem(item) {
  const statusClass = item.status === "resolved" ? "resolved" : item.status === "processing" ? "processing" : "pending";
  const statusText = item.status === "resolved" ? "已处理" : item.status === "processing" ? "处理中" : "待处理";
  const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";

  return `
    <article class="feedback-item ${statusClass}" data-id="${item.id}">
      <header class="feedback-header">
        <span class="feedback-category">${escapeHtml(item.category || "建议")}</span>
        <span class="feedback-status">${statusText}</span>
      </header>
      <div class="feedback-content">${escapeHtml(item.content)}</div>
      ${item.attachments?.length > 0 ? `<div class="feedback-attachments">${item.attachments.map(renderAttachmentLink).join("")}</div>` : ""}
      <footer class="feedback-footer">
        <time>${createdAt}</time>
        ${item.reply ? `<div class="feedback-reply">官方回复: ${escapeHtml(item.reply)}</div>` : ""}
      </footer>
    </article>
  `;
}

/**
 * 渲染附件链接
 * @param {object} attachment - 附件数据
 * @returns {string} HTML字符串
 */
function renderAttachmentLink(attachment) {
  return `<a href="${attachment.url}" target="_blank" rel="noopener" class="attachment-link" title="${escapeHtml(attachment.name)}">${getFileIcon(attachment.type)} ${escapeHtml(attachment.name)}</a>`;
}

/**
 * 绑定反馈项操作事件
 * @param {HTMLElement} container - 容器元素
 */
function bindFeedbackItemActions(container) {
  container.querySelectorAll(".feedback-item").forEach((item) => {
    item.addEventListener("click", handleFeedbackItemClick);
  });
}

/**
 * 处理反馈项点击
 * @param {Event} event - 点击事件
 */
function handleFeedbackItemClick(event) {
  const item = event.target.closest(".feedback-item");
  if (!item) return;
  const id = item.dataset.id;
  if (typeof openFeedbackDetail === "function") {
    openFeedbackDetail(id);
  }
}

/**
 * 获取文件类型图标
 * @param {string} mimeType - MIME类型
 * @returns {string} 图标字符
 */
function getFileIcon(mimeType) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "📦";
  return "📎";
}

/**
 * 截断文件名
 * @param {string} name - 文件名
 * @param {number} maxLen - 最大长度
 * @returns {string} 截断后的文件名
 */
function truncateFilename(name, maxLen) {
  if (name.length <= maxLen) return name;
  const ext = name.lastIndexOf(".") > 0 ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  return base.slice(0, maxLen - ext.length - 2) + "…" + ext;
}

/**
 * HTML转义
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
