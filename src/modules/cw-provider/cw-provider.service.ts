import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { SyncData, SyncDataOptions } from '@oraichain/cosmos-rpc-sync';
import {
  DirectSecp256k1HdWallet,
  makeCosmoshubPath,
} from '@cosmjs/proto-signing';
import { Network } from 'src/interfaces/index.js';
import { OraichainConfig } from '../config/network.js';

export class CwClient {
  public client: SigningCosmWasmClient;
  public clientAddress: string;
  public syncData: SyncData;

  constructor(
    client: SigningCosmWasmClient,
    clientAddress: string,
    syncData: SyncData,
  ) {
    this.client = client;
    this.clientAddress = clientAddress;
    this.syncData = syncData;
  }
}

export const CwClientProvider = {
  provide: 'ASYNC_CLIENT',
  useFactory: async (configService: ConfigService) => {
    const mnemonic = getMnemonic(configService);
    const oraichainConfig = OraichainConfig;
    const { client, address } = await connect(mnemonic, oraichainConfig);
    try {
      const currentHeight = await client.getHeight();
      const option: SyncDataOptions = {
        queryTags: [
          {
            key: 'wasm._contract_address',
            value:
              'orai195269awwnt5m6c843q6w7hp8rt0k7syfu9de4h0wz384slshuzps8y7ccm',
          },
        ],
        rpcUrl: oraichainConfig.rpcEndpoint,
        offset: currentHeight - 86400,
      };

      const syncData = new SyncData(option);
      await syncData.start();
      const oraiClientProvider = new CwClient(client, address, syncData);
      return oraiClientProvider;
    } catch (error) {
      console.log(error);
    }
  },
  inject: [ConfigService],
};

@Injectable()
export class CwProviderService {
  constructor(
    private configService: ConfigService,
    @Inject('ASYNC_CLIENT') private workerClient: CwClient,
  ) {
    console.log(this.configService);
    console.log(this.workerClient.clientAddress);
  }

  public sayHello() {
    console.log('Hello world');
  }
}

/**
 *
 * @param mnemonic
 * @param network
 * @returns
 */
export async function connect(mnemonic: string, network: Network) {
  const { prefix, gasPrice, rpcEndpoint } = network;
  const hdPath = makeCosmoshubPath(0);

  // Setup signer
  const offlineSigner = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix,
    hdPaths: [hdPath],
  });

  const { address } = (await offlineSigner.getAccounts())[0];
  // console.log(`Connected to ${address}`);

  // Init SigningCosmWasmClient client
  const client = await SigningCosmWasmClient.connectWithSigner(
    rpcEndpoint,
    offlineSigner as any,
    {
      gasPrice,
    },
  );
  // const balance = await client.getBalance(address, feeToken);
  // console.log(`Balance: ${balance.amount} ${balance.denom}`);

  const chainId = await client.getChainId();

  if (chainId !== network.chainId) {
    throw Error("Given ChainId doesn't match the clients ChainID!");
  }

  return { client, address };
}

export function getMnemonic(configService: ConfigService): string {
  const mnemonic = configService.get('cosmwasm.mnemonic');
  // console.log(mnemonic);
  if (!mnemonic || mnemonic.length < 48) {
    throw new Error('Must set MNEMONIC to a 12 word phrase');
  }
  return mnemonic;
}
