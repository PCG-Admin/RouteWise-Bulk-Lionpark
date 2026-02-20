import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { generateToken, requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    // siteId is sent by the frontend to indicate which site the user is logging into.
    // Used to reject users whose account is restricted to a different site.
    const { email, password, siteId: requestedSiteId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Enforce site-based access: if this user is restricted to a specific site,
    // and the frontend is a different site, reject the login.
    // user.siteId === null means unrestricted (can log into any site).
    if (user.siteId !== null && user.siteId !== undefined) {
      const parsedSiteId = requestedSiteId !== undefined ? parseInt(String(requestedSiteId)) : null;
      if (parsedSiteId !== null && parsedSiteId !== user.siteId) {
        return res.status(403).json({ error: 'You do not have access to this system' });
      }
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Generate JWT token (siteId restricts which frontend this user may access)
    const token = generateToken({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      siteId: user.siteId ?? null,
    });

    // Set HttpOnly cookie.
    // Site-restricted users (siteId set) get cookie token_s<siteId> (e.g. token_s1, token_s2)
    // so logins from different sites coexist in the browser without overwriting each other.
    // Unrestricted users (siteId=null) get token_<tenantId> (e.g. token_1) as a fallback
    // that both frontends will check for when no site-scoped cookie is found.
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = user.siteId ? `token_s${user.siteId}` : `token_${user.tenantId}`;
    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName || '',
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/register
 * Register new user — requires admin authentication
 */
router.post('/register', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, password, fullName, role = 'user' } = req.body;
    // tenantId always comes from the admin's token — users cannot set their own tenant
    const tenantId = req.auth!.tenantId;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user or admin.' });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        fullName,
        tenantId,
        role,
        isActive: true,
      })
      .returning();

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName || '',
        role: newUser.role,
        tenantId: newUser.tenantId,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/logout
 * Clear auth cookie
 */
router.post('/logout', requireAuth, (req: AuthRequest, res) => {
  const cookieName = req.auth!.siteId
    ? `token_s${req.auth!.siteId}`
    : `token_${req.auth!.tenantId}`;
  res.clearCookie(cookieName, { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Return current authenticated user (used by frontend to verify session)
 */
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        tenantId: users.tenantId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, parseInt(req.auth!.userId)))
      .limit(1);

    if (!user || !user.isActive) {
      res.clearCookie('token', { path: '/' });
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
