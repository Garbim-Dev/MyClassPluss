import { Module } from '@nestjs/common';
import { SessionGateway } from './session.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SessionGateway],
  exports: [SessionGateway], // ⚡ ESSENCIAL: Permite que outros módulos usem o SessionGateway
})
export class SessionModule {}