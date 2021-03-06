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
const _glob = require('glob');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const glob = util.promisify(_glob);

const { getFsStat } = require('./common');
const Comment = require('./comment');

const FILE_TYPES = {
  javascript: {
    extension: ['js'],
    lineComment: ['//'],
    blockComment: [
      { start: '/*', end: '*/', ignore: '*', writeStart: '/**', writeEnd: ' */', writeLine: ' *', },
    ],
  },
  typescript: {
    extension: ['ts'],
    lineComment: ['//'],
    blockComment: [
      { start: '/*', end: '*/', ignore: '*', writeStart: '/**', writeEnd: ' */', writeLine: ' *', },
    ],
  },
  java: {
    extension: ['java', 'groovy'],
    filename: ['jenkinsfile'],
    lineComment: ['//'],
    blockComment: [
      { start: '/*', end: '*/', ignore: '*', writeStart: '/**', writeEnd: ' */', writeLine: ' *', },
    ],
  },
  shell: {
    extension: ['sh'],
    lineComment: ['#'],
    blockComment: [],
  },
  python: {
    extension: ['py'],
    lineComment: ['#'],
    blockComment: [],
  },
  css: {
    extension: ['css', 'less', 'sass'],
    lineComment: [],
    blockComment: [
      { start: '/*', end: '*/', ignore: '*', writeStart: '/**', writeEnd: ' */', writeLine: ' *', },
    ],
  },
  html: {
    extension: ['html', 'htm'],
    lineComment: [],
    blockComment: [
      { start: '<!--', end: '-->', writeLine: ' ', },
    ],
  },
};

/**
 * Check/fix header license of a file
 *
 * @param  {Object} logger      logger object
 * @param  {String} file        file name
 * @param  {String} licenseText header license text
 * @param  {Boolean} fix        if fix the errors
 * @param  {Object} options     options object
 *                              - yearStart: should use this start year
 * @return {Boolean}
 */
const checkFileLicense = async (logger, file, licenseText, fix, options) => {
  let requireFix = false;
  // read file
  const text = String(await readFile(file));

  // find comment pattern
  let bn = path.basename(file).toLowerCase();
  let commentDefinition;
  for (let ft in FILE_TYPES) {
    let def = FILE_TYPES[ft];

    if (def.extension) {
      for (let ext of def.extension) {
        if (bn.endsWith(`.${ext}`)) {
          commentDefinition = def;
          break;
        }
      }
    }
    if (!commentDefinition && def.filename) {
      for (let fn of def.filename) {
        if (bn === fn) {
          commentDefinition = def;
          break;
        }
      }
    }
  }

  if (!commentDefinition) {
    throw new Error(`Cannot find comment pattern for "${file}"`);
  }

  // find all comments of the file
  logger.debug('  using pattern: %j', commentDefinition);
  let fileParseResult = await Comment.parse(text, commentDefinition);

  if (options && options.yearStart) {
    fileParseResult.yearStart = options.yearStart;
  }

  // find if there are matching license comments
  let matched = Comment.hasExpectedLicense(fileParseResult, licenseText);
  if (matched) {
    logger.info('  license header matched at line %d ~ %d', matched.startLine, matched.endLine);
    logger.debug('  current license between line %d ~ %d:\n%s', matched.startLine, matched.endLine, matched.comments.join('\n').trim());
  } else {
    logger.error('  license header does not exist or match, should be fixed');
    requireFix = true;
  }

  if (!requireFix) {
    return true;
  }

  let allMatched = Comment.hasLicenseDeclaration(fileParseResult);
  if (allMatched) {
    for (let matched of allMatched) {
      logger.debug('  current license between line %d ~ %d:\n%s', matched.startLine, matched.endLine, matched.comments.join('\n').trim());
      logger.debug('  current license starts at year %d', fileParseResult.yearStart);
    }
  }

  if (!fix) {
    return false;
  }

  // we need to fix the license header
  const fixedText = Comment.fixLicense(fileParseResult, allMatched, licenseText, commentDefinition);
  await writeFile(file, fixedText);
  logger.info(`  "${file}" license header fixed`);

  return true;
};

