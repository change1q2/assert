import { getStrategySummary, getStrategySection, getAllStrategyContent } from '../_lib/strategy.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET /api/vi-api/strategy -> summary
  // GET /api/vi-api/strategy?id=xxx -> section by id
  // GET /api/vi-api/strategy?id=full -> full content
  const id = req.query?.id;

  if (!id) {
    return res.status(200).json(getStrategySummary());
  }

  if (id === 'full') {
    const summary = getStrategySummary();
    return res.status(200).json({
      title: summary.title,
      subtitle: summary.subtitle,
      content: getAllStrategyContent(),
    });
  }

  const section = getStrategySection(id);
  if (!section) {
    return res.status(404).json({ error: `未找到章节 ${id}` });
  }
  return res.status(200).json(section);
}
