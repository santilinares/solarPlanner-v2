import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../services/user.service';

vi.mock('../../models/user.model', () => ({
  UserModel: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../../models/project.model', () => ({
  ProjectModel: {
    deleteMany: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../models/panel.model', () => ({
  PanelModel: {
    deleteMany: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/email.service', () => ({
  emailService: {
    sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

import { UserModel } from '../../models/user.model';
import { ProjectModel } from '../../models/project.model';
import { PanelModel } from '../../models/panel.model';

function makeMockUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'user-id-123' },
    method: 'local',
    local: { email: 'test@example.com', password: 'hashed' },
    fullName: 'Test User',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
  });

  // ---------- getUserById ----------

  describe('getUserById', () => {
    it('returns user response when found', async () => {
      vi.mocked(UserModel.findById).mockResolvedValueOnce(makeMockUser() as any);

      const result = await service.getUserById('user-id-123');

      expect(result._id).toBe('user-id-123');
      expect(result.email).toBe('test@example.com');
      expect(result.fullName).toBe('Test User');
    });

    it('throws when user is not found', async () => {
      vi.mocked(UserModel.findById).mockResolvedValueOnce(null);

      await expect(service.getUserById('bad-id')).rejects.toThrow('User not found');
    });

    it('returns google email for google-method user', async () => {
      const googleUser = makeMockUser({
        method: 'google',
        google: { email: 'google@example.com' },
        local: undefined,
      });
      vi.mocked(UserModel.findById).mockResolvedValueOnce(googleUser as any);

      const result = await service.getUserById('user-id-123');

      expect(result.email).toBe('google@example.com');
    });
  });

  // ---------- updateProfile ----------

  describe('updateProfile', () => {
    it('updates fullName and returns updated user', async () => {
      const mockUser = makeMockUser();
      vi.mocked(UserModel.findById).mockResolvedValueOnce(mockUser as any);

      const result = await service.updateProfile('user-id-123', { fullName: 'New Name' });

      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.fullName).toBe('New Name');
      expect(result.fullName).toBe('New Name');
    });

    it('throws when user is not found', async () => {
      vi.mocked(UserModel.findById).mockResolvedValueOnce(null);

      await expect(service.updateProfile('bad-id', { fullName: 'X' })).rejects.toThrow(
        'User not found'
      );
    });
  });

  // ---------- changePassword ----------

  describe('changePassword', () => {
    it('changes password when current password is correct', async () => {
      const mockUser = makeMockUser();
      vi.mocked(UserModel.findById).mockResolvedValueOnce(mockUser as any);

      await service.changePassword('user-id-123', 'oldpassword', 'newpassword123');

      expect(mockUser.verifyPassword).toHaveBeenCalledWith('oldpassword');
      expect(mockUser.local!.password).toBe('newpassword123');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('throws when user is not found', async () => {
      vi.mocked(UserModel.findById).mockResolvedValueOnce(null);

      await expect(
        service.changePassword('bad-id', 'old', 'newpassword123')
      ).rejects.toThrow('User not found');
    });

    it('throws when user is a Google account', async () => {
      vi.mocked(UserModel.findById).mockResolvedValueOnce(
        makeMockUser({ method: 'google' }) as any
      );

      await expect(
        service.changePassword('user-id-123', 'old', 'newpassword123')
      ).rejects.toThrow('Password change not available for this authentication method');
    });

    it('throws when current password is wrong', async () => {
      const mockUser = makeMockUser({ verifyPassword: vi.fn().mockResolvedValue(false) });
      vi.mocked(UserModel.findById).mockResolvedValueOnce(mockUser as any);

      await expect(
        service.changePassword('user-id-123', 'wrongpassword', 'newpassword123')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  // ---------- listUsers ----------

  describe('listUsers', () => {
    const aggregateRow = {
      _id: { toString: () => 'user-id-123' },
      fullName: 'Test User',
      method: 'local',
      local: { email: 'test@example.com' },
      role: 'user',
      createdAt: new Date('2024-01-01'),
      projectCount: 3,
    };

    it('returns list with projectCount', async () => {
      vi.mocked(UserModel.aggregate).mockResolvedValueOnce([aggregateRow] as any);

      const result = await service.listUsers({});

      expect(result.total).toBe(1);
      expect(result.users[0].projectCount).toBe(3);
    });

    it('returns empty list when no users match', async () => {
      vi.mocked(UserModel.aggregate).mockResolvedValueOnce([]);

      const result = await service.listUsers({ role: 'admin' });

      expect(result.total).toBe(0);
      expect(result.users).toHaveLength(0);
    });
  });

  // ---------- deleteUser ----------

  describe('deleteUser', () => {
    it('cascades deletion of projects, personal panels, and user', async () => {
      vi.mocked(UserModel.findById).mockResolvedValueOnce(makeMockUser() as any);
      vi.mocked(UserModel.findByIdAndDelete).mockResolvedValueOnce(makeMockUser() as any);

      await service.deleteUser('user-id-123');

      expect(ProjectModel.deleteMany).toHaveBeenCalledWith({ owner: 'user-id-123' });
      expect(PanelModel.deleteMany).toHaveBeenCalledWith({ owner: 'user-id-123', type: 'personal' });
      expect(UserModel.findByIdAndDelete).toHaveBeenCalledWith('user-id-123');
    });

    it('throws when user not found', async () => {
      vi.mocked(UserModel.findById).mockResolvedValueOnce(null);

      await expect(service.deleteUser('bad-id')).rejects.toThrow('User not found');
    });
  });

  // ---------- updateUserRole ----------

  describe('updateUserRole', () => {
    it('updates role to admin', async () => {
      const updatedUser = makeMockUser({ role: 'admin' });
      vi.mocked(UserModel.findByIdAndUpdate).mockResolvedValueOnce(updatedUser as any);

      const result = await service.updateUserRole('user-id-123', 'admin');

      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        { role: 'admin' },
        { new: true }
      );
      expect(result.role).toBe('admin');
    });

    it('throws when user not found', async () => {
      vi.mocked(UserModel.findByIdAndUpdate).mockResolvedValueOnce(null);

      await expect(service.updateUserRole('bad-id', 'admin')).rejects.toThrow('User not found');
    });
  });
});
