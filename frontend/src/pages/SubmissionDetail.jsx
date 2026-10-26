import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/client';
import Editor from '@monaco-editor/react';
import {
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
  Copy,
  Check,
  ArrowLeft,
  RotateCcw,
  Code2,
  Calendar,
  User,
  ShieldAlert,
  Loader2,
  BarChart2,
  Cpu,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';
import { getAvatarSrc } from '../utils/avatar';

const LANGUAGES = [
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'c', label: 'C', monaco: 'c' },
  { id: 'assembly', label: 'Assembly', monaco: 'assembly' },
  { id: 'cobol', label: 'COBOL', monaco: 'cobol' },
];

export default function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [problemStats, setProblemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeGraphTab, setActiveGraphTab] = useState('runtime'); // 'runtime' | 'memory'

  useEffect(() => {
    async function fetchSubmissionData() {
      setLoading(true);
      setError('');
      try {
        const res = await API.get(`/submissions/${id}`);
        const sub = res.data.submission || res.data;
        setSubmission(sub);

        const problemId = sub.problem?._id || sub.problem;
        if (problemId) {
          try {
            const statsRes = await API.get(`/submissions/problem/${problemId}/stats`);
            setProblemStats(statsRes.data?.data || statsRes.data || null);
          } catch (e) {
            console.error('Failed to load problem distribution stats:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load submission:', err);
        setError(err.response?.data?.message || 'Failed to load submission details.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchSubmissionData();
    }
  }, [id]);

  const handleCopyCode = () => {
    if (!submission?.code) return;
    navigator.clipboard.writeText(submission.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditInWorkspace = () => {
    if (!submission?.problem) return;
    const slug = submission.problem.slug || submission.problem._id;
    // Preload the submitted code into localStorage so it opens directly in the workspace editor
    try {
      const savedKey = `code_${slug}`;
      const existing = localStorage.getItem(savedKey);
      let parsed = {};
      if (existing) {
        try { parsed = JSON.parse(existing); } catch (e) {}
      }
      parsed[submission.language || 'cpp'] = submission.code;
      localStorage.setItem(savedKey, JSON.stringify(parsed));
    } catch (e) {
      console.error(e);
    }
    navigate(`/problems/${slug}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-xs font-mono">Loading submission telemetry & distribution graphs...</span>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <ShieldAlert className="h-8 w-8 mx-auto text-danger" />
        <h2 className="text-base font-semibold text-text">Submission Not Found</h2>
        <p className="text-xs text-text-muted">{error || 'This submission could not be retrieved.'}</p>
        <button
          onClick={() => navigate('/my-submissions')}
          className="px-4 py-1.5 rounded bg-surface-raised border border-border/50 text-xs text-text hover:bg-surface-raised/80 transition-colors"
        >
          View My Submissions
        </button>
      </div>
    );
  }

  const problem = submission.problem || {};
  const isAccepted = submission.status?.toLowerCase() === 'accepted';

  // Compute beats percentiles
  let beatsRuntime = null;
  if (problemStats?.acceptedRuntimes?.length > 0 && submission.runtime != null) {
    const slowerCount = problemStats.acceptedRuntimes.filter((r) => r > submission.runtime).length;
    beatsRuntime = Math.round((slowerCount / problemStats.acceptedRuntimes.length) * 100);
  }

  let beatsMemory = null;
  if (problemStats?.acceptedMemories?.length > 0 && submission.memory != null) {
    const higherCount = problemStats.acceptedMemories.filter((m) => m > submission.memory).length;
    beatsMemory = Math.round((higherCount / problemStats.acceptedMemories.length) * 100);
  }

  const monacoLanguage =
    LANGUAGES.find((l) => l.id === submission.language)?.monaco || submission.language || 'cpp';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 pt-2 text-text">
      {/* ─── Back to Problem Navigation Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/30">
        <button
          type="button"
          onClick={() => {
            const slug = problem.slug || problem._id;
            if (slug) {
              navigate(`/problems/${slug}`);
            } else {
              navigate(-1);
            }
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface-raised border border-border/50 hover:bg-surface-raised/80 text-xs font-medium text-text transition-colors group cursor-pointer w-fit"
          title="Return to problem solving workspace"
        >
          <ArrowLeft className="h-4 w-4 text-accent transition-transform group-hover:-translate-x-0.5" />
          <span>Return to Problem</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
          <Link to="/problems" className="hover:text-text transition-colors">
            Problems
          </Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <Link to={`/problems/${problem.slug || problem._id}`} className="hover:text-text transition-colors truncate max-w-xs">
            {problem.title || 'Challenge'}
          </Link>
          <ChevronRight className="h-3 w-3 text-border" />
          <span className="text-text font-medium">Submission Details</span>
        </div>
      </div>

      {/* ─── Header Verdict Banner ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {isAccepted ? (
              <span className="text-xl sm:text-2xl font-bold text-success flex items-center gap-2">
                <CheckCircle className="h-6 w-6 shrink-0" /> Accepted
              </span>
            ) : (
              <span className="text-xl sm:text-2xl font-bold text-danger flex items-center gap-2">
                <XCircle className="h-6 w-6 shrink-0" />
                <span className="capitalize">{submission.status?.replace(/_/g, ' ') || 'Wrong Answer'}</span>
              </span>
            )}

            {problem.difficulty && <DifficultyBadge difficulty={problem.difficulty} />}
          </div>

          <div className="flex items-center gap-3 text-xs text-text-muted font-mono pt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(submission.createdAt || submission.submittedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span>{submission.user?.name || 'You'}</span>
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border/50 bg-surface-raised hover:bg-surface-raised/80 text-xs font-medium text-text transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={handleEditInWorkspace}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-accent text-bg hover:opacity-90 text-xs font-medium transition-opacity"
            title="Open and edit this submission in the problem workspace"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Edit in Workspace</span>
          </button>
        </div>
      </div>

      {/* ─── Performance Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Runtime Card */}
        <div className="border border-border/40 bg-surface/40 rounded p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-success" /> Runtime
            </span>
            {beatsRuntime != null && (
              <span className="text-[11px] font-mono text-success bg-success/10 px-1.5 py-0.2 rounded border border-success/30">
                Beats {beatsRuntime}%
              </span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-text">
            {submission.runtime != null ? `${submission.runtime} ms` : '—'}
          </div>
          <p className="text-[11px] text-text-muted font-sans">
            {beatsRuntime != null
              ? `Faster than ${beatsRuntime}% of ${submission.language} online submissions.`
              : 'Total time taken to run your solution.'}
          </p>
        </div>

        {/* Memory Card */}
        <div className="border border-border/40 bg-surface/40 rounded p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-accent" /> Memory
            </span>
            {beatsMemory != null && (
              <span className="text-[11px] font-mono text-accent bg-accent/10 px-1.5 py-0.2 rounded border border-accent/30">
                Beats {beatsMemory}%
              </span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-text">
            {submission.memory != null ? `${submission.memory} MB` : '—'}
          </div>
          <p className="text-[11px] text-text-muted font-sans">
            {beatsMemory != null
              ? `Less memory than ${beatsMemory}% of ${submission.language} online submissions.`
              : 'Peak memory used by your solution.'}
          </p>
        </div>

        {/* Test Cases Passed Card */}
        <div className="border border-border/40 bg-surface/40 rounded p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-warning" /> Test Cases
            </span>
            <span className="text-[11px] font-mono uppercase bg-surface-raised px-1.5 py-0.2 rounded text-text-muted">
              {submission.language}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-text">
            {submission.passedTestCases ?? 0} / {submission.totalTestCases ?? 0}
          </div>
          <p className="text-[11px] text-text-muted font-sans">
            {isAccepted ? 'All test cases passed successfully.' : 'Did not pass all private test cases.'}
          </p>
        </div>
      </div>

      {/* ─── LeetCode Distribution Graphs (Runtime & Memory) ─── */}
      <div className="border border-border/40 bg-surface/30 rounded p-4 sm:p-5 space-y-4">
        {/* Distribution Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-accent" />
            <h2 className="text-xs sm:text-sm font-semibold text-text">
              Submission Performance Distribution
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-surface-raised/50 p-0.5 rounded border border-border/40 text-xs">
            <button
              type="button"
              onClick={() => setActiveGraphTab('runtime')}
              className={`px-3 py-1 rounded transition-colors font-medium ${
                activeGraphTab === 'runtime'
                  ? 'bg-surface text-text shadow-xs border border-border/50'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Runtime Distribution
            </button>
            <button
              type="button"
              onClick={() => setActiveGraphTab('memory')}
              className={`px-3 py-1 rounded transition-colors font-medium ${
                activeGraphTab === 'memory'
                  ? 'bg-surface text-text shadow-xs border border-border/50'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Memory Distribution
            </button>
          </div>
        </div>

        {/* ─── GRAPH 1: Runtime Distribution Histogram ─── */}
        {activeGraphTab === 'runtime' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-text-muted font-mono">
              <span>
                Total Accepted Submissions:{' '}
                <strong className="text-text">{problemStats?.acceptedSubmissions ?? 0}</strong>
              </span>
              {submission.runtime != null && (
                <span className="text-success flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span>You: {submission.runtime} ms</span>
                </span>
              )}
            </div>

            <div className="bg-surface-inset/40 border border-border/30 rounded p-4">
              <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2">
                {(problemStats?.runtimeBuckets || []).map((bucket, idx) => {
                  const maxPct = Math.max(...problemStats.runtimeBuckets.map((b) => b.percentage), 1);
                  const barHeight = Math.max((bucket.percentage / maxPct) * 100, 6);
                  const isUserBucket =
                    submission.runtime != null &&
                    submission.runtime >= bucket.range[0] &&
                    submission.runtime <= bucket.range[1];

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                      {/* Hover Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-surface border border-border px-2 py-1 rounded text-[10px] font-mono pointer-events-none whitespace-nowrap z-30 shadow-lg">
                        {bucket.count} submissions ({bucket.percentage}%)
                      </div>

                      {/* "You are here" indicator */}
                      {isUserBucket && (
                        <div className="absolute -top-6 text-[10px] font-mono text-accent font-semibold tracking-tight animate-bounce">
                          You
                        </div>
                      )}

                      <div
                        style={{ height: `${barHeight}%` }}
                        className={`w-full rounded-t transition-all ${
                          isUserBucket
                            ? 'bg-accent border-t-2 border-white shadow-[0_0_12px_rgba(255,161,22,0.4)]'
                            : 'bg-accent/40 group-hover:bg-accent/70'
                        }`}
                      />
                      <span className="text-[10px] text-text-muted font-mono truncate max-w-[65px] text-center">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1">
              <span>← Faster runtime</span>
              <span>Slower runtime →</span>
            </div>
          </div>
        )}

        {/* ─── GRAPH 2: Memory Distribution Histogram ─── */}
        {activeGraphTab === 'memory' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-text-muted font-mono">
              <span>
                Total Accepted Submissions:{' '}
                <strong className="text-text">{problemStats?.acceptedSubmissions ?? 0}</strong>
              </span>
              {submission.memory != null && (
                <span className="text-accent flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span>You: {submission.memory} MB</span>
                </span>
              )}
            </div>

            <div className="bg-surface-inset/40 border border-border/30 rounded p-4">
              <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2">
                {(problemStats?.memoryBuckets || []).map((bucket, idx) => {
                  const maxPct = Math.max(...problemStats.memoryBuckets.map((b) => b.percentage), 1);
                  const barHeight = Math.max((bucket.percentage / maxPct) * 100, 6);
                  const isUserBucket =
                    submission.memory != null &&
                    submission.memory >= bucket.range[0] &&
                    submission.memory <= bucket.range[1];

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                      {/* Hover Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-surface border border-border px-2 py-1 rounded text-[10px] font-mono pointer-events-none whitespace-nowrap z-30 shadow-lg">
                        {bucket.count} submissions ({bucket.percentage}%)
                      </div>

                      {/* "You are here" indicator */}
                      {isUserBucket && (
                        <div className="absolute -top-6 text-[10px] font-mono text-accent font-semibold tracking-tight animate-bounce">
                          You
                        </div>
                      )}

                      <div
                        style={{ height: `${barHeight}%` }}
                        className={`w-full rounded-t transition-all ${
                          isUserBucket
                            ? 'bg-sky-400 border-t-2 border-white shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                            : 'bg-sky-500/40 group-hover:bg-sky-500/70'
                        }`}
                      />
                      <span className="text-[10px] text-text-muted font-mono truncate max-w-[65px] text-center">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1">
              <span>← Less memory</span>
              <span>More memory →</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Error Log Output (if compilation / runtime error) ─── */}
      {submission.errorLog && (
        <div className="p-4 rounded bg-danger/10 border border-danger/30 text-danger space-y-1.5 font-mono text-xs">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="h-4 w-4" />
            <span>Compiler Output / Diagnostic Trace</span>
          </div>
          <pre className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed bg-black/40 p-3 rounded overflow-x-auto">
            {submission.errorLog}
          </pre>
        </div>
      )}

      {/* ─── Submitted Code Viewer (Monaco Editor) ─── */}
      <div className="border border-border/40 rounded overflow-hidden bg-surface/30 space-y-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-surface/60 text-xs">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-accent" />
            <span className="font-semibold text-text">Submitted Code</span>
            <span className="text-[10px] font-mono uppercase bg-surface-raised px-1.5 py-0.2 rounded text-text-muted">
              {submission.language}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 rounded text-text-muted hover:text-text transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="h-[420px] bg-[#1e1e1e]">
          <Editor
            height="100%"
            theme="vs-dark"
            language={monacoLanguage}
            value={submission.code || '// No code recorded'}
            options={{
              readOnly: true,
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
              lineNumbersMinChars: 3,
              domReadOnly: true,
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
