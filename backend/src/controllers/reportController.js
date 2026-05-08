const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getSummary = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const where = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (userId) {
      where.userId = userId;
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true }
    });

    const workStatuses = await prisma.workStatus.findMany({
      where,
      include: { user: { select: { id: true, name: true } } }
    });

    const schedules = await prisma.schedule.findMany({
      where,
      include: { 
        user: { select: { id: true, name: true } },
        shift: true 
      }
    });

    const summary = users.map(user => {
      const userStatuses = workStatuses.filter(ws => ws.userId === user.id);
      const userSchedules = schedules.filter(s => s.userId === user.id);

      const officeDays = userStatuses.filter(ws => ws.status === 'office').length;
      const homeDays = userStatuses.filter(ws => ws.status === 'home').length;
      const leaveDays = userStatuses.filter(ws => ws.status === 'leave');
      
      const fullLeaveDays = leaveDays.filter(l => l.leaveType === 'full').length;
      const halfLeaveDays = leaveDays.filter(l => l.leaveType !== 'full').length;
      const totalLeaveDays = fullLeaveDays + (halfLeaveDays * 0.5);

      const shiftCounts = {};
      userSchedules.forEach(s => {
        const shiftName = s.shift.name;
        shiftCounts[shiftName] = (shiftCounts[shiftName] || 0) + 1;
      });

      return {
        user: { id: user.id, name: user.name, email: user.email },
        officeDays,
        homeDays,
        totalLeaveDays,
        fullLeaveDays,
        halfLeaveDays,
        totalWorkDays: officeDays + homeDays,
        shiftDistribution: shiftCounts
      };
    });

    const totals = {
      totalOfficeDays: summary.reduce((sum, s) => sum + s.officeDays, 0),
      totalHomeDays: summary.reduce((sum, s) => sum + s.homeDays, 0),
      totalLeaveDays: summary.reduce((sum, s) => sum + s.totalLeaveDays, 0)
    };

    res.json({ summary, totals, period: { startDate, endDate } });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true }
    });

    const workStatuses = await prisma.workStatus.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ date: 'asc' }, { user: { name: 'asc' } }]
    });

    const schedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: { 
        user: { select: { name: true, email: true } },
        shift: { select: { name: true, startTime: true, endTime: true } }
      },
      orderBy: [{ date: 'asc' }, { user: { name: 'asc' } }]
    });

    let csv = 'Date,Employee,Email,Status,Leave Type,Shift,Notes\n';

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      for (const user of users) {
        const status = workStatuses.find(
          ws => ws.userId === user.id && ws.date.toISOString().split('T')[0] === dateStr
        );
        const schedule = schedules.find(
          s => s.userId === user.id && s.date.toISOString().split('T')[0] === dateStr
        );

        csv += `${dateStr},`;
        csv += `"${user.name}",`;
        csv += `${user.email},`;
        csv += `${status?.status || 'Not set'},`;
        csv += `${status?.leaveType || ''},`;
        csv += `${schedule?.shift?.name || 'Not assigned'},`;
        csv += `"${status?.notes || ''}"\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=schedule-report-${startDate}-to-${endDate}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

module.exports = { getSummary, exportCSV };
