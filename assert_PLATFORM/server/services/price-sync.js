import { getQuotes } from "./finance-service.js";

const DEFAULT_INTERVAL_MS = 60 * 1000;
const QUOTE_BATCH_SIZE = 15;
const MIN_DELAY_BETWEEN_BATCHES_MS = 100;

let syncTimer = null;
let isSyncing = false;
let syncCount = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function logInfo(msg) {
  const ts = new Date().toISOString();
  console.log(`[price-sync ${ts}] ${msg}`);
}

function logErr(msg, err) {
  const ts = new Date().toISOString();
  const suffix = err ? ` (${err.message || String(err)})` : "";
  console.error(`[price-sync ${ts}] ERR: ${msg}${suffix}`);
}

async function loadActiveAssets(pool) {
  const [rows] = await pool.query(
    `SELECT user_id, id, code, market, current_price, prev_price
     FROM finance_assets
     WHERE (status = 'active' OR status = '' OR status IS NULL)
       AND code IS NOT NULL AND TRIM(code) <> ''`
  );
  return rows;
}

function buildQuoteRequests(assets) {
  const dedup = new Map();
  for (const a of assets) {
    const code = String(a.code || "").trim();
    if (!code) continue;
    // 以 (code, market) 作为去重 key; 若 market 为空则统一视为"国内市场"
    const market = String(a.market || "国内市场").trim() || "国内市场";
    const key = `${code}|||${market}`;
    if (!dedup.has(key)) dedup.set(key, { code, market });
  }
  return [...dedup.values()];
}

async function fetchAllQuotes(quoteRequests) {
  const byKey = new Map();
  if (!quoteRequests.length) return byKey;

  const batches = chunk(quoteRequests, QUOTE_BATCH_SIZE);
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    try {
      const result = await getQuotes(batch);
      const quotes = result?.quotes || [];
      for (let i = 0; i < quotes.length; i++) {
        const req = batch[i];
        const key = `${req.code}|||${req.market}`;
        byKey.set(key, quotes[i]);
      }
    } catch (err) {
      logErr(`batch ${bi + 1}/${batches.length} fetch failed`, err);
    }
    if (bi < batches.length - 1) await sleep(MIN_DELAY_BETWEEN_BATCHES_MS);
  }
  return byKey;
}

async function applyPriceUpdates(pool, assets, quotesByKey) {
  const today = new Date().toISOString().slice(0, 10);
  let updated = 0;
  let skippedNull = 0;
  let errors = 0;

  for (const asset of assets) {
    const code = String(asset.code || "").trim();
    const market = String(asset.market || "国内市场").trim() || "国内市场";
    const key = `${code}|||${market}`;
    const q = quotesByKey.get(key);
    if (!q) { skippedNull++; continue; }

    const price = toNumber(q.price);
    const prevClose = toNumber(q.prevClose);
    if (price == null || price === 0) { skippedNull++; continue; }

    const navDate = q.navDate || today;

    try {
      // 拆分为单独 SQL: 核心价格字段单独写入, 避免任何字段异常导致整条 UPDATE 失败
      const [{ affectedRows }] = await pool.query(
        `UPDATE finance_assets
         SET current_price = ?,
             prev_price   = COALESCE(?, prev_price),
             price_date   = ?
         WHERE user_id = ? AND id = ?
           AND (ABS(current_price - ?) > 1e-9 OR prev_price IS NULL OR price_date IS NULL OR price_date <> ?)`,
        [
          price,
          (prevClose != null && prevClose !== 0) ? prevClose : null,
          navDate,
          asset.user_id,
          String(asset.id),
          price,
          navDate,
        ]
      );
      if (affectedRows > 0) updated++;
    } catch (err) {
      errors++;
      logErr(
        `UPDATE price failed user=${asset.user_id} id=${asset.id} code=${code} price=${price} prevClose=${prevClose}`,
        err
      );
    }
  }

  return { updated, skippedNull, errors };
}

async function runSyncOnce(pool) {
  if (isSyncing) {
    logInfo("skip: previous sync still running");
    return;
  }
  isSyncing = true;
  const t0 = Date.now();
  syncCount++;
  try {
    logInfo(`sync #${syncCount} start`);
    const assets = await loadActiveAssets(pool);
    logInfo(`loaded ${assets.length} active assets`);
    if (!assets.length) {
      logInfo("no active assets, done");
      return;
    }

    const quoteRequests = buildQuoteRequests(assets);
    logInfo(`fetching ${quoteRequests.length} distinct (code,market) in ${Math.ceil(quoteRequests.length / QUOTE_BATCH_SIZE)} batches`);
    const quotesByKey = await fetchAllQuotes(quoteRequests);

    const stats = await applyPriceUpdates(pool, assets, quotesByKey);
    const elapsed = (Date.now() - t0) / 1000;
    logInfo(
      `sync #${syncCount} done: updated=${stats.updated} skipped=${stats.skippedNull} errors=${stats.errors} elapsed=${elapsed.toFixed(2)}s`
    );
  } catch (err) {
    logErr("sync top-level error", err);
  } finally {
    isSyncing = false;
  }
}

function startPriceSync(pool, options = {}) {
  if (syncTimer) {
    logInfo("already started");
    return { stop: stopPriceSync, runOnce: () => runSyncOnce(pool) };
  }
  const intervalMs = Number(options.intervalMs) > 0 ? Number(options.intervalMs) : DEFAULT_INTERVAL_MS;
  const runOnStart = options.runOnStart !== false;

  logInfo(`starting: interval=${intervalMs}ms runOnStart=${runOnStart}`);

  if (runOnStart) {
    setTimeout(() => runSyncOnce(pool).catch((e) => logErr("initial sync error", e)), 2000);
  }
  syncTimer = setInterval(() => {
    runSyncOnce(pool).catch((e) => logErr("scheduled sync error", e));
  }, intervalMs);

  return {
    stop: stopPriceSync,
    runOnce: () => runSyncOnce(pool),
    isSyncing: () => isSyncing,
    syncCount: () => syncCount,
  };
}

function stopPriceSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    logInfo("stopped");
  }
}

export { startPriceSync, stopPriceSync, runSyncOnce };
