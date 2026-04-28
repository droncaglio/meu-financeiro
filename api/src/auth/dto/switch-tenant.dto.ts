import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchTenantDto {
  @ApiProperty()
  @IsUUID('4', { message: 'tenantId deve ser um UUID válido' })
  tenantId!: string;
}
