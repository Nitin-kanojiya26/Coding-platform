const Problem = require('../models/Problem');
const judge0Service = require('../services/judge0Service');
const languageMap = require('../utils/languageMap');

// ─── Helper functions ──────────────────────────────────────────
const createSlug = (value) => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.toString().trim().toLowerCase()).filter(Boolean);
  }
  return tags
    .toString()
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
};

const escapeRegex = (value) => {
  return value.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const buildProblemQuery = (query) => {
  const filter = {};
  if (query.difficulty) {
    filter.difficulty = new RegExp(`^${escapeRegex(query.difficulty.trim())}$`, 'i');
  }
  const tags = normalizeTags(query.tags);
  if (tags.length > 0) {
    filter.tags = { $all: tags };
  }
  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex }
    ];
  }
  return filter;
};

// Map fallback names in case languageMap uses different key formatting
const getLanguageId = (lang) => {
  if (!lang) return null;
  
  // If already a valid numeric ID passed from frontend
  if (typeof lang === 'number' || !isNaN(Number(lang))) {
    return Number(lang);
  }

  const normalized = lang.toString().toLowerCase().trim();

  // Try direct lookup from user's languageMap module
  if (languageMap[normalized]) {
    return languageMap[normalized];
  }

  // Common fallbacks for Judge0 CE IDs
  const fallbackMap = {
    'cpp': 54,        // C++ (GCC 9.2.0)
    'c_cpp': 54,
    'c++': 54,
    'python': 71,     // Python (3.8.1)
    'py': 71,
    'python3': 71,
    'java': 62,       // Java (OpenJDK 13.0.1)
    'javascript': 63, // JavaScript (Node.js 12.14.0)
    'js': 63,
    'c': 50          // C (GCC 9.2.0)
  };

  return fallbackMap[normalized] || null;
};

// ─── CRUD Operations ────────────────────────────────────────────
exports.createProblem = async (req, res) => {
  try {
    const problemData = {
      ...req.body,
      slug: req.body.slug ? createSlug(req.body.slug) : createSlug(req.body.title || ''),
      tags: normalizeTags(req.body.tags),
      createdBy: req.user._id
    };

    if (problemData.sampleTestCases) {
      problemData.sampleTestCases = problemData.sampleTestCases.map(tc => ({
        ...tc,
        displayInput: tc.displayInput || tc.input,
      }));
    }
    if (problemData.hiddenTestCases) {
      problemData.hiddenTestCases = problemData.hiddenTestCases.map(tc => ({
        ...tc,
        displayInput: tc.displayInput || tc.input,
      }));
    }

    const problem = await Problem.create(problemData);
    const responseProblem = problem.toObject();
    delete responseProblem.hiddenTestCases;

    res.status(201).json({
      status: 'success',
      problem: responseProblem
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Problem slug already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getAllProblems = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const filter = buildProblemQuery(req.query);

    const [problems, total] = await Promise.all([
      Problem.find(filter)
        .select('-hiddenTestCases')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email role'),
      Problem.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: problems.length,
      problems
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProblemBySlug = async (req, res) => {
  try {
    const problem = await Problem.findOne({ slug: req.params.slug.toLowerCase() })
      .select('-hiddenTestCases')
      .populate('createdBy', 'name email role');

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    res.status(200).json({
      status: 'success',
      problem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProblem = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.title) {
      updates.slug = createSlug(updates.title);
    }
    if (updates.tags) {
      updates.tags = normalizeTags(updates.tags);
    }

    if (updates.sampleTestCases) {
      updates.sampleTestCases = updates.sampleTestCases.map(tc => ({
        ...tc,
        displayInput: tc.displayInput || tc.input,
      }));
    }
    if (updates.hiddenTestCases) {
      updates.hiddenTestCases = updates.hiddenTestCases.map(tc => ({
        ...tc,
        displayInput: tc.displayInput || tc.input,
      }));
    }

    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-hiddenTestCases');

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    res.status(200).json({
      status: 'success',
      problem
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Problem slug already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    res.status(200).json({
      status: 'success',
      message: 'Problem deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .select('+hiddenTestCases')
      .populate('createdBy', 'name email role');

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    res.status(200).json({
      status: 'success',
      problem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Comments ────────────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const problemId = req.params.id;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    problem.comments.push({
      user: req.user._id,
      text: text.trim(),
    });

    await problem.save();
    await problem.populate('comments.user', 'name avatar');

    const newComment = problem.comments[problem.comments.length - 1];

    res.status(201).json({
      status: 'success',
      comment: newComment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const problemId = req.params.id;
    const problem = await Problem.findById(problemId)
      .select('comments')
      .populate('comments.user', 'name avatar');

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const comments = problem.comments.sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).json({
      status: 'success',
      count: comments.length,
      comments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Run Code (Sandbox) ────────────────────────────────────────
exports.runSampleTestCases = async (req, res) => {
  try {
    const { id } = req.params;
    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({ message: 'Please provide language and code' });
    }

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    if (!problem.sampleTestCases || problem.sampleTestCases.length === 0) {
      return res.status(400).json({ message: 'This problem has no sample test cases to run' });
    }

    // Resolve exact Judge0 language_id
    const languageId = getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({ 
        message: `Unsupported or unmapped language: '${language}'. Please send a valid language string or Judge0 language_id.` 
      });
    }

    console.log(`📥 Processing execution for lang '${language}' (Judge0 ID: ${languageId})`);

    // ✅ Execute via Judge0 Service
    let executionResult;
    try {
      executionResult = await judge0Service.runTestCasesDetailed(
        code,
        languageId,
        problem.sampleTestCases,
        2000
      );
    } catch (serviceError) {
      console.error('❌ Judge0 service error:', serviceError.message);
      return res.status(500).json({ message: 'Code execution failed: ' + serviceError.message });
    }

    // ✅ Guard against undefined or broken service return
    if (!executionResult || !executionResult.results) {
      console.error('❌ Judge0 returned invalid response:', executionResult);
      return res.status(500).json({ message: 'Invalid response from execution engine' });
    }

    // Destructure response from service
    const { status: overallStatus, passed, total, results } = executionResult;

    res.status(200).json({
      status: 'success',
      overallStatus,
      passed,
      total,
      results: results.map((r) => ({
        input: r.input,
        expectedOutput: r.expectedOutput,
        actualOutput: r.actualOutput || '',
        stderr: r.stderr || r.compile_output || '', // Captures compiler output on CE
        passed: r.status === 'accepted',
        status: r.status,
        runtime: r.runtime,
        memory: r.memory,
      })),
    });
  } catch (error) {
    console.error('🔥 Run error:', error.message);
    res.status(500).json({ message: error.message });
  }
};