import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { UserRole, UserStatus, Locale } from '@buslanka/shared-types';
import { UserEntity } from './entities/user.entity';
import { OtpCodeEntity } from './entities/otp-code.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { PassengerProfileEntity } from './entities/passenger-profile.entity';
import { RegisterDto } from './dto/register.dto';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    @InjectRepository(OtpCodeEntity)
    private otpRepo: Repository<OtpCodeEntity>,
    @InjectRepository(RefreshTokenEntity)
    private refreshRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(PassengerProfileEntity)
    private profileRepo: Repository<PassengerProfileEntity>,
    private jwtService: JwtService,
    private config: ConfigService,
    private notifications: NotificationService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('A phone number or email address is required.');
    }

    if (dto.phone) {
      const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
      if (existing) throw new ConflictException('An account with this phone number already exists.');
    }

    if (dto.email) {
      const existing = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existing) throw new ConflictException('An account with this email address already exists.');
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : null;

    const user = this.userRepo.create({
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      passwordHash,
      role: UserRole.PASSENGER,
      status: UserStatus.PENDING_VERIFICATION,
      locale: (dto.locale as Locale) ?? Locale.EN,
    });
    await this.userRepo.save(user);

    await this.profileRepo.save(this.profileRepo.create({ userId: user.id }));

    const otp = await this.generateOtp(user.id, dto.phone ? 'SMS' : 'EMAIL', 'REGISTER');

    if (process.env['NODE_ENV'] === 'production') {
      if (dto.phone) {
        await this.notifications.sendSms(
          dto.phone,
          `Your BusLanka verification code is: ${otp.plain}. Valid for 5 minutes.`,
        );
      } else if (dto.email) {
        await this.notifications.sendEmail(
          dto.email,
          'Verify your BusLanka account',
          `Your verification code is: <strong>${otp.plain}</strong>. Valid for 5 minutes.`,
        );
      }
    }

    const otpValue = process.env['NODE_ENV'] !== 'production' ? otp.plain : undefined;

    return {
      userId: user.id,
      otpSent: true,
      channel: dto.phone ? 'SMS' : 'EMAIL',
      expiresIn: 300,
      ...(otpValue ? { _dev_otp: otpValue } : {}),
    };
  }

  async verifyOtp(userId: string, otp: string, purpose: string, res: Response) {
    const record = await this.otpRepo.findOne({
      where: { userId, purpose: purpose as 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' },
      order: { createdAt: 'DESC' },
    });

    if (!record || record.usedAt) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }
    const valid = await bcrypt.compare(otp, record.codeHash);
    if (!valid) throw new UnauthorizedException('Incorrect OTP.');

    record.usedAt = new Date();
    await this.otpRepo.save(record);

    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    user.status = UserStatus.ACTIVE;
    if (record.channel === 'SMS') user.phoneVerified = true;
    else user.emailVerified = true;
    await this.userRepo.save(user);

    return this.issueTokens(user, res);
  }

  async login(identifier: string, password: string) {
    const user = await this.userRepo.findOne({
      where: [{ phone: identifier }, { email: identifier }],
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials.');

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('This account has been suspended.');
    }

    const otp = await this.generateOtp(
      user.id,
      user.phone ? 'SMS' : 'EMAIL',
      'LOGIN',
    );

    if (process.env['NODE_ENV'] === 'production') {
      if (user.phone) {
        await this.notifications.sendSms(
          user.phone,
          `Your BusLanka login code is: ${otp.plain}. Valid for 5 minutes.`,
        );
      } else if (user.email) {
        await this.notifications.sendEmail(
          user.email,
          'Your BusLanka login code',
          `Your login code is: <strong>${otp.plain}</strong>. Valid for 5 minutes.`,
        );
      }
    }

    const otpValue = process.env['NODE_ENV'] !== 'production' ? otp.plain : undefined;

    return {
      requiresOtp: true,
      userId: user.id,
      channel: user.phone ? 'SMS' : 'EMAIL',
      expiresIn: 300,
      ...(otpValue ? { _dev_otp: otpValue } : {}),
    };
  }

  async refresh(rawToken: string, res: Response) {
    if (!rawToken) throw new UnauthorizedException('No refresh token provided.');

    const tokenHash = this.hashToken(rawToken);
    const record = await this.refreshRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session. Please log in again.');
    }

    record.revokedAt = new Date();
    await this.refreshRepo.save(record);

    return this.issueTokens(record.user, res);
  }

  async logout(userId: string, rawToken: string, res: Response) {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.refreshRepo.update({ tokenHash }, { revokedAt: new Date() });
    }
    res.clearCookie('refresh_token');
  }

  private async issueTokens(user: UserEntity, res: Response) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      role: user.role,
    });

    const rawRefresh = uuidv4();
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() +
      parseInt(this.config.get('JWT_REFRESH_EXPIRES_IN', '604800'), 10),
    );

    await this.refreshRepo.save(
      this.refreshRepo.create({ userId: user.id, tokenHash, expiresAt }),
    );

    res.cookie('refresh_token', rawRefresh, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/v1/auth/refresh',
    });

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: parseInt(this.config.get('JWT_ACCESS_EXPIRES_IN', '900'), 10),
      user: { id: user.id, role: user.role, locale: user.locale },
    };
  }

  private async generateOtp(
    userId: string,
    channel: 'SMS' | 'EMAIL',
    purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD',
  ): Promise<{ plain: string }> {
    const plain = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(plain, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpRepo.save(
      this.otpRepo.create({ userId, channel, codeHash, purpose, expiresAt }),
    );

    return { plain };
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
