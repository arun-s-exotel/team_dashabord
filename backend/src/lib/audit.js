const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function logAudit(req, { action, entityType, entityId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id ?? null,
        actorEmail: req.user?.email ?? 'system',
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        metadata: metadata ?? null
      }
    });
  } catch (err) {
    console.error('Audit log failed (non-fatal):', err.message);
  }
}

module.exports = { logAudit };
