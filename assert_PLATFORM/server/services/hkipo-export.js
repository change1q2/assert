import XLSX from "xlsx";

function hkIpoSheetRows(rows) {
  return rows.map((row) => ({
    代码: row.code,
    公司名称: row.companyName,
    场景标签: Array.isArray(row.scenarioTags) ? row.scenarioTags.join(" / ") : "",
    状态: row.status,
    "1手股数": row.boardLot,
    "1手入场金额": row.entryAmount,
    总市值: row.totalMarketCap,
    H股市值: row.hMarketCap,
    入通涨幅: row.connectRise,
    一手预计收益: row.oneLotExpectedProfit,
    公开总手数: row.publicTotalHands,
    实际认购倍数: row.actualMultiple,
    保荐人: row.sponsor,
    基石占比: row.cornerstoneShare,
    绿鞋: row.greenshoe,
    发行调配权: row.allocationOption,
    申购时间: row.subscriptionTime,
    资金锁定期: row.resultDate,
    暗盘时间: row.greyDate,
    上市日期: row.listingDate,
    基本面: row.fundamentals,
    行业: row.industry,
    得分: row.score,
    申购态度: row.attitude,
    是否打: row.shouldApply,
    策略: row.strategy,
    建议甲组乙组: row.tailFunds,
    总结: row.summary,
    首日涨幅: row.firstDayChange,
    累计涨跌幅: row.cumulativeChange,
    最新价: row.latestVsOffer,
    发行价: row.offerPrice,
  }));
}

function hkIpoBigVSheetRows(rows) {
  return rows.map((row) => ({
    代码: row.code,
    公司名称: row.companyName,
    大V: row.bigV,
    大V名称: row.bigVName,
    意向占比: row.intention,
    理由: row.reason,
    评分: row.score,
    置信度: row.confidence,
    样本说明: row.note,
  }));
}

function exportHkIpoToExcel(payload) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hkIpoSheetRows(payload.rows)), "主表");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.recommendations), "推荐排序");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hkIpoBigVSheetRows(payload.bigVRows)), "大V意向");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.rules), "评分规则");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.scoreRows.map((row) => ({
    代码: row.code,
    公司名称: row.companyName,
    得分: row.score,
    申购态度: row.attitude,
    是否打: row.shouldApply,
    评分明细: row.components.map((item) => `${item.item}:${item.score}`).join("；"),
  }))), "评分明细");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.validationRows), "数据校验");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  const fileName = `港股打新分析_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { buffer, fileName };
}

export {
  hkIpoSheetRows,
  hkIpoBigVSheetRows,
  exportHkIpoToExcel,
};
