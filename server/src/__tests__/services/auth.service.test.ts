import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { AppError } from '../../middleware/error.middleware';

// --- Mocks ---

const {
  mockFindOne,
  mockFindById,
  mockCreate,
  mockSendWelcomeEmail,
  mockSendPasswordResetEmail,
  mockGeneratePasswordResetToken,
  mockVerifyPasswordResetToken,
  mockVerifyRefreshToken,
  mockVerifyIdToken,
  MockOAuth2Client,
} = vi.hoisted(() => {
  const mockVerifyIdToken = vi.fn().mockResolvedValue({
    getPayload: () => ({
      sub: 'google-sub-123',
      email: 'google@example.com',
      name: 'Google User',
    }),
  });
  const MockOAuth2Client = vi.fn(function (this: Record<string, unknown>) {
    this.verifyIdToken = mockVerifyIdToken;
  });
  return {
    mockFindOne: vi.fn(),
    mockFindById: vi.fn(),
    mockCreate: vi.fn(),
    mockSendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    mockSendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    mockGeneratePasswordResetToken: vi.fn().mockReturnValue('reset-token'),
    mockVerifyPasswordResetToken: vi.fn().mockReturnValue('user-id-123'),
    mockVerifyRefreshToken: vi.fn().mockReturnValue({ _id: 'user-id-123', role: 'user' }),
    mockVerifyIdToken,
    MockOAuth2Client,
  };
});

vi.mock('../../models/user.model', () => ({
  UserModel: {
    findOne: mockFindOne,
    findById: mockFindById,
    create: mockCreate,
  },
}));

vi.mock('../../services/email.service', () => ({
  emailService: {
    sendWelcomeEmail: mockSendWelcomeEmail,
    sendPasswordResetEmail: mockSendPasswordResetEmail,
  },
}));

vi.mock('../../config/jwt.config', () => ({
  generatePasswordResetToken: mockGeneratePasswordResetToken,
  verifyPasswordResetToken: mockVerifyPasswordResetToken,
  verifyRefreshToken: mockVerifyRefreshToken,
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: MockOAuth2Client,
}));

function makeMockUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'user-id-123' },
    method: 'local',
    local: { email: 'test@example.com', password: 'hashed' },
    fullName: 'Test User',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    generateJwt: vi.fn().mockReturnValue('access-token'),
    generateRefreshToken: vi.fn().mockReturnValue('refresh-token'),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-123',
        email: 'google@example.com',
        name: 'Google User',
      }),
    });
    process.env.JWT_SECRET = 'test-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.FRONTEND_URL = 'http://localhost:4200';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    service = new AuthService();
  });

  // ---------- register ----------

  describe('register', () => {
    it('creates a user and returns tokens', async () => {
      mockFindOne.mockResolvedValueOnce(null);
      const mockUser = makeMockUser();
      mockCreate.mockResolvedValueOnce(mockUser);

      const result = await service.register({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws 409 when email is already registered', async () => {
      mockFindOne
        .mockResolvedValueOnce(makeMockUser())
        .mockResolvedValueOnce(makeMockUser());

      await expect(
        service.register({ fullName: 'Test', email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow(AppError);

      await expect(
        service.register({ fullName: 'Test', email: 'test@example.com', password: 'password123' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ---------- login ----------

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const mockUser = makeMockUser();
      mockFindOne.mockResolvedValueOnce(mockUser);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result.token).toBe('access-token');
      expect(mockUser.verifyPassword).toHaveBeenCalledWith('password123');
    });

    it('throws 401 when user not found', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password123' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when user method is google (not local)', async () => {
      mockFindOne.mockResolvedValueOnce(makeMockUser({ method: 'google' }));

      await expect(
        service.login({ email: 'google@example.com', password: 'password123' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when password is wrong', async () => {
      const mockUser = makeMockUser({ verifyPassword: vi.fn().mockResolvedValue(false) });
      mockFindOne.mockResolvedValueOnce(mockUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  // ---------- loginWithGoogle ----------

  describe('loginWithGoogle', () => {
    it('creates a new Google user when none exists', async () => {
      mockFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const mockUser = makeMockUser({
        method: 'google',
        google: { googleId: 'google-sub-123', email: 'google@example.com' },
      });
      mockCreate.mockResolvedValueOnce(mockUser);

      const result = await service.loginWithGoogle('valid-google-id-token');

      expect(mockCreate).toHaveBeenCalled();
      expect(result.token).toBe('access-token');
    });

    it('returns existing Google user without creating', async () => {
      const mockUser = makeMockUser({ method: 'google' });
      mockFindOne.mockResolvedValueOnce(mockUser);

      const result = await service.loginWithGoogle('valid-google-id-token');

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result.token).toBe('access-token');
    });

    it('throws 409 when email is already registered locally', async () => {
      mockFindOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeMockUser());

      await expect(service.loginWithGoogle('valid-google-id-token')).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('throws 401 when Google token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid token'));

      await expect(service.loginWithGoogle('bad-token')).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  // ---------- requestPasswordReset ----------

  describe('requestPasswordReset', () => {
    it('sends reset email when user found', async () => {
      mockFindOne.mockResolvedValueOnce(makeMockUser());

      await service.requestPasswordReset('test@example.com');

      expect(mockGeneratePasswordResetToken).toHaveBeenCalled();
      expect(mockSendPasswordResetEmail).toHaveBeenCalled();
    });

    it('returns silently when email is not found (no information leak)', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      await expect(service.requestPasswordReset('unknown@example.com')).resolves.toBeUndefined();
    });

    it('returns silently when user is a Google account', async () => {
      mockFindOne.mockResolvedValueOnce(makeMockUser({ method: 'google' }));

      await expect(service.requestPasswordReset('google@example.com')).resolves.toBeUndefined();
    });
  });

  // ---------- resetPassword ----------

  describe('resetPassword', () => {
    it('updates password for valid token', async () => {
      const mockUser = makeMockUser();
      mockFindById.mockResolvedValueOnce(mockUser);

      await service.resetPassword('valid-token', 'newpassword123');

      expect(mockUser.save).toHaveBeenCalled();
      expect((mockUser.local as { password: string }).password).toBe('newpassword123');
    });

    it('throws when token is invalid', async () => {
      mockVerifyPasswordResetToken.mockImplementationOnce(() => {
        throw new Error('jwt expired');
      });

      await expect(service.resetPassword('bad-token', 'newpassword123')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('throws when user is not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.resetPassword('valid-token', 'newpassword123')).rejects.toThrow(
        'User not found'
      );
    });
  });

  // ---------- refreshTokens ----------

  describe('refreshTokens', () => {
    it('returns new tokens for a valid refresh token', async () => {
      const mockUser = makeMockUser();
      mockFindById.mockResolvedValueOnce(mockUser);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('throws 401 when refresh token is invalid', async () => {
      mockVerifyRefreshToken.mockImplementationOnce(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.refreshTokens('bad-token')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when user no longer exists', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.refreshTokens('valid-refresh-token')).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });
});
