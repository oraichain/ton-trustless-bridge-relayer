import { GasPrice } from '@cosmjs/stargate';

export interface Config {
  port: number;
  ton: {
    mnemonic: string;
  };
  cosmwasm: {
    chainId: string;
    mnemonic: string;
  };
  redis: {
    user: string;
    password: string;
    host: string;
    port: number;
  };
}

export interface Network {
  chainId: string;
  rpcEndpoint: string;
  prefix: string | null;
  gasPrice: GasPrice | null;
  feeToken: string | null;
  faucetUrl: string | null;
}
