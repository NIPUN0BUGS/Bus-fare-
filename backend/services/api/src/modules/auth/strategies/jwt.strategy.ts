import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { UserStatus } from '@buslanka/shared-types';
import { UserEntity } from '../entities/user.entity';

interface JwtPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {
    const publicPath = resolve(process.cwd(), config.get<string>('JWT_PUBLIC_KEY_PATH', './secrets/jwt-public.pem'));
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: readFileSync(publicPath, 'utf8'),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Account is inactive.');
    }
    return user;
  }
}
