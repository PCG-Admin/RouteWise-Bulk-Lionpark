import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    tenantId: string;
    role: string;
    email: string;
    siteId: number | null; // null = unrestricted (can access any site)
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Read token from HttpOnly cookie first, then fall back to Authorization header.
    // Cookie naming convention:
    //   token_s<siteId>  → site-restricted user (e.g. token_s1, token_s2)
    //   token_<tenantId> → unrestricted user (e.g. token_1) — fallback
    //   token            → legacy
    let token: string | undefined;

    const cookies = (req as any).cookies || {};
    // Prefer site-scoped cookies first (token_s*), then tenant-scoped (token_*), then legacy
    for (const key of Object.keys(cookies)) {
      if (/^token_s\d+$/.test(key)) {
        token = cookies[key];
        break;
      }
    }
    if (!token) {
      for (const key of Object.keys(cookies)) {
        if (key === 'token' || /^token_\d+$/.test(key)) {
          token = cookies[key];
          break;
        }
      }
    }

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    req.auth = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email,
      siteId: decoded.siteId ?? null,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function generateToken(user: { id: number; tenantId: string; role: string; email: string; siteId?: number | null }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      userId: user.id.toString(),
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      siteId: user.siteId ?? null,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as any
  );
}
