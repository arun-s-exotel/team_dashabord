const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRIMARY_ADMIN_EMAIL = 'arun.s@exotel.com';
const MAX_USERS = 21;

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

const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const userCount = await prisma.user.count({ where: { isActive: true } });
    if (userCount >= MAX_USERS) {
      return res.status(400).json({ error: 'Maximum user limit reached (22 users)' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role || 'employee'
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
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

    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
