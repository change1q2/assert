import { json } from "../utils/http.js";

async function handler(req, res, body, origin, pathname, url) {
  json(res, 200, { ok: true, database: "mysql" }, origin);
}

export { handler };
