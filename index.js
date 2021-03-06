/**
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v2.0 which accompanies this
 * distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 */

const { checkStandaloneLicense } = require('./lib/check-standalone');
const { checkHeaderLicense } = require('./lib/check-header');
const Comment = require('./lib/comment');

module.exports = {
  checkStandaloneLicense,
  checkHeaderLicense,
  Comment,
};
