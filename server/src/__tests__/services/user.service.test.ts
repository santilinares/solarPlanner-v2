import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../services/user.service';

const {
  mockFindById,
  mockFindByIdAndUpdate,
  mockFindByIdAndDelete,
  mockAggregate,
  mockProjectDeleteMany,
  mockPanelDeleteMany,
} = vi.hoisted(() => ({
  mockFindById: vi.fn(),
  mockFindByIdAndUpdate: vi.fn(),
  mockFindByIdAndDelete: vi.fn(),
  mockAggregate: vi.fn(),
  mockProjectDeleteMany: vi.fn().mockResolvedValue(undefined),
  mockPanelDeleteMany: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../models/user.model', () => ({
  UserModel: {
    findById: mockFindById,
    findByIdAndUpdate: mockFindByIdAndUpdate,
    findByIdAndDelete: mockFindByIdAndDelete,
    aggregate: mockAggregate,
  },
}));

vi.mock('../../models/project.model', () => ({
  ProjectModel: {
    deleteMany: mockProjectDeleteMany,
  },
}));

vi.mock('../../models/panel.model', () => ({
  PanelModel: {
    deleteMany: mockPanelDeleteMany,
  },
}));

vi.mock('../../services/email.service', () => ({
  emailService: {
    sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined),
  },
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
      mockFindById.mockResolvedValueOnce(makeMockUser());

      const result = await service.getUserById('user-id-123');

      expect(result._id).toBe('user-id-123');
      expect(result.email).toBe('test@example.com');
      expect(result.fullName).toBe('Test User');
    });

    it('throws when user is not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.getUserById('bad-id')).rejects.toThrow('User not found');
    });

    it('returns google email for google-method user', async () => {
      const googleUser = makeMockUser({
        method: 'google',
        google: { email: 'google@example.com' },
        local: undefined,
      });
      mockFindById.mockResolvedValueOnce(googleUser);

      const result = await service.getUserById('user-id-123');

      expect(result.email).toBe('google@example.com');
    });
  });

  // ---------- updateProfile ----------

  describe('updateProfile', () => {
    it('updates fullName and returns updated user', async () => {
      const mockUser = makeMockUser();
      mockFindById.mockResolvedValueOnce(mockUser);

      const result = await service.updateProfile('user-id-123', { fullName: 'New Name' });

      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.fullName).toBe('New Name');
      expect(result.fullName).toBe('New Name');
    });

    it('throws when user is not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.updateProfile('bad-id', { fullName: 'X' })).rejects.toThrow(
        'User not found'
      );
    });
  });

  // ---------- changePassword ----------

  describe('changePassword', () => {
    it('changes password when current password is correct', async () => {
      const mockUser = makeMockUser();
      mockFindById.mockResolvedValueOnce(mockUser);

      await service.changePassword('user-id-123', 'oldpassword', 'newpassword123');

      expect(mockUser.verifyPassword).toHaveBeenCalledWith('oldpassword');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('throws when user is not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(
        service.changePassword('bad-id', 'old', 'newpassword123')
      ).rejects.toThrow('User not found');
    });

    it('throws when user is a Google account', async () => {
      mockFindById.mockResolvedValueOnce(makeMockUser({ method: 'google' }));

      await expect(
        service.changePassword('user-id-123', 'old', 'newpassword123')
      ).rejects.toThrow('Password change not available for this authentication method');
    });

    it('throws when current password is wrong', async () => {
      const mockUser = makeMockUser({ verifyPassword: vi.fn().mockResolvedValue(false) });
      mockFindById.mockResolvedValueOnce(mockUser);

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
      mockAggregate.mockResolvedValueOnce([
        { data: [aggregateRow], totalCount: [{ count: 1 }] },
      ]);

      const result = await service.listUsers({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.users[0].projectCount).toBe(3);
    });

    it('returns empty list when no users match', async () => {
      mockAggregate.mockResolvedValueOnce([
        { data: [], totalCount: [] },
      ]);

      const result = await service.listUsers({ role: 'admin', page: 1, limit: 20 });

      expect(result.total).toBe(0);
      expect(result.users).toHaveLength(0);
    });
  });

  // ---------- deleteUser ----------

  describe('deleteUser', () => {
    it('cascades deletion of projects, personal panels, and user', async () => {
      mockFindById.mockResolvedValueOnce(makeMockUser());
      mockFindByIdAndDelete.mockResolvedValueOnce(makeMockUser());

      await service.deleteUser('user-id-123');

      expect(mockProjectDeleteMany).toHaveBeenCalledWith({ owner: 'user-id-123' });
      expect(mockPanelDeleteMany).toHaveBeenCalledWith({ owner: 'user-id-123', type: 'personal' });
      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('user-id-123');
    });

    it('throws when user not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.deleteUser('bad-id')).rejects.toThrow('User not found');
    });
  });

  // ---------- updateUserRole ----------

  describe('updateUserRole', () => {
    it('updates role to admin', async () => {
      const updatedUser = makeMockUser({ role: 'admin' });
      mockFindByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      const result = await service.updateUserRole('user-id-123', 'admin');

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'user-id-123',
        { role: 'admin' },
        { new: true }
      );
      expect(result.role).toBe('admin');
    });

    it('throws when user not found', async () => {
      mockFindByIdAndUpdate.mockResolvedValueOnce(null);

      await expect(service.updateUserRole('bad-id', 'admin')).rejects.toThrow('User not found');
    });
  });
});
