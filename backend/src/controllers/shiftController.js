const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../lib/audit');

const prisma = new PrismaClient();

const getShifts = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' }
    });
    res.json(shifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

const createShift = async (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: 'Name, start time, and end time are required' });
    }

    const shift = await prisma.shift.create({
      data: { name, startTime, endTime }
    });

    await logAudit(req, {
      action: 'create_shift',
      entityType: 'shift',
      entityId: shift.id,
      metadata: { name, startTime, endTime }
    });

    res.status(201).json(shift);
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, isActive } = req.body;

    const previous = await prisma.shift.findUnique({ where: { id } });
    if (!previous) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(typeof isActive === 'boolean' && { isActive })
      }
    });

    await logAudit(req, {
      action: 'update_shift',
      entityType: 'shift',
      entityId: id,
      metadata: {
        previous: { name: previous.name, startTime: previous.startTime, endTime: previous.endTime, isActive: previous.isActive },
        current: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime, isActive: shift.isActive }
      }
    });

    res.json(shift);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
};

const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;

    const previous = await prisma.shift.findUnique({ where: { id } });
    if (!previous) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    await prisma.shift.update({
      where: { id },
      data: { isActive: false }
    });

    await logAudit(req, {
      action: 'deactivate_shift',
      entityType: 'shift',
      entityId: id,
      metadata: { name: previous.name, startTime: previous.startTime, endTime: previous.endTime }
    });

    res.json({ message: 'Shift deactivated successfully' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
};

module.exports = { getShifts, createShift, updateShift, deleteShift };
