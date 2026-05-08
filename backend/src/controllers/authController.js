const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ALLOWED_EMAILS = [
  'ashwin.ts@exotel.com',
  'vemana.kiran@exotel.com',
  'ruthwik.d@exotel.com',
  'sneha.sb@exotel.com',
  'akhil.a@exotel.com',
  'shreya.singh@exotel.com',
  'ashwini.v@exotel.com',
  'pratnadeep.sinha@exotel.com',
  'harsh.agrawal@exotel.com',
  'mangala.rajeshwari@exotel.com',
  'naveenkumar.k@exotel.com',
  'rajnish.singh@exotel.com',
  'diya.sarkar@exotel.com',
  'bindu.bhavani@exotel.com',
  'arun.naik@exotel.com',
  'rohit.anand@exotel.com',
  'ananya.ba@exotel.com',
  'turaka.aruna@exotel.com',
  'heena.k@exotel.com',
  'manikandan.palanisamy@exotel.com',
  'arun.s@exotel.com'
];

const PRIMARY_ADMIN_EMAIL = 'arun.s@exotel.com';
const MAX_USERS = ALLOWED_EMAILS.length;

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      return res.status(403).json({ error: 'This email is not authorized to register. Only approved Exotel team members can sign up.' });
    }

    const userCount = await prisma.user.count();
    if (userCount >= MAX_USERS) {
      return res.status(400).json({ error: `Maximum user limit reached (${MAX_USERS} users)` });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isPrimaryAdmin = normalizedEmail === PRIMARY_ADMIN_EMAIL;

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
        role: isPrimaryAdmin ? 'admin' : 'employee'
      },
      select: { id: true, email: true, name: true, role: true }
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, me };
