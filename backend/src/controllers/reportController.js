const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseRange(query) {
  let { startDate, endDate, month } = query;

  if (month) {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return { error: 'Invalid month parameter; expected YYYY-MM' };
    }
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0));
    return { start, end, startDate: toDateStr(start), endDate: toDateStr(end) };
  }

  if (!startDate || !endDate) {
    return { error: 'Either month (YYYY-MM) or startDate+endDate are required' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { error: 'Invalid date range' };
  }
  return { start, end, startDate, endDate };
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

const getNightShiftReport = async (req, res) => {
  try {
    const range = parseRange(req.query);
    if (range.error) return res.status(400).json({ error: range.error });
    const { start, end, startDate, endDate } = range;

    const isAdmin = req.user.role === 'admin';
    const targetUserId = req.query.userId;

    const nightShifts = await prisma.shift.findMany({
      where: { isNightShift: true },
      select: { id: true, name: true, startTime: true, endTime: true }
    });
    const nightShiftIds = nightShifts.map(s => s.id);

    if (nightShiftIds.length === 0) {
      return res.json({
        period: { startDate, endDate },
        nightShifts: [],
        rows: [],
        totals: { totalNightShiftDays: 0 },
        note: 'No shifts are marked as night shifts. Mark one in the Shifts page first.'
      });
    }

    const userWhere = { isActive: true };
    if (!isAdmin) {
      userWhere.id = req.user.id;
    } else if (targetUserId) {
      userWhere.id = targetUserId;
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, email: true }
    });

    const scheduleWhere = {
      date: { gte: start, lte: end },
      shiftId: { in: nightShiftIds },
      userId: { in: users.map(u => u.id) }
    };

    const schedules = await prisma.schedule.findMany({
      where: scheduleWhere,
      include: { shift: { select: { id: true, name: true, startTime: true, endTime: true } } },
      orderBy: [{ date: 'asc' }]
    });

    const rows = users.map(user => {
      const userSchedules = schedules.filter(s => s.userId === user.id);
      const byShift = {};
      const dates = [];
      for (const sched of userSchedules) {
        const dateStr = toDateStr(new Date(sched.date));
        dates.push({ date: dateStr, shiftId: sched.shiftId, shiftName: sched.shift.name });
        const key = sched.shift.name;
        byShift[key] = (byShift[key] || 0) + 1;
      }
      return {
        user,
        nightShiftDays: userSchedules.length,
        byShift,
        dates
      };
    }).sort((a, b) => b.nightShiftDays - a.nightShiftDays);

    const totals = {
      totalNightShiftDays: rows.reduce((sum, r) => sum + r.nightShiftDays, 0),
      totalEmployeesWithNightShifts: rows.filter(r => r.nightShiftDays > 0).length
    };

    res.json({
      period: { startDate, endDate },
      nightShifts,
      rows,
      totals
    });
  } catch (error) {
    console.error('Night-shift report error:', error);
    res.status(500).json({ error: 'Failed to generate night-shift report' });
  }
};

const exportNightShiftCSV = async (req, res) => {
  try {
    const range = parseRange(req.query);
    if (range.error) return res.status(400).json({ error: range.error });
    const { start, end, startDate, endDate } = range;

    const nightShifts = await prisma.shift.findMany({
      where: { isNightShift: true },
      select: { id: true, name: true }
    });
    const nightShiftIds = nightShifts.map(s => s.id);

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true }
    });

    const schedules = nightShiftIds.length
      ? await prisma.schedule.findMany({
          where: {
            date: { gte: start, lte: end },
            shiftId: { in: nightShiftIds }
          },
          include: { shift: { select: { name: true } } }
        })
      : [];

    let csv = 'Employee Name,Email,Night Shift Days,Shifts Breakdown\n';
    for (const user of users) {
      const userSchedules = schedules.filter(s => s.userId === user.id);
      const byShift = {};
      for (const sched of userSchedules) {
        const key = sched.shift.name;
        byShift[key] = (byShift[key] || 0) + 1;
      }
      const breakdown = Object.entries(byShift)
        .map(([name, count]) => `${name}: ${count}`)
        .join('; ');
      csv += `"${user.name}",${user.email},${userSchedules.length},"${breakdown}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=night-shift-allowance-${startDate}-to-${endDate}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Night-shift CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

module.exports = { getNightShiftReport, exportNightShiftCSV };
