#!/usr/bin/env node

// This code is a script for starting a server that acts as a proxy for an Ethereum JSON-RPC API, 
// using the startServer function from the @lightclients/patronum package. 
// The script uses command line arguments passed in to the program to determine certain options, 
// such as the network and client type to use.

import * as dotenv from 'dotenv';
dotenv.config();

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startServer } from '@lightclients/patronum';
import { ClientManager } from './client-manager.js';
import { ClientType } from '../constants.js';
import {
  defaultBeaconAPIURL,
  defaultProvers,
  defaultPublicRPC,
} from './constants.js';

const getDefaultRPC = (network: number): string => {
  const rpc = defaultPublicRPC[network];
  return rpc[Math.floor(Math.random() * rpc.length)];
};

async function main() {
  try {
    const argv = await yargs(hideBin(process.argv))
      .option('network', {
        alias: 'n',
        choices: [1, 5],
        description: 'chain id to start the proxy on (1, 5)',
      })
      .option('client', {
        alias: 'c',
        choices: ['light', 'optimistic'],
        description: 'type of the client',
      })
      .option('provers', {
        alias: 'o',
        description: 'comma separated prover urls',
      })
      .option('rpc', {
        alias: 'u',
        description: 'rpc url to proxy',
      })
      .option('port', {
        alias: 'p',
        type: 'number',
        description: 'port to start the proxy',
      })
      .option('beacon-api', {
        alias: 'a',
        description: 'beacon chain api URL',
      })
      .parse();

    const network = argv.network || parseInt(process.env.CHAIN_ID || '1');
    const port = argv.port || (network === 5 ? 8547 : 8546);
    const clientType =
      argv.client === 'light' ? ClientType.light : ClientType.optimistic;
    const proverURLs = defaultProvers[clientType][network].concat(
      argv.provers ? (argv.provers as string).split(',') : [],
    );
    const beaconAPIURL =
      (argv['beacon-api'] as string) || defaultBeaconAPIURL[network];
    const providerURL = (argv.rpc as string) || getDefaultRPC(network);

    const cm = new ClientManager(
      network,
      clientType,
      beaconAPIURL,
      providerURL,
      proverURLs,
    );
    // 3. THIRD STEP IN LOOP, RECALL SYNC
    const provider = await cm.sync();
    await startServer(provider, port);
  } catch (err) {
    console.error(err);
  }
}

main();

