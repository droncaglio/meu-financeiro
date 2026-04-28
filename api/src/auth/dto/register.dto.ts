import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Daniel' })
  @IsString({ message: 'O nome deve ser um texto' })
  @MaxLength(255, { message: 'O nome deve ter no máximo 255 caracteres' })
  name!: string;

  @ApiProperty({ example: 'daniel@empresa.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string;

  @ApiProperty({ example: 'senha@123', minLength: 8 })
  @IsString({ message: 'A senha deve ser um texto' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(100, { message: 'A senha deve ter no máximo 100 caracteres' })
  password!: string;

  @ApiProperty({ example: 'Minha Empresa Ltda' })
  @IsString({ message: 'O nome da empresa deve ser um texto' })
  @MaxLength(255, {
    message: 'O nome da empresa deve ter no máximo 255 caracteres',
  })
  companyName!: string;
}
