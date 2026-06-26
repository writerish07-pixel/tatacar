import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { UserRole, VehicleType } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, { message: 'salesTeamId must be uppercase letters, digits or underscore' })
  @MaxLength(64)
  salesTeamId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  hierarchyLevel?: number;
}
