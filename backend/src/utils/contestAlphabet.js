const crypto = require('crypto');

// 32-character unambiguous alphabet (excludes 0, O, 1, I)
const CONTEST_JOIN_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const JOIN_CODE_LENGTH = 8;

/**
 * Generate cryptographically secure random join code for private contests
 */
function generateJoinCode() {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    const idx = crypto.randomInt(0, CONTEST_JOIN_CODE_ALPHABET.length);
    code += CONTEST_JOIN_CODE_ALPHABET[idx];
  }
  return code;
}

module.exports = {
  CONTEST_JOIN_CODE_ALPHABET,
  generateJoinCode,
};
