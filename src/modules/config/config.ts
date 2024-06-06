import { Config } from '../../interfaces/index.js';

export const config = (): Config => ({
  port: parseInt(process.env.PORT, 10) || 8080,
  ton: {
    mnemonic: process.env.TON_MNEMONIC || '',
  },
  cosmwasm: {
    mnemonic: process.env.CW_MNEMONIC || '',
    chainId: process.env.CW_CHAIN_ID || '',
  },
  redis: {
    user: process.env.REDIS_USER || 'default',
    password: process.env.REDIS_PASSWORD || '',
    host: process.env.REDIS_HOST || 'localhost',
    port:
      process.env.REDIS_PORT !== undefined
        ? parseInt(process.env.REDIS_PORT)
        : 6379,
  },
});
