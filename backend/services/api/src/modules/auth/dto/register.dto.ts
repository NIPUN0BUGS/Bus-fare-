import { IsEmail, IsOptional, IsString, MinLength, Matches, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiPropertyOptional({ example: '+94771234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'Phone must be in international format: +94XXXXXXXXX' })
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ enum: ['en', 'si', 'ta'], default: 'en' })
  @IsIn(['en', 'si', 'ta'])
  locale: 'en' | 'si' | 'ta' = 'en';
}
