import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserEntity } from './entities/user.entity';
import { OtpCodeEntity } from './entities/otp-code.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { PassengerProfileEntity } from './entities/passenger-profile.entity';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      OtpCodeEntity,
      RefreshTokenEntity,
      PassengerProfileEntity,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const privatePath = resolve(process.cwd(), config.get<string>('JWT_PRIVATE_KEY_PATH', './secrets/jwt-private.pem'));
        const publicPath  = resolve(process.cwd(), config.get<string>('JWT_PUBLIC_KEY_PATH',  './secrets/jwt-public.pem'));
        return {
          privateKey: readFileSync(privatePath, 'utf8'),
          publicKey:  readFileSync(publicPath,  'utf8'),
          signOptions: {
            algorithm: 'RS256',
            expiresIn: config.get('JWT_ACCESS_EXPIRES_IN', '900'),
          },
        };
      },
      inject: [ConfigService],
    }),
    NotificationModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
