#!/usr/bin/env node

/**
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v2.0 which accompanies this
 * distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 */

// load tool version
const pkg = require('./package.json');
const version = pkg && pkg.version;
// load other functions
const { P } = require('./lib/common');
const { checkStandaloneLicense } = require('./lib/check-standalone');

// parse arguments
const yargs = require('yargs');
const argv = yargs
  .version(version)
  .scriptName('license-tool')
  .usage('Usage: $0 [options] <folder|file>')
  .option('L', {
    alias: 'standalone',
    default: 'licenses/standalone.txt',
    description: 'license file stays in root folder',
  })
  .option('H', {
    alias: 'header',
    default: 'licenses/header.txt',
    description: 'license attached to file header',
  })
  .option('f', {
    alias: 'fix',
    default: false,
    description: 'if let the tool fixes the license errors',
    type: 'boolean'
  })
  .option('v', {
    alias: 'verbose',
    default: false,
    description: 'show more processing details',
    type: 'boolean'
  })
  .demandCommand()
  .help()
  .alias('h', 'help')
  .parse();

// init logger
const logger = require('./lib/logger')(argv.verbose ? 'debug' : 'info', 'check.log');
logger.info('=============================================================================================');
logger.debug('argv: %j', argv);

// validate folder argv
const folder = argv && argv._ && argv._[0];
if (!folder) {
  yargs.showHelp();
  process.exit(1);
}

// check started
logger.info('Check licenses for "%s" ...', folder);
logger.info('');
logger.debug('  - options.standalone: %s', argv.standalone);
logger.debug('  - options.header: %s', argv.header);
logger.debug('');

P()
  .then(async() => {
    if (!argv.standalone) {
      logger.debug('skipped standalone license check.');
    }

    await checkStandaloneLicense(logger, folder, argv.standalone, argv.fix);
    logger.info('');
  })
  .then(() => {
    logger.info('done');
    logger.info('');
  })
  .catch((err) => {
    if (err.stack) {
      logger.error('%s', err.stack);
    } else {
      logger.error('%s', err);
    }
    logger.info('');
  });
