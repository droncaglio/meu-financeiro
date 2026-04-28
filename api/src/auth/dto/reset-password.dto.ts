import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString({ message: 'Token inválido' })
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString({ message: 'A senha deve ser um texto' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(100, { message: 'A senha deve ter no máximo 100 caracteres' })
  password!: string;
}
