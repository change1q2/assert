/**
 * 债务对话框模块
 * 处理债务记录的打开和提交
 */

import { apiRequest } from "../api/request.js";

let currentDebt = null;

/**
 * 打开债务对话框
 * @param {object} debt - 债务数据，null表示新增
 * @returns {Promise<void>}
 */
export async function openDebtDialog(debt = null) {
  currentDebt = debt;
  const dialog = document.querySelector("#debtDialog") || createDebtDialog();
  dialog.style.display = "flex";

  const form = dialog.querySelector("form");
  if (form) {
    form.reset();
    clearFormErrors(form);
  }

  if (debt) {
    populateDebtForm(form, debt);
  } else {
    setDefaultDebtValues(form);
  }

  if (typeof bindDebtFormEvents === "function") {
    bindDebtFormEvents(form);
  }
}

/**
 * 填充债务表单
 * @param {HTMLElement} form - 表单元素
 * @param {object} debt - 债务数据
 */
function populateDebtForm(form, debt) {
  if (!form || !debt) return;

  const mapping = {
    "[name='debtId']": debt.id,
    "[name='debtorName']": debt.debtorName || debt.name,
    "[name='amount']": debt.amount,
    "[name='currency']": debt.currency,
    "[name='type']": debt.type,
    "[name='interestRate']": debt.interestRate,
    "[name='startDate']": debt.startDate,
    "[name='dueDate']": debt.dueDate,
    "[name='status']": debt.status,
    "[name='remark']": debt.remark,
  };

  Object.entries(mapping).forEach(([selector, value]) => {
    const input = form.querySelector(selector);
    if (input && value !== undefined && value !== null) {
      input.value = value;
    }
  });

  const titleEl = form.querySelector(".dialog-title");
  if (titleEl) titleEl.textContent = "编辑债务";
}

/**
 * 设置默认债务值
 * @param {HTMLElement} form - 表单元素
 */
function setDefaultDebtValues(form) {
  if (!form) return;

  const currencyInput = form.querySelector("[name='currency']");
  if (currencyInput) currencyInput.value = filters?.currency || "CNY";

  const dateInput = form.querySelector("[name='startDate']");
  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

  const titleEl = form.querySelector(".dialog-title");
  if (titleEl) titleEl.textContent = "新增债务";
}

/**
 * 处理债务提交
 * @param {Event} event - 表单提交事件
 * @returns {Promise<object|null>} 提交结果
 */
export async function handleDebtSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn.textContent;

  const debtData = {
    debtorName: form.querySelector("[name='debtorName']")?.value?.trim(),
    amount: parseFloat(form.querySelector("[name='amount']")?.value),
    currency: form.querySelector("[name='currency']")?.value,
    type: form.querySelector("[name='type']")?.value,
    interestRate: parseFloat(form.querySelector("[name='interestRate']")?.value) || 0,
    startDate: form.querySelector("[name='startDate']")?.value,
    dueDate: form.querySelector("[name='dueDate']")?.value,
    status: form.querySelector("[name='status']")?.value,
    remark: form.querySelector("[name='remark']")?.value?.trim(),
  };

  if (!debtData.debtorName) {
    showFieldError(form, "debtorName", "请输入债务人名称");
    return null;
  }
  if (isNaN(debtData.amount) || debtData.amount <= 0) {
    showFieldError(form, "amount", "请输入有效金额");
    return null;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "保存中...";
    clearFormErrors(form);

    const method = currentDebt?.id ? "PUT" : "POST";
    const path = currentDebt?.id ? `/debts/${currentDebt.id}` : "/debts";
    const payload = await apiRequest(path, {
      method,
      body: debtData,
    });

    if (typeof refreshDebtsList === "function") {
      refreshDebtsList();
    }

    showDialogMessage(form, "债务已保存", "success");
    closeDebtDialog();

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
 * 关闭债务对话框
 */
export function closeDebtDialog() {
  const dialog = document.querySelector("#debtDialog");
  if (dialog) {
    dialog.style.display = "none";
  }
  currentDebt = null;
}

/**
 * 创建债务对话框DOM
 * @returns {HTMLElement} 对话框元素
 */
function createDebtDialog() {
  const dialog = document.createElement("div");
  dialog.id = "debtDialog";
  dialog.className = "dialog-overlay";
  dialog.style.cssText = "display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;z-index:1000;";
  dialog.innerHTML = `
    <div class="dialog-content" style="background:#fff;border-radius:8px;padding:24px;min-width:400px;max-width:90%;">
      <h2 class="dialog-title" style="margin:0 0 16px;">新增债务</h2>
      <form>
        <div class="dialog-error" style="display:none;padding:8px 12px;background:#fee;color:#c33;border-radius:4px;margin-bottom:12px;"></div>
        <div class="dialog-fields" style="display:grid;gap:12px;">
          <div class="field">
            <label style="display:block;margin-bottom:4px;font-weight:500;">债务人名称 *</label>
            <input type="text" name="debtorName" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">金额 *</label>
              <input type="number" name="amount" step="0.01" min="0" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
            </div>
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">货币</label>
              <select name="currency" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;">
                <option value="CNY">人民币 (CNY)</option>
                <option value="USD">美元 (USD)</option>
                <option value="HKD">港币 (HKD)</option>
                <option value="JPY">日元 (JPY)</option>
              </select>
            </div>
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">类型</label>
              <select name="type" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;">
                <option value="receivable">应收</option>
                <option value="payable">应付</option>
              </select>
            </div>
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">年利率 (%)</label>
              <input type="number" name="interestRate" step="0.01" min="0" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
            </div>
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">开始日期</label>
              <input type="date" name="startDate" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
            </div>
            <div class="field">
              <label style="display:block;margin-bottom:4px;font-weight:500;">到期日期</label>
              <input type="date" name="dueDate" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;" />
            </div>
          </div>
          <div class="field">
            <label style="display:block;margin-bottom:4px;font-weight:500;">状态</label>
            <select name="status" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;">
              <option value="pending">待还</option>
              <option value="partial">部分还款</option>
              <option value="cleared">已还清</option>
              <option value="overdue">已逾期</option>
            </select>
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

  dialog.querySelector("[data-action='cancel']")?.addEventListener("click", closeDebtDialog);
  dialog.querySelector("form")?.addEventListener("submit", handleDebtSubmit);

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
