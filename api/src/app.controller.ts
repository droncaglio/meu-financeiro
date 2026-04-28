import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class AppController {
  @Public()
  @Get()
  health(): { status: string } {
    return { status: 'ok' };
  }
}
