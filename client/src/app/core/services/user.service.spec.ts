import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '@environments/environment';

const BASE = `${environment.apiUrl}/users`;

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(UserService);
  });

  afterEach(() => httpMock.verify());

  describe('getMe()', () => {
    it('GETs /users/me', () => {
      service.getMe().subscribe();
      const req = httpMock.expectOne(`${BASE}/me`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('updateProfile()', () => {
    it('PATCHes /users/:id/profile with fullName payload', () => {
      service.updateProfile('u-1', { fullName: 'Jane Doe' }).subscribe();
      const req = httpMock.expectOne(`${BASE}/u-1/profile`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ fullName: 'Jane Doe' });
      req.flush({});
    });
  });

  describe('changePassword()', () => {
    it('PATCHes /users/:id/password with currentPassword and newPassword', () => {
      service.changePassword('u-1', 'oldPass', 'newPass').subscribe();
      const req = httpMock.expectOne(`${BASE}/u-1/password`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ currentPassword: 'oldPass', newPassword: 'newPass' });
      req.flush(null);
    });
  });

  describe('getAllUsers()', () => {
    it('GETs /users', () => {
      service.getAllUsers().subscribe();
      const req = httpMock.expectOne(BASE);
      expect(req.request.method).toBe('GET');
      req.flush({ users: [], total: 0 });
    });
  });

  describe('deleteUser()', () => {
    it('sends DELETE to /users/:id', () => {
      service.deleteUser('u-99').subscribe();
      const req = httpMock.expectOne(`${BASE}/u-99`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
