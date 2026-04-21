import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

export const SUPER_ADMIN_EMAIL = 'super@test';

/**
 * Seed a SUPER_ADMIN and return an access token representing them. Avoids
 * going through /auth/login for every setup step \u2014 tests only care that
 * the caller is authorized, not about the login form itself.
 */
export async function seedSuperAdminAndAccessToken(
  app: INestApplication,
  prisma: PrismaClient,
): Promise<{ userId: string; accessToken: string }> {
  const passwordHash = await bcrypt.hash('SuperSecretPass123', 4);
  const user = await prisma.adminUser.create({
    data: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
    },
  });
  const jwt = app.get(JwtService);
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      agentId: null,
    },
    {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    },
  );
  return { userId: user.id, accessToken };
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** Type-narrow supertest response data; our controllers wrap in { data }. */
export function unwrap<T>(res: request.Response): T {
  return res.body.data as T;
}
