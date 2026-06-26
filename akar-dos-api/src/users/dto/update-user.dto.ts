import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserStatus, VehicleType } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  teamLeaderId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}
