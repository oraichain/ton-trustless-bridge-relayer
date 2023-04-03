import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseTonBlockInfo,
  LiteApiBlockRequest,
  LiteApiBlockResponse,
  Signature,
} from 'src/lib/types';
import {
  base64ToHex,
  formatTonBlock,
  formatTonTransaction,
  sleep,
  tonClientBlockRequestToLiteApiBlockRequest,
} from 'src/lib/utils';
import { TonClient4, TonClient } from 'ton';
import axios from 'axios';
import { parseBlock } from 'src/lib/utils/blockReader';
import createLock from 'src/modules/ton-validator/utils/SimpleLock';
import { TonBlock } from '@prisma/client';

// this.getMasterchainBlockWithShards(8293606)
//   .then((blocks) => {
//     const msBlock = blocks.find((b) => b.workchain === -1);
//     if (!msBlock) {
//       throw Error('no ms block');
//     }
//     return this.getBlockBoc(msBlock).then((data) => {
//       return parseBlock(data);
//     });
//   })
//   .then((data) => {
//     const importantData = {
//       isKeyBlock: data.info.key_block,
//       startLt: new Date(data.info.start_lt.toNumber()),
//       endLt: new Date(data.info.end_lt.toNumber()),
//       prev_keyblock: data.info.prev_key_block_seqno,
//     };
//     console.log(importantData);
//   });
// this.test();

@Injectable()
export class TonApiService {
  private tonClient4 = new TonClient4({
    endpoint: this.configService.get<string>('TON_CLIENT4_ENDPOINT'),
  });

  private tonClient = new TonClient({
    endpoint: this.configService.get<string>('TON_CLIENT_ENDPOINT'),
  });

  private liteApiUrl = this.configService.get<string>('LITE_API_ENDPOINT');
  private toncenterUrl = this.configService.get<string>('TONCENTER_ENDPOINT');

  private toncenterLock = createLock('toncenter');

  constructor(private configService: ConfigService) {}

  // async test() {
  //   let currentKeyBlock = await this.getLastKeyBlock();
  //   let block = await this.getBlockBoc(currentKeyBlock).then(parseBlock);
  //   let date = block.info.end_lt.toNumber();
  //   let configParam15 = block.extra.custom.config.config.map.get('f');
  //   // prev_validators
  //   let configParam32 = block.extra.custom.config.config.map.get('20');
  //   // new_validators
  //   let configParam34 = block.extra.custom.config.config.map.get('22');
  //   let configParam36 = block.extra.custom.config.config.map.get('24');
  //   function prevValidatorsShort(v: any) {
  //     // console.log(v.cur_validators.list.map);
  //     for (const validator of v.prev_validators.list.map.values()) {
  //       console.log(Buffer.from(validator.public_key.pubkey).toString('hex'));
  //       break;
  //     }
  //   }
  //   function validatorsShort(v: any) {
  //     // console.log(v.cur_validators.list.map);
  //     for (const validator of v.cur_validators.list.map.values()) {
  //       console.log(Buffer.from(validator.public_key.pubkey).toString('hex'));
  //       break;
  //     }
  //   }
  //   function nextvalidatorsShort(v: any) {
  //     if (!v) {
  //       console.log('no new validators');
  //       return;
  //     }
  //     // console.log(v.cur_validators.list.map);
  //     for (const validator of v.next_validators.list.map.values()) {
  //       console.log(Buffer.from(validator.public_key.pubkey).toString('hex'));
  //       break;
  //     }
  //   }
  //   // console.log('block rh:', currentKeyBlock.rootHash);
  //   // console.log('time update:', configParam15.validators_elected_for);
  //   console.log('prev validators');
  //   prevValidatorsShort(configParam32);
  //   console.log('curr validators');
  //   validatorsShort(configParam34);
  //   console.log('next validators');
  //   nextvalidatorsShort(configParam36);
  //   // console.log({
  //   //   hash: currentKeyBlock.rootHash,
  //   //   date: new Date(date),
  //   // });
  //   console.log(configParam36);
  //   for (let i = 0; i < 30; i++) {
  //     currentKeyBlock = await this.getPreviousKeyBlock(currentKeyBlock);
  //     block = await this.getBlockBoc(currentKeyBlock).then(parseBlock);
  //     const newDate = block.info.end_lt.toNumber();
  //     const diffMs = date - newDate;
  //     const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
  //     const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
  //     date = newDate;
  //     console.log({
  //       // hash: currentKeyBlock.rootHash,
  //       // date: new Date(date),
  //       diff: diffHrs,
  //       diffMins,
  //     });
  //     configParam15 = block.extra.custom.config.config.map.get('f');
  //     configParam32 = block.extra.custom.config.config.map.get('20');
  //     configParam34 = block.extra.custom.config.config.map.get('22');
  //     configParam36 = block.extra.custom.config.config.map.get('24');
  //     // console.log('block rh:', currentKeyBlock.rootHash);
  //     // console.log('time update:', configParam15.validators_elected_for);
  //     console.log('prev validators');
  //     prevValidatorsShort(configParam32);
  //     console.log('curr validators');
  //     validatorsShort(configParam34);
  //     console.log('next validators');
  //     nextvalidatorsShort(configParam36);
  //   }
  // }

