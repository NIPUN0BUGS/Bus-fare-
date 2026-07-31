import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { UserEntity } from '../entities/user.entity';
import { OtpCodeEntity } from '../entities/otp-code.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { PassengerProfileEntity } from '../entities/passenger-profile.entity';
import { NotificationService } from '../../notifications/notification.service';
import { UserRole, UserStatus, Locale } from '@buslanka/shared-types';
import * as bcrypt from 'bcryptjs';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return Object.assign(new UserEntity(), {
    id: 'user-uuid-1',
    phone: '+94771234567',
    email: null,
    emailVerified: false,
    phoneVerified: false,
    passwordHash: null,
    role: UserRole.PASSENGER,
    status: UserStatus.PENDING_VERIFICATION,
    locale: Locale.EN,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });
}

function makeOtp(overrides: Partial<OtpCodeEntity> = {}): OtpCodeEntity {
  return Object.assign(new OtpCodeEntity(), {
    id: 'otp-uuid-1',
    userId: 'user-uuid-1',
    user: null,
    channel: 'SMS' as const,
    codeHash: '', // set per-test
    purpose: 'REGISTER' as const,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  });
}

function mockRepo<T extends object>(overrides: Partial<Repository<T>> = {}): jest.Mocked<Repository<T>> {
  return {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn((entity) => entity),
    save: jest.fn(async (entity) => entity),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<Repository<T>>;
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<UserEntity>>;
  let otpRepo: jest.Mocked<Repository<OtpCodeEntity>>;
  let refreshRepo: jest.Mocked<Repository<RefreshTokenEntity>>;
  let profileRepo: jest.Mocked<Repository<PassengerProfileEntity>>;
  let jwtService: jest.Mocked<JwtService>;
  let notifications: jest.Mocked<NotificationService>;

  const mockResponse = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  beforeEach(async () => {
    userRepo    = mockRepo<UserEntity>();
    otpRepo     = mockRepo<OtpCodeEntity>();
    refreshRepo = mockRepo<RefreshTokenEntity>();
    profileRepo = mockRepo<PassengerProfileEntity>();

    jwtService = {
      sign: jest.fn().mockReturnValue('mock.access.token'),
    } as unknown as jest.Mocked<JwtService>;

    notifications = {
      sendSms: jest.fn().mockResolvedValue(undefined),
      sendEmail: jest.fn().mockResolvedValue(undefined),
      sendPush: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity),            useValue: userRepo },
        { provide: getRepositoryToken(OtpCodeEntity),         useValue: otpRepo },
        { provide: getRepositoryToken(RefreshTokenEntity),    useValue: refreshRepo },
        { provide: getRepositoryToken(PassengerProfileEntity), useValue: profileRepo },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: string) => def ?? null),
            getOrThrow: jest.fn((key: string) => { throw new Error(`${key} not set`); }),
          },
        },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    process.env['NODE_ENV'] = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env['NODE_ENV'];
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('creates user and returns OTP channel when phone provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => u as UserEntity);
      profileRepo.save.mockImplementation(async (p) => p as PassengerProfileEntity);
      otpRepo.save.mockImplementation(async (o) => o as OtpCodeEntity);

      const result = await service.register({ phone: '+94771234567', locale: 'en' });

      expect(result.otpSent).toBe(true);
      expect(result.channel).toBe('SMS');
      expect(result.expiresIn).toBe(300);
      expect(result._dev_otp).toMatch(/^\d{6}$/);
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(profileRepo.save).toHaveBeenCalledTimes(1);
      expect(otpRepo.save).toHaveBeenCalledTimes(1);
    });

    it('uses EMAIL channel when only email provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => u as UserEntity);
      profileRepo.save.mockImplementation(async (p) => p as PassengerProfileEntity);
      otpRepo.save.mockImplementation(async (o) => o as OtpCodeEntity);

      const result = await service.register({ email: 'user@example.com', locale: 'en' });

      expect(result.channel).toBe('EMAIL');
    });

    it('rejects when neither phone nor email provided', async () => {
      await expect(service.register({ locale: 'en' })).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate phone', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      await expect(service.register({ phone: '+94771234567', locale: 'en' })).rejects.toThrow(ConflictException);
    });

    it('rejects duplicate email', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ email: 'dup@example.com' }));
      await expect(service.register({ email: 'dup@example.com', locale: 'en' })).rejects.toThrow(ConflictException);
    });

    it('does NOT expose OTP in production', async () => {
      process.env['NODE_ENV'] = 'production';
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => u as UserEntity);
      profileRepo.save.mockImplementation(async (p) => p as PassengerProfileEntity);
      otpRepo.save.mockImplementation(async (o) => o as OtpCodeEntity);

      const result = await service.register({ phone: '+94771234567', locale: 'en' });
      expect(result._dev_otp).toBeUndefined();
      expect(notifications.sendSms).toHaveBeenCalledWith(
        '+94771234567',
        expect.stringContaining('verification code'),
      );
    });
  });

  // ── verifyOtp ─────────────────────────────────────────────────────────────

  describe('verifyOtp()', () => {
    it('issues tokens and marks OTP used when code is correct', async () => {
      const plainOtp = '482910';
      const hash = await bcrypt.hash(plainOtp, 10);
      const otp = makeOtp({ codeHash: hash, channel: 'SMS' });
      const user = makeUser({ status: UserStatus.PENDING_VERIFICATION });

      otpRepo.findOne.mockResolvedValue(otp);
      userRepo.findOneOrFail.mockResolvedValue(user);
      userRepo.save.mockImplementation(async (u) => u as UserEntity);
      otpRepo.save.mockImplementation(async (o) => o as OtpCodeEntity);
      refreshRepo.save.mockImplementation(async (r) => r as RefreshTokenEntity);

      const res = mockResponse();
      const result = await service.verifyOtp('user-uuid-1', plainOtp, 'REGISTER', res as never);

      expect(result.accessToken).toBe('mock.access.token');
      expect(result.tokenType).toBe('Bearer');
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.phoneVerified).toBe(true);
      expect(otp.usedAt).toBeDefined();
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('rejects an already-used OTP', async () => {
      const otp = makeOtp({ usedAt: new Date() });
      otpRepo.findOne.mockResolvedValue(otp);

      await expect(
        service.verifyOtp('user-uuid-1', '123456', 'REGISTER', mockResponse() as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired OTP', async () => {
      const otp = makeOtp({ expiresAt: new Date(Date.now() - 1000) });
      otpRepo.findOne.mockResolvedValue(otp);

      await expect(
        service.verifyOtp('user-uuid-1', '123456', 'REGISTER', mockResponse() as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when OTP record not found', async () => {
      otpRepo.findOne.mockResolvedValue(null);
      await expect(
        service.verifyOtp('user-uuid-1', '123456', 'REGISTER', mockResponse() as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects wrong OTP digits', async () => {
      const hash = await bcrypt.hash('482910', 10);
      const otp = makeOtp({ codeHash: hash });
      otpRepo.findOne.mockResolvedValue(otp);

      await expect(
        service.verifyOtp('user-uuid-1', '000000', 'REGISTER', mockResponse() as never),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns OTP challenge when credentials are correct', async () => {
      const passwordHash = await bcrypt.hash('SecurePass1!', 12);
      const user = makeUser({ status: UserStatus.ACTIVE, passwordHash });

      userRepo.findOne.mockResolvedValue(user);
      otpRepo.save.mockImplementation(async (o) => o as OtpCodeEntity);

      const result = await service.login('+94771234567', 'SecurePass1!');

      expect(result.requiresOtp).toBe(true);
      expect(result.userId).toBe('user-uuid-1');
      expect(result._dev_otp).toMatch(/^\d{6}$/);
    });

    it('rejects wrong password', async () => {
      const passwordHash = await bcrypt.hash('SecurePass1!', 12);
      const user = makeUser({ passwordHash });
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.login('+94771234567', 'WrongPassword!')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects suspended account', async () => {
      const passwordHash = await bcrypt.hash('SecurePass1!', 12);
      const user = makeUser({ status: UserStatus.SUSPENDED, passwordHash });
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.login('+94771234567', 'SecurePass1!')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects unknown identifier', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.login('unknown@example.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('issues new tokens and revokes old refresh token', async () => {
      const user = makeUser({ status: UserStatus.ACTIVE });
      const record = {
        tokenHash: 'hashedToken',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10_000),
        user,
      };

      refreshRepo.findOne.mockResolvedValue(record as unknown as RefreshTokenEntity);
      refreshRepo.save.mockImplementation(async (r) => r as RefreshTokenEntity);
      userRepo.save.mockImplementation(async (u) => u as UserEntity);

      const res = mockResponse();
      const result = await service.refresh('raw-token-value', res as never);

      expect(result.accessToken).toBe('mock.access.token');
      expect(record.revokedAt).toBeDefined();
    });

    it('rejects when refresh token is revoked', async () => {
      const record = {
        tokenHash: 'hash',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10_000),
        user: makeUser(),
      };
      refreshRepo.findOne.mockResolvedValue(record as unknown as RefreshTokenEntity);

      await expect(service.refresh('raw-token', mockResponse() as never)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when refresh token is expired', async () => {
      const record = {
        tokenHash: 'hash',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: makeUser(),
      };
      refreshRepo.findOne.mockResolvedValue(record as unknown as RefreshTokenEntity);

      await expect(service.refresh('raw-token', mockResponse() as never)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects empty token string', async () => {
      await expect(service.refresh('', mockResponse() as never)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('revokes the refresh token and clears cookie', async () => {
      refreshRepo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      const res = mockResponse();

      await service.logout('user-uuid-1', 'raw-token', res as never);

      expect(refreshRepo.update).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    });

    it('still clears cookie even when no token provided', async () => {
      const res = mockResponse();
      await service.logout('user-uuid-1', '', res as never);
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(refreshRepo.update).not.toHaveBeenCalled();
    });
  });
});
