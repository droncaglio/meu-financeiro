import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'daniel@empresa.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string;

  @ApiProperty({ example: 'senha@123' })
  @IsString({ message: 'A senha deve ser um texto' })
  password!: string;
}
