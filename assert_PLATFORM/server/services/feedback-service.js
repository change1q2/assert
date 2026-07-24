import { pool } from "../db/index.js";
import { sqlRun, sqlAll, sqlGet } from "../utils/db.js";
import { text } from "../utils/validators.js";
import { feedbackAttachments } from "../utils/db.js";
import { fmtDt } from "../utils/date.js";

const VALID_STATUSES = ["pending", "processing", "resolved", "delayed"];

async function submitFeedback(userId, body) {
  const type = text(body.type).trim() || "问题";
  const title = text(body.title).trim();
  const content = text(body.content).trim();
  const attachments = feedbackAttachments(body.attachments);
  if (!content) {
    throw new Error("请输入反馈内容。");
  }
  const result = await sqlRun(pool,
    "INSERT INTO feedback (user_id, type, title, content, attachments_json, admin_reply) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, type, title, content, JSON.stringify(attachments), ""]
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

async function getAllFeedback({ keyword = "", status = "", page = 1, pageSize = 10, sortBy = "title" } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.max(1, Math.min(50, parseInt(pageSize, 10) || 10));
  const offset = (safePage - 1) * safePageSize;

  let whereClause = "";
  let params = [];

  if (keyword) {
    whereClause += "WHERE (f.title LIKE ? OR f.content LIKE ? OR COALESCE(u.account, '') LIKE ? OR COALESCE(up.name, '') LIKE ?)";
    const likeKeyword = `%${keyword}%`;
    params = [likeKeyword, likeKeyword, likeKeyword, likeKeyword];
  }

  if (status && VALID_STATUSES.includes(status)) {
    whereClause += whereClause ? " AND f.status = ?" : "WHERE f.status = ?";
    params.push(status);
  }

  const countResult = await sqlGet(pool, `
    SELECT COUNT(*) AS total FROM feedback f
    LEFT JOIN user_profiles up ON up.user_id = f.user_id
    LEFT JOIN users u ON u.id = f.user_id
    ${whereClause}
  `, params);

  const orderBy = sortBy === "created_at" ? "f.created_at DESC" : "f.title ASC";

  const rows = await sqlAll(pool, `
    SELECT f.id, f.user_id, f.type, f.title, f.content, f.status, f.reviewed, f.admin_reply, f.created_at, f.replied_at,
      COALESCE(up.name, '') AS user_name, COALESCE(u.account, '') AS user_account
    FROM feedback f
    LEFT JOIN user_profiles up ON up.user_id = f.user_id
    LEFT JOIN users u ON u.id = f.user_id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ${safePageSize} OFFSET ${offset}
  `, params);

  return {
    feedback: rows.map(row => ({
      ...row,
      attachments: [],
    })),
    total: countResult.total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(countResult.total / safePageSize),
  };
}

async function getFeedbackById(id) {
  const row = await sqlGet(pool, `
    SELECT f.*, COALESCE(up.name, '') AS user_name, COALESCE(u.account, '') AS user_account
    FROM feedback f
    LEFT JOIN user_profiles up ON up.user_id = f.user_id
    LEFT JOIN users u ON u.id = f.user_id
    WHERE f.id = ?
  `, [id]);

  if (!row) return null;

  return {
    ...row,
    attachments: feedbackAttachments(row.attachments_json),
  };
}

async function updateFeedbackStatus(id, body) {
  const status = text(body.status).trim();
  const adminReply = text(body.adminReply || "").trim();
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("无效状态。");
  }
  await sqlRun(pool,
    "UPDATE feedback SET status = ?, admin_reply = ?, replied_at = ? WHERE id = ?",
    [status, adminReply, status !== "pending" ? fmtDt(new Date()) : null, id]
  );
  return { ok: true };
}

async function updateFeedbackReview(id, reviewed) {
  const value = reviewed ? 1 : 0;
  await sqlRun(pool, "UPDATE feedback SET reviewed = ? WHERE id = ?", [value, id]);
  return { ok: true };
}

export { submitFeedback, getUserFeedback, getAllFeedback, getFeedbackById, updateFeedbackStatus, updateFeedbackReview, VALID_STATUSES };
