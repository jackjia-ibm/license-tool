/**
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v2.0 which accompanies this
 * distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 */

const shebangRegex = require('shebang-regex');

const POSSIBLE_LICENSE_MATCHES = [
  /SPDX-License-Identifier:/i,
  /Copyright\s+\(C\)/i,
  /\(C\)\s+Copyright/i,
  /©\s+Copyright/i,
  /All\s+rights\s+reserved/i,
  /under\s+the\+term\+of/i,
  /THE\s+SOFTWARE\s+IS\s+PROVIDED/i,
  /Permission\s+to\s+use/i,
];
const POSSIBLE_LICENSE_YEAR = [
  /Copyright.+((?:1|2)\d{3})/i,
];
const MACRO_LICENSE_YEAR = '{years}';

/**
 * Parse source code to find all comments
 *
 * FIXME: Known Issues:
 * - multiple line string may confuse the parse
 * - will ignore line comment follow after code statement
 *
 * @param  {String} text               source code text
 * @param  {Object} commentDefinition  comment definition object
 * @return {Array}
 */
const parse = (text, commentDefinition) => {
  let comments = [];
  const lineEnding = text.indexOf('\r') > -1 ? '\r\n' : '\n';
  let yearStart;

  let shebang;
  let checkShebang = shebangRegex.exec(text);
  if (checkShebang && checkShebang[0]) {
    shebang = checkShebang[0];
    text = text.substr(shebang.length);
  }

  const sanitizeBlockCommentLine = (line, ignore) => {
    line = line.trim();
    if (ignore) {
      while (line.startsWith(ignore)) {
        line = line.substr(ignore.length).trim();
      }
    }

    return line;
  };
  const isLineComment = (line, lineComment) => {
    let comment = false;

    for (let lc of lineComment) {
      if (line.startsWith(lc)) {
        while (line.startsWith(lc)) {
          line = line.substr(lc.length).trim();
        }
        comment = line;
        break;
      }
    }

    return comment;
  };

  const lines = text.split(/\r?\n/g);
  let commentBlock = {
    comments: [],
    startLine: null,
    endLine: null,
  };
  let blockStarted = false;
  for (let ln in lines) {
    ln = parseInt(ln, 10);
    let line = lines[ln];
    line = line.trim();

    if (!blockStarted && commentDefinition.blockComment) {
      for (let bc of commentDefinition.blockComment) {
        if (line.startsWith(bc.start)) {
          blockStarted = { type: 'block', ...bc };

          line = line.substr(bc.start.length);
          line = sanitizeBlockCommentLine(line, bc.ignore);
          commentBlock.comments.push(line);
          commentBlock.startLine = ln + 1;
          commentBlock.endLine = ln + 1;
          break;
        }
      }
    }

    if (!blockStarted && commentDefinition.lineComment) {
      let comment = isLineComment(line, commentDefinition.lineComment);
      if (comment !== false) {
        blockStarted = { type: 'line', start: commentDefinition.lineComment };
        commentBlock.comments.push(comment);
        commentBlock.startLine = ln + 1;
        commentBlock.endLine = ln + 1;
      }
    }

    if (blockStarted && blockStarted.type === 'block') {
      let blockStartedIgnore = blockStarted.ignore;
      if (line.endsWith(blockStarted.end)) {
        line = line.substr(0, line.length - blockStarted.end.length);
        blockStarted = false;
      }
      line = sanitizeBlockCommentLine(line, blockStartedIgnore);
      commentBlock.comments.push(line);
      commentBlock.endLine = ln + 1;
      if (!blockStarted) {
        comments.push(commentBlock);
        commentBlock = {
          comments: [],
          startLine: null,
          endLine: null,
        };
      }
    }

    if (blockStarted && blockStarted.type === 'line') {
      let comment = isLineComment(line, blockStarted.start);
      if (comment === false) {
        blockStarted = false;
        commentBlock.endLine = ln;
      } else {
        commentBlock.comments.push(comment);
        commentBlock.endLine = ln + 1;
      }

      if (!blockStarted) {
        comments.push(commentBlock);
        commentBlock = {
          comments: [],
          startLine: null,
          endLine: null,
        };
      }
    }
  }

  if (blockStarted && blockStarted.type === 'line') {
    comments.push(commentBlock);
  }

  // check if comments are license
  for (let ci in comments) {
    const sanitizedComments = comments[ci].comments.join(' ').trim();

    for (let re of POSSIBLE_LICENSE_MATCHES) {
      if (re.test(sanitizedComments)) {
        comments[ci].isLicense = true;
        break;
      }
    }

    if (comments[ci].isLicense) {
      // find possible license start year
      for (let line of comments[ci].comments) {
        for (let re of POSSIBLE_LICENSE_YEAR) {
          if (re.test(line)) {
            let years = line.match(/(?:1|2)\d{3}/g);
            if (years) {
              years.sort();
              if (years && years[0]) {
                if (!yearStart || years[0] < yearStart) {
                  yearStart = years[0];
                }
              }
            }

            break;
          }
        }
      }
    }
  }

  return {
    shebang,
    comments,
    lines,
    lineEnding,
    yearStart,
  };
};

