/**
 * 账户对话框模块
 * 处理账户的打开和提交
 */

import { apiRequest } from "../api/request.js";

let currentAccount = null;

/**
 * 打开账户对话框
 * @param {object} account - 账户数据，null表示新增
 * @returns {Promise<void>}
 */
export async function openAccountDialog(account = null) {
  currentAccount = account;
  const dialog = document.querySelector("#accountDialog") || createAccountDialog();
  dialog.style.display = "flex";

  const form = dialog.querySelector("form");
  if (form) {
    form.reset();
    clearFormErrors(form);
  }

  if (account) {
    populateAccountForm(form, account);
  } else {
    setDefaultAccountValues(form);
  }

  if (typeof bindAccountFormEvents === "function") {
    bindAccountFormEvents(form);
  }
}

/**
 * 填充账户表单
 * @param {HTMLElement} form - 表单元素
 * @param {object} account - 账户数据
 */
function populateAccountForm(form, account) {
  if (!form || !account) return;

  const mapping = {
    "[name='accountId']": account.id,
    "[name='accountName']": account.name,
    "[name='accountType']": account.type,
    "[name='currency']": account.currency,
    "[name='balance']": account.balance,
    "[name='creditLimit']": account.creditLimit,
    "[name='includeInTotal']": account.includeInTotal,
    "[name='sortOrder']": account.sortOrder,
    "[name='remark']": account.remark,
  };

  Object.entries(mapping).forEach(([selector, value]) => {
    const input = form.querySelector(selector);
    if (input && value !== undefined && value !== null) {
      if (input.type === "checkbox") {
        input.checked = Boolean(value);
      } else {
        input.value = value;
      }
    }
  });

  const titleEl = form.querySelector(".dialog-title");
  if (titleEl) titleEl.textContent = "编辑账户";
}

/**
 * 设置默认账户值
 * @param {HTMLElement} form - 表单元素
 */
function setDefaultAccountValues(form) {
  if (!form) return;

  const currencyInput = form.querySelector("[name='currency']");
  if (currencyInput) currencyInput.value = filters?.currency || "CNY";

  const includeInput = form.querySelector("[name='includeInTotal']");
  if (includeInput) includeInput.checked = true;

  const titleEl = form.querySelector(".dialog-title");
  if (titleEl) titleEl.textContent = "新增账户";
}

/**
 * 处理账户提交
 * @param {Event} event - 表单提交事件
 * @returns {Promise<object|null>} 提交结果
 */
