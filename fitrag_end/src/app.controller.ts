import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      service: 'fitrag_end',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
