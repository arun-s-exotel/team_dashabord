const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../lib/audit');

const prisma = new PrismaClient();

const getSchedules = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (userId) {
      where.userId = userId;
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        shift: true
      },
      orderBy: [{ date: 'asc' }, { user: { name: 'asc' } }]
    });

    res.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
};

const bulkAssignSchedules = async (req, res) => {
  try {
    const { userIds, shiftId, startDate, endDate } = req.body;

    if (!userIds || !userIds.length || !shiftId || !startDate || !endDate) {
      return res.status(400).json({ error: 'User IDs, shift ID, start date, and end date are required' });
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || !shift.isActive) {
      return res.status(400).json({ error: 'Invalid shift' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const MAX_OPS = 1000;
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d.toISOString().split('T')[0]));
    }

    const opCount = dates.length * userIds.length;
    if (opCount > MAX_OPS) {
      return res.status(400).json({ error: `Range too large: ${opCount} operations exceeds safety limit of ${MAX_OPS}. Split into smaller batches.` });
    }

    const previousSchedules = await prisma.schedule.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: start, lte: end }
      },
      include: {
        user: { select: { email: true } },
        shift: { select: { name: true } }
      }
    });

    const result = await prisma.$transaction(async (tx) => {
      let writes = 0;
      for (const userId of userIds) {
        for (const date of dates) {
          await tx.schedule.upsert({
            where: {
              userId_date: { userId, date }
            },
            update: { shiftId },
            create: { userId, shiftId, date }
          });
          writes += 1;
        }
      }
      return writes;
    });

    await logAudit(req, {
      action: 'bulk_assign_schedules',
      entityType: 'schedule',
      metadata: {
        shiftId,
        shiftName: shift.name,
        userIds,
        startDate,
        endDate,
        operationsWritten: result,
        overwrittenSchedules: previousSchedules.map(s => ({
          id: s.id,
          userId: s.userId,
          userEmail: s.user.email,
          date: s.date,
          previousShiftId: s.shiftId,
          previousShiftName: s.shift.name
        }))
      }
    });

    res.json({ message: `Created/updated ${result} schedule entries` });
  } catch (error) {
    console.error('Bulk assign error:', error);
    res.status(500).json({ error: 'Failed to assign schedules' });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.schedule.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        shift: { select: { name: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await prisma.schedule.delete({ where: { id } });

    await logAudit(req, {
      action: 'delete_schedule',
      entityType: 'schedule',
      entityId: id,
      metadata: {
        userId: existing.userId,
        userEmail: existing.user.email,
        date: existing.date,
        shiftId: existing.shiftId,
        shiftName: existing.shift.name
      }
    });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
};

module.exports = { getSchedules, bulkAssignSchedules, deleteSchedule };
