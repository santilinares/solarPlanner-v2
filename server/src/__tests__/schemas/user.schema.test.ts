import { describe, it, expect } from 'vitest';
import {
  UserCreateSchema,
  UserLoginSchema,
  UserUpdateProfileSchema,
  UserChangePasswordSchema,
  PasswordResetRequestSchema,
  PasswordResetApplySchema,
  UserQuerySchema,
  UserUpdateRoleSchema,
  GoogleAuthSchema,
  ObjectIdSchema,
} from '../../schemas/user.schema';

describe('UserCreateSchema', () => {
  const valid = { fullName: 'Jane Doe', email: 'Jane@Example.com', password: 'password123' };

  it('accepts valid input', () => {
    const result = UserCreateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('lowercases email', () => {
    const result = UserCreateSchema.safeParse(valid);
    expect(result.success && result.data.email).toBe('jane@example.com');
  });

  it('rejects fullName shorter than 2 chars', () => {
    expect(UserCreateSchema.safeParse({ ...valid, fullName: 'A' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(UserCreateSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    expect(UserCreateSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });
});

describe('UserLoginSchema', () => {
  const valid = { email: 'User@Test.com', password: 'password123' };

  it('accepts valid credentials', () => {
    const result = UserLoginSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('lowercases email', () => {
    const result = UserLoginSchema.safeParse(valid);
    expect(result.success && result.data.email).toBe('user@test.com');
  });

  it('rejects invalid email', () => {
    expect(UserLoginSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false);
  });

  it('rejects short password', () => {
    expect(UserLoginSchema.safeParse({ ...valid, password: 'abc' }).success).toBe(false);
  });
});

describe('UserUpdateProfileSchema', () => {
  it('accepts valid fullName', () => {
    expect(UserUpdateProfileSchema.safeParse({ fullName: 'Updated Name' }).success).toBe(true);
  });

  it('rejects fullName shorter than 2 chars', () => {
    expect(UserUpdateProfileSchema.safeParse({ fullName: 'X' }).success).toBe(false);
  });

  it('rejects fullName longer than 120 chars', () => {
    expect(UserUpdateProfileSchema.safeParse({ fullName: 'a'.repeat(121) }).success).toBe(false);
  });
});

describe('UserChangePasswordSchema', () => {
  const valid = { currentPassword: 'oldpassword', newPassword: 'newpassword' };

  it('accepts valid input', () => {
    expect(UserChangePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects short currentPassword', () => {
    expect(UserChangePasswordSchema.safeParse({ ...valid, currentPassword: 'short' }).success).toBe(false);
  });

  it('rejects short newPassword', () => {
    expect(UserChangePasswordSchema.safeParse({ ...valid, newPassword: 'short' }).success).toBe(false);
  });
});

describe('PasswordResetRequestSchema', () => {
  it('accepts valid email', () => {
    expect(PasswordResetRequestSchema.safeParse({ email: 'test@example.com' }).success).toBe(true);
  });

  it('lowercases email', () => {
    const result = PasswordResetRequestSchema.safeParse({ email: 'TEST@EXAMPLE.COM' });
    expect(result.success && result.data.email).toBe('test@example.com');
  });

  it('rejects invalid email', () => {
    expect(PasswordResetRequestSchema.safeParse({ email: 'notvalid' }).success).toBe(false);
  });
});

describe('PasswordResetApplySchema', () => {
  const valid = { token: 'some-jwt-token', newPassword: 'newpassword' };

  it('accepts valid input', () => {
    expect(PasswordResetApplySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty token', () => {
    expect(PasswordResetApplySchema.safeParse({ ...valid, token: '' }).success).toBe(false);
  });

  it('rejects short newPassword', () => {
    expect(PasswordResetApplySchema.safeParse({ ...valid, newPassword: 'short' }).success).toBe(false);
  });
});

describe('UserQuerySchema', () => {
  it('accepts empty object', () => {
    expect(UserQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid role filter', () => {
    expect(UserQuerySchema.safeParse({ role: 'admin' }).success).toBe(true);
  });

  it('rejects invalid role', () => {
    expect(UserQuerySchema.safeParse({ role: 'superuser' }).success).toBe(false);
  });

  it('rejects invalid email in filter', () => {
    expect(UserQuerySchema.safeParse({ email: 'not-email' }).success).toBe(false);
  });
});

describe('UserUpdateRoleSchema', () => {
  it('accepts user role', () => {
    expect(UserUpdateRoleSchema.safeParse({ role: 'user' }).success).toBe(true);
  });

  it('accepts admin role', () => {
    expect(UserUpdateRoleSchema.safeParse({ role: 'admin' }).success).toBe(true);
  });

  it('rejects invalid role', () => {
    expect(UserUpdateRoleSchema.safeParse({ role: 'moderator' }).success).toBe(false);
  });
});

describe('GoogleAuthSchema', () => {
  it('accepts valid token', () => {
    expect(GoogleAuthSchema.safeParse({ idToken: 'google.id.token' }).success).toBe(true);
  });

  it('rejects empty token', () => {
    expect(GoogleAuthSchema.safeParse({ idToken: '' }).success).toBe(false);
  });
});

describe('ObjectIdSchema', () => {
  it('accepts valid 24-char hex ObjectId', () => {
    expect(ObjectIdSchema.safeParse('507f1f77bcf86cd799439011').success).toBe(true);
  });

  it('rejects short id', () => {
    expect(ObjectIdSchema.safeParse('507f1f').success).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(ObjectIdSchema.safeParse('507f1f77bcf86cd79943901g').success).toBe(false);
  });
});
