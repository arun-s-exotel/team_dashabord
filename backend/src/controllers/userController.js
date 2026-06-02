const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../lib/audit');

const prisma = new PrismaClient();

const PRIMARY_ADMIN_EMAIL = 'arun.s@exotel.com';

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, isActive } = req.body;
    const requesterEmail = req.user.email;
    const isPrimaryAdmin = requesterEmail === PRIMARY_ADMIN_EMAIL;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role && role !== targetUser.role) {
      if (!isPrimaryAdmin) {
        return res.status(403).json({ error: 'Only the primary admin can change user roles' });
      }
      if (targetUser.email === PRIMARY_ADMIN_EMAIL && role !== 'admin') {
        return res.status(403).json({ error: 'Cannot demote the primary admin' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && isPrimaryAdmin && { role }),
        ...(typeof isActive === 'boolean' && { isActive })
      },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });

    if (role && role !== targetUser.role && isPrimaryAdmin) {
      await logAudit(req, {
        action: 'change_user_role',
        entityType: 'user',
        entityId: id,
        metadata: {
          targetEmail: targetUser.email,
          previousRole: targetUser.role,
          newRole: role
        }
      });
    }

    if (typeof isActive === 'boolean' && isActive !== targetUser.isActive) {
      await logAudit(req, {
        action: isActive ? 'reactivate_user' : 'deactivate_user',
        entityType: 'user',
        entityId: id,
        metadata: { targetEmail: targetUser.email }
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.email === PRIMARY_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Cannot remove the primary admin' });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    await logAudit(req, {
      action: 'deactivate_user',
      entityType: 'user',
      entityId: id,
      metadata: { targetEmail: targetUser.email, targetName: targetUser.name }
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = { getUsers, updateUser, deleteUser };
