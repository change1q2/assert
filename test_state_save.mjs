import { pool } from "./assert_PLATFORM/server/db/index.js";
import { saveUserState, loadUserState } from "./assert_PLATFORM/server/services/state-service.js";

async function test() {
  const userId = 1;

  // Test loading state
  console.log("Testing loadUserState...");
  try {
    const state = await loadUserState(userId);
    console.log("loadUserState succeeded");
    console.log("Keys:", Object.keys(state));
    console.log("Finance assets count:", state.financeAssets?.length || 0);
    console.log("Records count:", state.records?.length || 0);
  } catch (e) {
    console.error("loadUserState failed:", e.message);
  }

  // Test saving state (empty state)
  console.log("\nTesting saveUserState with empty state...");
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await saveUserState(conn, userId, {
        user: { account: "admin", currency: "CNY", theme: "light", riskLevel: "稳健型", privacyLock: "已开启", dataMask: "已开启" },
        rates: {},
        accounts: [],
        assetClasses: [],
        records: [],
        budgets: [],
        financeAssets: [],
        customCategories: { records: { income: [], expense: [], transfer: [] }, finance: { tertiaryByScope: {} } },
        recordTags: {},
        books: [],
        tags: [],
        recordTagList: [],
        recorders: [],
        reminders: [],
        debts: [],
        debtCategories: [],
        strategies: [],
        financeAssetDraft: {},
        feeConfig: {},
        overviewGoals: {},
        independentAssets: {},
        yearlyRecords: [],
        accountCategories: {},
      });
      await conn.commit();
      console.log("saveUserState with empty state succeeded");
    } catch (e) {
      await conn.rollback();
      console.error("saveUserState with empty state failed:", e.message);
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("Connection error:", e.message);
  }

  // Test saving state with finance assets
  console.log("\nTesting saveUserState with finance assets...");
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await saveUserState(conn, userId, {
        user: { account: "admin", currency: "CNY", theme: "light", riskLevel: "稳健型", privacyLock: "已开启", dataMask: "已开启" },
        rates: {},
        accounts: [{ id: "1", name: "Test Account", owner: "self", currency: "CNY", type: "bank", balance: 10000, liability: 0, enabled: true, default: true, category: "", subCategory: "" }],
        assetClasses: [],
        records: [],
        budgets: [],
        financeAssets: [{
          id: "fa_test_001",
          kind: "股票",
          assetKind: "",
          accountId: "1",
          category: "权益类",
          subcategory: "A股",
          tertiaryCategory: "场内",
          market: "国内市场",
          currency: "CNY",
          name: "测试股票",
          code: "000001",
          positionGroup: "",
          positionCategory: "",
          costPrice: 10,
          shares: 100,
          availableShares: 100,
          currentPrice: 10,
          pnl: 0,
          pnlPercent: 0,
          avgBuyPrice: 0,
          holdingDays: 0,
          positionWeight: 0,
          totalFees: 0,
          todayPnl: 0,
          todayPnlPercent: 0,
          prevPrice: 0,
          priceDate: "",
          tags: "",
          status: "active",
          archiveDate: "",
          transactions: [{
            id: "tx_001",
            direction: "建仓",
            transaction_date: "2026-07-28 10:37",
            date: "2026-07-28",
            time: "10:37",
            shares: 100,
            quantity: 100,
            price: 10,
            amount: 1000,
            commission: 0,
          }],
        }],
        customCategories: { records: { income: [], expense: [], transfer: [] }, finance: { tertiaryByScope: {} } },
        recordTags: {},
        books: [],
        tags: [],
        recordTagList: [],
        recorders: [],
        reminders: [],
        debts: [],
        debtCategories: [],
        strategies: [],
        financeAssetDraft: {},
        feeConfig: {},
        overviewGoals: {},
        independentAssets: {},
        yearlyRecords: [],
        accountCategories: {},
      });
      await conn.commit();
      console.log("saveUserState with finance assets succeeded");
    } catch (e) {
      await conn.rollback();
      console.error("saveUserState with finance assets failed:", e.message);
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("Connection error:", e.message);
  }

  // Test saving state with records
  console.log("\nTesting saveUserState with records...");
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await saveUserState(conn, userId, {
        user: { account: "admin", currency: "CNY", theme: "light", riskLevel: "稳健型", privacyLock: "已开启", dataMask: "已开启" },
        rates: {},
        accounts: [{ id: "1", name: "Test Account", owner: "self", currency: "CNY", type: "bank", balance: 10000, liability: 0, enabled: true, default: true, category: "", subCategory: "" }],
        assetClasses: [],
        records: [{
          id: "rec_001",
          type: "expense",
          category: "餐饮",
          sub: "午餐",
          tag: "",
          bookId: "",
          amount: 50,
          currency: "CNY",
          accountId: "1",
          date: "2026-07-28",
          recorder: "admin",
          note: "测试备注",
          createdAt: "2026-07-28 10:37",
        }],
        budgets: [],
        financeAssets: [],
        customCategories: { records: { income: [], expense: [], transfer: [] }, finance: { tertiaryByScope: {} } },
        recordTags: {},
        books: [],
        tags: [],
        recordTagList: [],
        recorders: [],
        reminders: [],
        debts: [],
        debtCategories: [],
        strategies: [],
        financeAssetDraft: {},
        feeConfig: {},
        overviewGoals: {},
        independentAssets: {},
        yearlyRecords: [],
        accountCategories: {},
      });
      await conn.commit();
      console.log("saveUserState with records succeeded");
    } catch (e) {
      await conn.rollback();
      console.error("saveUserState with records failed:", e.message);
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("Connection error:", e.message);
  }

  process.exit(0);
}

test().catch(e => console.error(e));