export async function handleAccountSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn.textContent;

  const accountData = {
    name: form.querySelector("[name='accountName']")?.value?.trim(),
    type: form.querySelector("[name='accountType']")?.value,
    currency: form.querySelector("[name='currency']")?.value,
    balance: parseFloat(form.querySelector("[name='balance']")?.value) || 0,
    creditLimit: parseFloat(form.querySelector("[name='creditLimit']")?.value) || 0,
    includeInTotal: form.querySelector("[name='includeInTotal']")?.checked ?? true,
    sortOrder: parseInt(form.querySelector("[name='sortOrder']")?.value, 10) || 0,
    remark: form.querySelector("[name='remark']")?.value?.trim(),
  };

  if (!accountData.name) {
    showFieldError(form, "accountName", "请输入账户名称");
    return null;
  }

  if (!accountData.type) {
    showFieldError(form, "accountType", "请选择账户类型");
    return null;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "保存中...";
    clearFormErrors(form);

    const method = currentAccount?.id ? "PUT" : "POST";
    const path = currentAccount?.id ? `/accounts/${currentAccount.id}` : "/accounts";
    const payload = await apiRequest(path, {
      method,
      body: accountData,
    });

    if (typeof refreshAccountsList === "function") {
      refreshAccountsList();
    }

    showDialogMessage(form, "账户已保存", "success");
    closeAccountDialog();

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
 * 关闭账户对话框
 */
export function closeAccountDialog() {
  const dialog = document.querySelector("#accountDialog");
  if (dialog) {
    dialog.style.display = "none";
  }
  currentAccount = null;
}

/**
 * 创建账户对话框DOM
 * @returns {HTMLElement} 对话框元素
 */
function createAccountDialog() {
  const dialog = document.createElement("div");
  dialog.id = "accountDialog";
  dialog.className = "dialog-overlay";
  dialog.style.cssText = "display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;z-index:1000;";
  dialog.innerHTML = `
    <div class="dialog-content" style="background:#fff;border-radius:8px;padding:24px;min-width:400px;max-width:90%;">
      <h2 class="dialog-title" style="margin:0 0 16px;">新增账户</h2>
      <form>
        <div class="dialog-error" style="display:none;padding:8px 12px;background:#fee;color:#c33;border-radius:4px;margin-bottom:12px;"></div>
        <div class="dialog-fields" style="display:grid;gap:12px;">
          <div class="field">
            <label style="display:block;margin-bottom:4px;font-weight:500;">账户名称 *</label>
            <input type="text" name="accountName" required placeholder="例如：招商银行信用卡" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">账户类型 *</label>
              <select name="accountType" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;">
                <option value="">请选择</option>
                <option value="cash">现金</option>
                <option value="bank">银行卡</option>
                <option value="credit">信用卡</option>
                <option value="investment">投资账户</option>
                <option value="e-wallet">电子钱包</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">货币</label>
              <select name="currency" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;">
                <option value="CNY">人民币 (CNY)</option>
                <option value="USD">美元 (USD)</option>
                <option value="HKD">港币 (HKD)</option>
                <option value="JPY">日元 (JPY)</option>
                <option value="EUR">欧元 (EUR)</option>
                <option value="GBP">英镑 (GBP)</option>
              </select>
            </div>
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">当前余额</label>
              <input type="number" name="balance" step="0.01" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
            </div>
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">信用额度</label>
              <input type="number" name="creditLimit" step="0.01" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
            </div>
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">排序</label>
              <input type="number" name="sortOrder" min="0" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
            </div>
            <div class="field">
              <label style="display:flex;align-items:center;gap:8px;margin-top:24px;cursor:pointer;">
                <input type="checkbox" name="includeInTotal" checked style="width:16px;height:16px;" />
                <span>计入总资产</span>
              </label>
            </div>
          </div>
          <div class="field">
            <label style="display:block;margin-bottom:4px;font-weight:500;">备注</label>
            <textarea name="remark" rows="3" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;resize:vertical;"></textarea>
          </div>
        </div>
        <div class="dialog-actions" style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
          <button type="button" data-action="cancel" style="padding:8px 16px;border:1px solid #ddd;background:#fff;border-radius:4px;cursor:pointer;">取消</button>
          <button type="submit" style="padding:8px 16px;border:none;background:#007bff;color:#fff;border-radius:4px;cursor:pointer;">保存</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector("[data-action='cancel']")?.addEventListener("click", closeAccountDialog);
  dialog.querySelector("form")?.addEventListener("submit", handleAccountSubmit);

  return dialog;
}

/**
 * 显示字段错误
 * @param {HTMLElement} form - 表单元素
 * @param {string} fieldName - 字段名称
 * @param {string} message - 错误信息
 */
function showFieldError(form, fieldName, message) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  if (!field) return;

  const errorEl = field.nextElementSibling?.classList.contains("field-error")
    ? field.nextElementSibling
    : createFieldError(field);
  errorEl.textContent = message;
  errorEl.style.display = "block";
  field.style.borderColor = "#c33";

  field.addEventListener("input", () => {
    errorEl.style.display = "none";
    field.style.borderColor = "";
  }, { once: true });
}

/**
 * 创建字段错误元素
 * @param {HTMLElement} field - 字段元素
 * @returns {HTMLElement} 错误元素
 */
function createFieldError(field) {
  const errorEl = document.createElement("span");
  errorEl.className = "field-error";
  errorEl.style.cssText = "display:none;color:#c33;font-size:12px;margin-top:4px;";
  field.parentNode.insertBefore(errorEl, field.nextSibling);
  return errorEl;
}

/**
 * 清除表单错误
 * @param {HTMLElement} form - 表单元素
 */
function clearFormErrors(form) {
  form.querySelectorAll(".field-error").forEach((el) => {
    el.style.display = "none";
  });
  form.querySelectorAll("[style*='border-color']").forEach((el) => {
    el.style.borderColor = "";
  });
}

/**
 * 显示对话框消息
 * @param {HTMLElement} form - 表单元素
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 */
function showDialogMessage(form, message, type) {
  const el = form.querySelector(`.dialog-${type}`);
  if (el) {
    el.textContent = message;
    el.style.display = "block";
    setTimeout(() => {
      el.style.display = "none";
    }, 3000);
  }
}
