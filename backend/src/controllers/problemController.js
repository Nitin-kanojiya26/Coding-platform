const Problem = require('../models/Problem');
const jdoodleService = require('../services/jdoodleService'); 
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

// @desc    Create a coding problem
// @route   POST /api/problems
// @access  Admin
exports.createProblem = async (req, res) => {
    try {
        const problemData = {
            ...req.body,
            slug: req.body.slug ? createSlug(req.body.slug) : createSlug(req.body.title || ''),
            tags: normalizeTags(req.body.tags),
            createdBy: req.user._id
        };

        // ✅ Ensure every test case has a displayInput
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

// @desc    Get all problems with pagination, filters, and search
// @route   GET /api/problems
// @access  Public
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

// @desc    Get one problem by slug
// @route   GET /api/problems/:slug
// @access  Public
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
// @desc    Update a problem
// @route   PUT /api/problems/:id
// @access  Admin
exports.updateProblem = async (req, res) => {
    try {
        const updates = { ...req.body };

        if (updates.title) {
            updates.slug = createSlug(updates.title);
        }
        if (updates.tags) {
            updates.tags = normalizeTags(updates.tags);
        }

        // ✅ Ensure displayInput is set for any updated test cases
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
        ).select("-hiddenTestCases");

        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.status(200).json({
            status: "success",
            problem
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Problem slug already exists" });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a problem
// @route   DELETE /api/problems/:id
// @access  Admin
exports.deleteProblem = async (req, res) => {
    try {

        const problem = await Problem.findByIdAndDelete(req.params.id);

        if (!problem) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        res.status(200).json({
            status: "success",
            message: "Problem deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};
// @desc    Get problem by ID
// @route   GET /api/problems/id/:id
// @access  Admin
exports.getProblemById = async (req, res) => {
    try {

        const problem = await Problem.findById(req.params.id)
            .select('+hiddenTestCases') 
            .populate("createdBy", "name email role");

        if (!problem) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        res.status(200).json({
            status: "success",
            problem
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};
// @desc    Post a comment on a problem
// @route   POST /api/problems/:id/comments
// @access  Private
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

    // Push new comment
    problem.comments.push({
      user: req.user._id,
      text: text.trim(),
    });

    // Save the problem
    await problem.save();

    // Populate the user field for all comments (or just the last one)
    await problem.populate('comments.user', 'name avatar');

    // Get the newly added comment (last in array)
    const newComment = problem.comments[problem.comments.length - 1];

    res.status(201).json({
      status: 'success',
      comment: newComment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get all comments for a problem
// @route   GET /api/problems/:id/comments
// @access  Public (or Private if you want)
exports.getComments = async (req, res) => {
  try {
    const problemId = req.params.id;

    const problem = await Problem.findById(problemId)
      .select('comments')
      .populate('comments.user', 'name avatar');

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Sort comments by createdAt descending (newest first)
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
// @desc    Run code against sample test cases
// @route   POST /api/problems/:id/run
// @access  Private (optional – public if you want)
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

    // Ensure the problem has sample test cases
    if (!problem.sampleTestCases || problem.sampleTestCases.length === 0) {
      return res.status(400).json({ message: 'This problem has no sample test cases to run' });
    }

    // Use a moderate time limit (e.g., 2000ms) for runs (user can adjust if needed)
    const { results, overallStatus } = await jdoodleService.runTestCasesDetailed(
      code,
      language,
      problem.sampleTestCases,
      2000  // default time limit for runs
    );

    // Build response
    const passed = results.filter(r => r.status === 'accepted').length;
    const total = results.length;

    res.status(200).json({
      status: 'success',
      overallStatus,    // 'accepted' if all passed, else first failing status
      passed,
      total,
      results: results.map(r => ({
        input: r.input,
        expectedOutput: r.expectedOutput,
        actualOutput: r.actualOutput || '',   // we need to add actualOutput in runSingleTestCase
        passed: r.status === 'accepted',
        status: r.status,
        runtime: r.runtime,
        memory: r.memory,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};