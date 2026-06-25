import { json, readBody } from "../utils/http.js";
import { submitFeedback, getUserFeedback } from "../services/feedback-service.js";

async function handler(req, res, body, origin, pathname, url) {
  const user = res.locals?.user;
  if (!user) return;

  if (req.method === "POST" && pathname === "/api/feedback") {
    try {
      const result = await submitFeedback(user.id, body);
      json(res, 201, result, origin);
    } catch (err) {
      json(res, 400, { message: err.message }, origin);
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/feedback") {
    const result = await getUserFeedback(user.id);
    json(res, 200, result, origin);
    return;
  }
}

export { handler };
