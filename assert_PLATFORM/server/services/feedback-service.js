import { pool } from "../db/index.js";
import { sqlRun, sqlAll } from "../utils/db.js";
import { text } from "../utils/validators.js";
import { feedbackAttachments } from "../utils/db.js";
import { fmtDt } from "../utils/date.js";

async function submitFeedback(userId, body) {
  const type = text(body.type).trim() || "问题";
  const title = text(body.title).trim();
  const content = text(body.content).trim();
  const attachments = feedbackAttachments(body.attachments);
  if (!content) {
    throw new Error("请输入反馈内容。");
  }
  const result = await sqlRun(pool,
    "INSERT INTO feedback (user_id, type, title, content, attachments_json) VALUES (?, ?, ?, ?, ?)",
    [userId, type, title, content, JSON.stringify(attachments)]
  );
  return { id: result.insertId, ok: true, attachments };
}

async function getUserFeedback(userId) {
  const rows = await sqlAll(pool,
    "SELECT f.*, up.name AS user_name FROM feedback f LEFT JOIN user_profiles up ON up.user_id = f.user_id WHERE f.user_id = ? ORDER BY f.created_at DESC",
    [userId]
  );
  return {
    feedback: rows.map((row) => ({
      ...row,
      attachments: feedbackAttachments(row.attachments_json),
    })),
  };
}

async function getAllFeedback() {
  const rows = await sqlAll(pool, `
    SELECT f.*, COALESCE(up.name, '') AS user_name, COALESCE(u.account, '') AS user_account
    FROM feedback f
    LEFT JOIN user_profiles up ON up.user_id = f.user_id
    LEFT JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
  `);
  return { feedback: rows };
}

async function updateFeedbackStatus(id, body) {
  const status = text(body.status).trim();
  const adminReply = text(body.adminReply).trim();
  if (!["pending", "replied", "resolved"].includes(status)) {
    throw new Error("无效状态。");
  }
  await sqlRun(pool,
    "UPDATE feedback SET status = ?, admin_reply = ?, replied_at = ? WHERE id = ?",
    [status, adminReply, status !== "pending" ? fmtDt(new Date()) : null, id]
  );
  return { ok: true };
}

export { submitFeedback, getUserFeedback, getAllFeedback, updateFeedbackStatus };
