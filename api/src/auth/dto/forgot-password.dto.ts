import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'daniel@empresa.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string;
}
