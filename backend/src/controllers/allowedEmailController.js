const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRIMARY_ADMIN_EMAIL = 'arun.s@exotel.com';

const listAllowedEmails = async (req, res) => {
  try {
    const [allowed, users] = await Promise.all([
      prisma.allowedEmail.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({ select: { email: true, isActive: true } })
    ]);

    const usersByEmail = new Map(users.map(u => [u.email, u]));

    const result = allowed.map(a => ({
      ...a,
      registered: usersByEmail.has(a.email),
      active: usersByEmail.get(a.email)?.isActive ?? false
    }));

    res.json(result);
  } catch (error) {
    console.error('List allowed emails error:', error);
    res.status(500).json({ error: 'Failed to fetch allowed emails' });
  }
};

const addAllowedEmail = async (req, res) => {
  try {
    const { email, role } = req.body;
    const isPrimaryAdmin = req.user.email === PRIMARY_ADMIN_EMAIL;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail.endsWith('@exotel.com')) {
      return res.status(400).json({ error: 'Only @exotel.com emails are allowed' });
    }

    const requestedRole = role === 'admin' ? 'admin' : 'employee';
    if (requestedRole === 'admin' && !isPrimaryAdmin) {
      return res.status(403).json({ error: 'Only the primary admin can pre-assign the admin role' });
    }

    const existing = await prisma.allowedEmail.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'Email is already in the whitelist' });
    }

    const entry = await prisma.allowedEmail.create({
      data: {
        email: normalizedEmail,
        role: requestedRole,
        addedBy: req.user.email
      }
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Add allowed email error:', error);
    res.status(500).json({ error: 'Failed to add allowed email' });
  }
};

const updateAllowedEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const isPrimaryAdmin = req.user.email === PRIMARY_ADMIN_EMAIL;

    if (!isPrimaryAdmin) {
      return res.status(403).json({ error: 'Only the primary admin can change roles' });
    }

    const requestedRole = role === 'admin' ? 'admin' : 'employee';

    const entry = await prisma.allowedEmail.update({
      where: { id },
      data: { role: requestedRole }
    });

    res.json(entry);
  } catch (error) {
    console.error('Update allowed email error:', error);
    res.status(500).json({ error: 'Failed to update allowed email' });
  }
};

const removeAllowedEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.allowedEmail.findUnique({ where: { id } });
    if (!entry) {
      return res.status(404).json({ error: 'Allowed email not found' });
    }

    if (entry.email === PRIMARY_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Cannot remove the primary admin from the whitelist' });
    }

    await prisma.allowedEmail.delete({ where: { id } });

    res.json({ message: 'Removed from whitelist. Existing user account (if any) is unchanged.' });
  } catch (error) {
    console.error('Remove allowed email error:', error);
    res.status(500).json({ error: 'Failed to remove allowed email' });
  }
};

module.exports = { listAllowedEmails, addAllowedEmail, updateAllowedEmail, removeAllowedEmail };
