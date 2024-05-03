import 'dotenv/config';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { TonClient, WalletContractV4 } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';

const endpoint = await getHttpEndpoint({ network: 'testnet' });

const client = new TonClient({
  endpoint,
});

// Convert mnemonics to private key
let mnemonics = process.env.MNEMONIC.split(' ');
let keyPair = await mnemonicToWalletKey(mnemonics);

// Create wallet contract
let workchain = 0; // Usually you need a workchain 0
let wallet = WalletContractV4.create({
  workchain,
  publicKey: keyPair.publicKey,
});
let contract = client.open(wallet);

const balance = await contract.getBalance();
console.log(balance, contract.address);
