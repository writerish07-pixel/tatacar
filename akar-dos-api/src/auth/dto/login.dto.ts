import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId!: string; // salesTeamId, e.g. RECEPTION_01

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
