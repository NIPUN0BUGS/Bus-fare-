import { IsString, IsUUID, IsIn, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ description: 'User ID returned from register or login', format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: '6-digit OTP code', example: '482910' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits.' })
  otp: string;

  @ApiProperty({ enum: ['REGISTER', 'LOGIN', 'RESET_PASSWORD'] })
  @IsIn(['REGISTER', 'LOGIN', 'RESET_PASSWORD'])
  purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD';
}