/**
 * Check if comments list includes expected license
 *
 * @param  {Object} fileParseResult   parse result returned from "parse" method
 * @param  {String} licenseText       license text
 * @return {null|Object}
 */
const hasExpectedLicense = (fileParseResult, licenseText) => {
  const currentYear = (new Date()).getFullYear().toString();
  let licenseLines = licenseText.split(/\r?\n/g);

  for (let ln in licenseLines) {
    licenseLines[ln] = licenseLines[ln].trim();
  }

  let sanitizedLicenseText = licenseLines.join(' ').trim();
  let yearStart = fileParseResult.yearStart || currentYear;
  // convert license years macro
  if (sanitizedLicenseText.indexOf(MACRO_LICENSE_YEAR) > -1) {
    if (yearStart === currentYear) {
      sanitizedLicenseText = sanitizedLicenseText.replace(MACRO_LICENSE_YEAR, yearStart);
    } else {
      sanitizedLicenseText = sanitizedLicenseText.replace(MACRO_LICENSE_YEAR, `${yearStart}, ${currentYear}`);
    }
  }

  for (let comment of fileParseResult.comments) {
    const sanitizedComments = comment.comments.join(' ').trim();

    if (sanitizedComments === sanitizedLicenseText) {
      return comment;
    }
  }

  return null;
};

/**
 * Check if comments list includes possible license declaration
 *
 * @param  {Object} fileParseResult   parse result returned from "parse" method
 * @return {null|Object}
 */
const hasLicenseDeclaration = (fileParseResult) => {
  let licenses = [];

  for (let comment of fileParseResult.comments) {
    if (comment.isLicense) {
      licenses.push(comment);
    }
  }

  return licenses.length === 0 ? null : licenses;
};

/**
 * Convert raw license text to comments
 *
 * @param  {String} licenseText       license text
 * @param. {Object} commentDefinition comment definition
 * @return {Array}
 */
const convertLicenseToComments = (licenseText, commentDefinition) => {
  let converted = [];

  // find how to add comments
  let writeStart, writeEnd, writeLine;
  if (commentDefinition.blockComment && commentDefinition.blockComment[0]) {
    let bc = commentDefinition.blockComment[0];
    writeStart = bc.writeStart || bc.start;
    writeEnd = bc.writeEnd || bc.end;
    writeLine = bc.writeLine || '';
  } else if (commentDefinition.lineComment && commentDefinition.lineComment[0]) {
    let lc = commentDefinition.lineComment[0];
    writeStart = lc;
    writeEnd = lc;
    writeLine = lc;
  }

  let licenseLines = licenseText.split(/\r?\n/g).join('\n').trim().split(/\r?\n/g);

  if (writeStart) {
    converted.push(writeStart);
  }
  for (let line of licenseLines) {
    line = line.trim();
    if (writeLine) {
      line = writeLine + (line ? ' ' + line : '');
    }
    converted.push(line);
  }
  if (writeEnd) {
    converted.push(writeEnd);
  }

  return converted;
};

/**
 * Fix license header
 *
 * @param  {Object} fileParseResult   parse result returned from "parse" method
 * @param  {Array} removeLicenses     existing license comments should be removed
 * @param  {String} licenseText       license text
 * @param. {Object} commentDefinition comment definition
 * @return {Boolean}
 */
const fixLicense = (fileParseResult, removeLicenses, licenseText, commentDefinition) => {
  let result = [];
  const currentYear = (new Date()).getFullYear().toString();
  let linesWithoutLicenses = [];
  let convertedLicenseComment = convertLicenseToComments(licenseText, commentDefinition);

  if (fileParseResult.shebang) {
    result.push(fileParseResult.shebang);
    result.push('');
  }

  // convert license years macro
  let yearStart = fileParseResult.yearStart || currentYear;
  for (let ci in convertedLicenseComment) {
    if (convertedLicenseComment[ci].indexOf(MACRO_LICENSE_YEAR) > -1) {
      if (yearStart === currentYear) {
        convertedLicenseComment[ci] = convertedLicenseComment[ci].replace(MACRO_LICENSE_YEAR, yearStart);
      } else {
        convertedLicenseComment[ci] = convertedLicenseComment[ci].replace(MACRO_LICENSE_YEAR, `${yearStart}, ${currentYear}`);
      }
    }
  }

  result = [...result, ...convertedLicenseComment];

  if (removeLicenses) {
    // remove license comments lines
    for (let ln in fileParseResult.lines) {
      ln = parseInt(ln, 10);
      let ok = true;
      for (let removeLicense of removeLicenses) {
        if (ln + 1 >= removeLicense.startLine && ln + 1 <= removeLicense.endLine) {
          ok = false;
          break;
        }
      }

      if (ok) {
        linesWithoutLicenses.push(fileParseResult.lines[ln]);
      }
    }
  } else {
    linesWithoutLicenses = fileParseResult.lines;
  }

  // add empty to make it looks nicer
  if (linesWithoutLicenses && linesWithoutLicenses[0] && linesWithoutLicenses[0].trim() !== '') {
    result.push('');
  }

  result = [...result, ...linesWithoutLicenses, ];

  return result.join(fileParseResult.lineEnding);
};

module.exports = {
  parse,
  hasExpectedLicense,
  hasLicenseDeclaration,
  convertLicenseToComments,
  fixLicense,
};
