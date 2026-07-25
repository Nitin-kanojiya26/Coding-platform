// backend/src/utils/languageMap.js

// Maps the string ids used in the frontend (LANGUAGES array in ProblemDetail.jsx)
// to the numeric language_id values Judge0 requires.
//
// ⚠️ IMPORTANT: these numeric IDs must match what YOUR Judge0 instance actually
// has installed. Confirm by hitting:
//   GET {JUDGE0_API_URL}/languages
// on your instance and cross-referencing the "id" + "name" fields.
// The values below are correct for the public Judge0 CE API as of writing,
// but self-hosted instances can differ (missing images, different versions).

const JUDGE0_LANGUAGE_MAP = {
  cpp: 54,        // C++ (GCC 9.2.0) - swap to your GCC 14 image's id if different
  java: 62,        // Java (OpenJDK 13.0.1) - swap to your OpenJDK 21 image's id if different
  python: 71,      // Python (3.8.1)
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  c: 50,           // C (GCC 9.2.0)
};

function toJudge0LanguageId(langKey) {
  const id = JUDGE0_LANGUAGE_MAP[langKey];
  if (!id) return null;
  return id;
}

module.exports = { JUDGE0_LANGUAGE_MAP, toJudge0LanguageId };