import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CwProviderController } from './cw-provider.controller.js';
import { CwClientProvider, CwProviderService } from './cw-provider.service.js';

@Module({
  imports: [ConfigModule],
  providers: [CwProviderService, CwClientProvider],
  controllers: [CwProviderController],
})
export class CwProviderModule {}