/**
 * Check/fix header license
 *
 * @param  {Object} logger      logger object
 * @param  {String} folder      directory to check
 * @param  {String} licenseFile header license file
 * @param  {Boolean} fix        if fix the errors
 * @param  {Object} options     options object
 *                              - excludes: extra excluded files/folders
 *                              - years: file start year definition
 * @return {Boolean}
 */
const checkHeaderLicense = async (logger, folder, licenseFile, fix, options) => {
  let folderStat, licenseStat;

  logger.info(`> validating "${folder}" for header license "${licenseFile}" ...`);

  folderStat = await getFsStat(folder);

  // verify license file
  licenseStat = await getFsStat(licenseFile);
  if (!licenseStat.isFile()) {
    throw new Error(`"${licenseFile}" is not a valid file`);
  }
  // read license file
  const licenseText = String(await readFile(licenseFile));

  // fine license start year definition
  let fileStartYears = {},
    fileStartYearsLines = [];
  if (options.years) {
    try {
      let yearsFileStat = await getFsStat(options.years);
      if (yearsFileStat.isFile()) {
        fileStartYearsLines = String(await readFile(options.years)).split(/\r?\n/g);
      } else {
        fileStartYearsLines = options.years.split(/,/g);
      }
    } catch (err) {
      fileStartYearsLines = options.years.split(/,/g);
    }
  }
  for (let ln of fileStartYearsLines) {
    let fileYear = ln.trim().split(/:/);
    if (fileYear.length === 2) {
      fileStartYears[fileYear[0]] = fileYear[1];
    }
  }
  logger.debug('file license start years: %j', fileStartYears);

  // read if there is .gitignore
  let globIgnore = [];
  try {
    const converted = require('gitignore-to-glob')(path.join(folder, '.gitignore'), [folder]);
    for (let one of converted) {
      if (one.substr(0, 5) === '!{.}/') {
        globIgnore.push(one.substr(5));
      } else if (one.substr(0, 4) === '{.}/') {
        // FIXME: glob has issue to ignore pattern with !
        // globIgnore.push('!' + one.substr(4));
      }
    }
  } catch (e) {
    // ignore errors
  }
  // exclude more from command line option
  if (options && options.excludes) {
    options.excludes = options.excludes.split(/;/);
    for (let exclude of options.excludes) {
      exclude = exclude.trim();
      if (exclude) {
        globIgnore.push(exclude);
      }
    }
  }
  logger.debug('glob ignore patterns: %j', globIgnore);

  let allFiles = [];

  if (folderStat.isFile()) {
    allFiles.push(folder);
  } else if (folderStat.isDirectory()) {
    let globPattern = [];

    for (let ft in FILE_TYPES) {
      let def = FILE_TYPES[ft];

      if (def.extension) {
        for (let ext of def.extension) {
          globPattern.push(`**/*.${ext}`);
        }
      }
      if (def.filename) {
        for (let fn of def.filename) {
          globPattern.push(`**/${fn}`);
        }
      }
    }

    logger.info('finding files ...');
    logger.debug('glob patterns: %j', globPattern);

    for (let ptn of globPattern) {
      let files = await glob(ptn, {
        cwd: folder,
        nocase: true,
        matchBase: true,
        ignore: globIgnore,
      });
      allFiles = [...allFiles, ...files];
    }
  }

  logger.info('find %d files', allFiles.length);
  if (allFiles.length > 0) {
    logger.debug('all files: %j', allFiles);
  }

  for (let file of allFiles) {
    logger.info('- processing %s ...', file);
    await checkFileLicense(logger, path.join(folder, file), licenseText, fix, {
      yearStart: fileStartYears[file],
    });
  }
};

module.exports = {
  checkHeaderLicense,
};
