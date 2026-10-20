

const JUDGE0_LANGUAGE_MAP = {
  cpp: 54,        // C++ (GCC 9.2.0) - swap to your GCC 14 image's id if different
  java: 62,        // Java (OpenJDK 13.0.1) - swap to your OpenJDK 21 image's id if different
  python: 71,      // Python (3.8.1)
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  c: 50,           // C (GCC 9.2.0)
  assembly: 45,    // Assembly (NASM 2.14.02)
  cobol: 77,       // COBOL (GnuCOBOL 3.0.0)
};

function toJudge0LanguageId(langKey) {
  const id = JUDGE0_LANGUAGE_MAP[langKey];
  if (!id) return null;
  return id;
}

module.exports = { JUDGE0_LANGUAGE_MAP, toJudge0LanguageId };