  async getLastBlock(): Promise<BaseTonBlockInfo> {
    const { last: lastBlock } = await this.tonClient4.getLastBlock();

    return formatTonBlock(lastBlock);
  }

  async getMasterchainBlockWithShards(seqno: number) {
    const { shards } = await this.tonClient4.getBlock(seqno);

    return shards.map((shard) => ({
      ...formatTonBlock(shard),
      transactions: shard.transactions,
    }));
  }

  async getBlockBoc(
    id: BaseTonBlockInfo,
    retry = 0,
  ): Promise<LiteApiBlockResponse> {
    return axios
      .post<LiteApiBlockResponse>(this.liteApiUrl + 'lite_server_get_block', {
        id: tonClientBlockRequestToLiteApiBlockRequest(id),
      })
      .then((res) => res.data)
      .catch(async (e) => {
        if (retry >= 100) {
          throw e;
        }

        await sleep();
        return this.getBlockBoc(id, retry + 1);
      });
  }

  async getPreviousKeyBlock(
    currentMSblock: BaseTonBlockInfo,
    canReturnCurrent = false,
  ) {
    const block = await this.getBlockBoc(currentMSblock).then(parseBlock);
    if (block.info.key_block && canReturnCurrent) {
      return currentMSblock;
    }
    const previousKeyBlock = (
      await this.getMasterchainBlockWithShards(block.info.prev_key_block_seqno)
    ).find(
      (shard) =>
        shard.workchain === -1 &&
        shard.seqno === block.info.prev_key_block_seqno,
    );

    return previousKeyBlock;
  }

  async getLastKeyBlock() {
    const lastBlock = await this.getLastBlock();
    return this.getPreviousKeyBlock(lastBlock, true);
  }

  async getSignatures(seqno: number) {
    let signaturesRes: Signature[] = [];
    try {
      await this.toncenterLock.acquire();
      await sleep();
      signaturesRes = (
        await axios.get(
          `${this.toncenterUrl}getMasterchainBlockSignatures?seqno=${seqno}`,
        )
      ).data.result.signatures;
    } catch (error) {
      console.error(error.message);
    } finally {
      await this.toncenterLock.release();
    }

    return signaturesRes;
  }

  async getShardProof(block: TonBlock & { mcParent: TonBlock }) {
    let shardProofRes: any;

    try {
      await this.toncenterLock.acquire();
      await sleep();
      shardProofRes = (
        await axios.get(
          this.toncenterUrl +
            `getShardBlockProof?workchain=${block.workchain}&shard=${block.shard}&seqno=${block.seqno}&from_seqno=${block.mcParent.seqno}`,
        )
      ).data.result;
    } catch (error) {
      console.error(error.message);
    } finally {
      await this.toncenterLock.release();
    }

    return shardProofRes;
  }

  async getStateProof(block: TonBlock, nextBlock: TonBlock) {
    let mc_proof: any;

    try {
      await this.toncenterLock.acquire();
      await sleep();
      mc_proof = (
        await axios.get(
          this.toncenterUrl +
            `getShardBlockProof?workchain=${
              nextBlock.workchain
            }&shard=${+nextBlock.shard}&seqno=${nextBlock.seqno}&from_seqno=${
              block.seqno
            }`,
        )
      ).data.result.mc_proof[0];
    } catch (error) {
      console.error(error.message);
    } finally {
      await this.toncenterLock.release();
    }

    return mc_proof;
  }
}
