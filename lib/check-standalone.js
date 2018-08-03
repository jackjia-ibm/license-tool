/**
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v2.0 which accompanies this
 * distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const readFile = util.promisify(fs.readFile);
const fsStat = util.promisify(fs.stat);
const copyFile = util.promisify(fs.copyFile);

/**
 * Get file/folder stat
 *
 * @param  {String} file file or folder path
 * @return {Object}      file system stat object
 */
const getFsStat = async(file) => {
  let st;

  try {
    st = await fsStat(file);
  } catch (e) {
    throw new Error(`"${file}" doesn't exist`);
  }

  return st;
};

const STANDALONE_LICENSES = ['LICENSE', 'LICENSE.txt'];

/**
 * Check/fix standalone license
 *
 * @param  {Object} logger      logger object
 * @param  {String} folder      directory to check
 * @param  {String} licenseFile standalone license file
 * @param  {Boolean} fix        if fix the errors
 * @return {Boolean}
 */
const checkStandaloneLicense = async(logger, folder, licenseFile, fix) => {
  let folderStat, licenseStat, requireFix = false;

  logger.info(`> validating "${folder}" for standalone license "${licenseFile}" ...`);

  folderStat = await getFsStat(folder);
  if (!folderStat.isDirectory()) {
    logger.warn(`"${folder}" is not a directory, skipped`);
    return true;
  }

  // verify license file
  licenseStat = await getFsStat(licenseFile);
  if (!licenseStat.isFile()) {
    throw new Error(`"${licenseFile}" is not a valid file`);
  }
  // read license file
  const licenseText = await readFile(licenseFile);

  let existed;
  for (let f of STANDALONE_LICENSES) {
    let st;

    try {
      let ff =path.join(folder, f);
      logger.debug(`- checking ${ff} ...`);
      st = await getFsStat(ff);
    } catch (e) {
      // ignore error
    }

    if (st && st.isFile()) {
      existed = f;
      break;
    }
  }

  if (!existed) {
    logger.error('No standalone license file found, should be fixed.');
    requireFix = true;
  } else {
    logger.info(`found "${existed}"`);

    // read existing license file
    const existedText = await readFile(existed);
    // calculate existing license file hash
    const existedMd5 = crypto.createHash('md5').update(existedText).digest('hex');
    logger.debug(`existed license file MD5 hash is: ${existedMd5}`);

    // calculate expected license file hash
    const licenseMd5 = crypto.createHash('md5').update(licenseText).digest('hex');
    logger.debug(`expected license file MD5 hash is: ${licenseMd5}`);

    if (licenseMd5 !== existedMd5) {
      logger.error('license is match, should be fixed');
      requireFix = true;
    } else {
      logger.info('license file match');
    }
  }

  if (!requireFix) {
    logger.info('check standalone license done, nothing to fix');
    return true;
  }

  if (!fix) {
    return false;
  }

  // we need to fix the license file
  existed = path.join(folder, STANDALONE_LICENSES[0]);
  await copyFile(licenseFile, existed);
  logger.info(`"${existed}" license file created`);
};

module.exports = {
  checkStandaloneLicense,
};
