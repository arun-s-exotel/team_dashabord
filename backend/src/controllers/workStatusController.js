const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getWorkStatuses = async (req, res) => {
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

    const statuses = await prisma.workStatus.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: [{ date: 'asc' }, { user: { name: 'asc' } }]
    });

    res.json(statuses);
  } catch (error) {
    console.error('Get work statuses error:', error);
    res.status(500).json({ error: 'Failed to fetch work statuses' });
  }
};

const updateWorkStatus = async (req, res) => {
  try {
    const { date, status, leaveType, notes, userId: targetUserId } = req.body;
    const isAdmin = req.user.role === 'admin';
    const userId = (isAdmin && targetUserId) ? targetUserId : req.user.id;

    if (!date || !status) {
      return res.status(400).json({ error: 'Date and status are required' });
    }

    if (!['office', 'home', 'leave'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be office, home, or leave' });
    }

    if (status === 'leave' && !leaveType) {
      return res.status(400).json({ error: 'Leave type is required when status is leave' });
    }

    if (status !== 'leave' && leaveType) {
      return res.status(400).json({ error: 'Cannot set work location when on leave' });
    }

    const workStatus = await prisma.workStatus.upsert({
      where: {
        userId_date: {
          userId,
          date: new Date(date)
        }
      },
      update: {
        status,
        leaveType: status === 'leave' ? leaveType : null,
        notes
      },
      create: {
        userId,
        date: new Date(date),
        status,
        leaveType: status === 'leave' ? leaveType : null,
        notes
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(workStatus);
  } catch (error) {
    console.error('Update work status error:', error);
    res.status(500).json({ error: 'Failed to update work status' });
  }
};

const deleteWorkStatus = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    await prisma.workStatus.delete({
      where: {
        userId_date: {
          userId,
          date: new Date(date)
        }
      }
    });

    res.json({ message: 'Work status deleted successfully' });
  } catch (error) {
    console.error('Delete work status error:', error);
    res.status(500).json({ error: 'Failed to delete work status' });
  }
};

const bulkUpdateWorkStatus = async (req, res) => {
  try {
    const { dates, status, leaveType, notes, userId: targetUserId } = req.body;
    const isAdmin = req.user.role === 'admin';
    const userId = (isAdmin && targetUserId) ? targetUserId : req.user.id;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'Dates array is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    if (!['office', 'home', 'leave'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be office, home, or leave' });
    }

    if (status === 'leave' && !leaveType) {
      return res.status(400).json({ error: 'Leave type is required when status is leave' });
    }

    const results = await prisma.$transaction(
      dates.map(date => 
        prisma.workStatus.upsert({
          where: {
            userId_date: {
              userId,
              date: new Date(date)
            }
          },
          update: {
            status,
            leaveType: status === 'leave' ? leaveType : null,
            notes: notes || null
          },
          create: {
            userId,
            date: new Date(date),
            status,
            leaveType: status === 'leave' ? leaveType : null,
            notes: notes || null
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        })
      )
    );

    res.json({ 
      message: `Successfully updated ${results.length} status(es)`,
      statuses: results 
    });
  } catch (error) {
    console.error('Bulk update work status error:', error);
    res.status(500).json({ error: 'Failed to bulk update work statuses' });
  }
};

module.exports = { getWorkStatuses, updateWorkStatus, deleteWorkStatus, bulkUpdateWorkStatus };
