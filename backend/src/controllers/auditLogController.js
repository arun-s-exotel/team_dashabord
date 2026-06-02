const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

const listAuditLogs = async (req, res) => {
  try {
    const { action, actorEmail, entityType, startDate, endDate } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = parseInt(req.query.offset, 10) || 0;

    const where = {};
    if (action) where.action = action;
    if (actorEmail) where.actorEmail = actorEmail;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({ items, total, limit, offset });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

const listDistinctActions = async (req, res) => {
  try {
    const rows = await prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' }
    });
    res.json(rows.map(r => r.action));
  } catch (error) {
    console.error('List distinct actions error:', error);
    res.status(500).json({ error: 'Failed to fetch action types' });
  }
};

module.exports = { listAuditLogs, listDistinctActions };
