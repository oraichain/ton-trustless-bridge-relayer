import { Controller } from '@nestjs/common';
import { CwProviderService } from './cw-provider.service.js';

@Controller('cw-provider')
export class CwProviderController {
  constructor(private readonly _: CwProviderService) {}
}
