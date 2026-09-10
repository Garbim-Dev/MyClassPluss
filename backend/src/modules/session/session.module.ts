import { Module } from '@nestjs/common';
import { SessionGateway } from './session.gateway';

@Module({
  providers: [SessionGateway],
  exports: [SessionGateway],
})
export class SessionModule {}