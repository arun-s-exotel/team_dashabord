const { PrismaClient } = require('@prisma/client');

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
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const scheduleData = [];
    for (const userId of userIds) {
      for (const date of dates) {
        scheduleData.push({
          userId,
          shiftId,
          date: new Date(date.toISOString().split('T')[0])
        });
      }
    }

    await prisma.schedule.deleteMany({
      where: {
        userId: { in: userIds },
        date: { gte: start, lte: end }
      }
    });

    const created = await prisma.schedule.createMany({
      data: scheduleData,
      skipDuplicates: true
    });

    res.json({ message: `Created ${created.count} schedule entries` });
  } catch (error) {
    console.error('Bulk assign error:', error);
    res.status(500).json({ error: 'Failed to assign schedules' });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.schedule.delete({ where: { id } });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
};

module.exports = { getSchedules, bulkAssignSchedules, deleteSchedule };
