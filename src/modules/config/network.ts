import { Network } from '../../interfaces/index.js';
import { GasPrice } from '@cosmjs/stargate';

export const OraichainConfig: Network = {
  chainId: 'Oraichain',
  rpcEndpoint: 'https://rpc.orai.io',
  prefix: 'orai',
  gasPrice: GasPrice.fromString('0.002orai'),
  feeToken: 'orai',
  faucetUrl: 'https://faucet.orai.io/',
};
