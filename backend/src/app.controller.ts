import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System')
@Controller({ path: 'health', version: '1' })
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'System health check (Public)' })
  getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      ecosystem: 'TaskFlow Elite',
    };
  }
}
