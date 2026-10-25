import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { toast } from 'react-hot-toast';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import MethodBadge from '../components/build/MethodBadge';
import MarkdownRenderer from '../components/build/MarkdownRenderer';
import DifficultyBadge from '../components/DifficultyBadge';
import {
  Boxes,
  Terminal,
  FileCode,
  RotateCcw,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Lock,
  ChevronDown,
  ChevronRight,
  Server,
  Zap,
  ArrowLeft,
  History,
  BookOpen,
  FileText,
  ShieldCheck,
  Check,
  Copy,
  AlertCircle,
  Info
} from 'lucide-react';

export default function BuildWorkspace() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Problem & workspace state
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [leftTab, setLeftTab] = useState('brief'); // 'brief' | 'endpoints' | 'contract' | 'history'
  const [mobileTab, setMobileTab] = useState('code'); // 'brief' | 'code' | 'results' (for < 1024px)
  const [showResetModal, setShowResetModal] = useState(false);

  // Submissions & evaluation state
  const [submissionId, setSubmissionId] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState('idle'); // 'idle' | 'queued' | 'running' | 'finished' | 'error'
  const [submissionResult, setSubmissionResult] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rateLimitWait, setRateLimitWait] = useState(0); // cooldown in seconds

  // Console drawer state
  const [consoleOpen, setConsoleOpen] = useState(true);

  // Expandable test items (for visible failed tests)
  const [expandedTests, setExpandedTests] = useState({});

  // Monaco editor reference
  const editorRef = useRef(null);
  const pollTimerRef = useRef(null);

  // 1. Fetch problem details
  useEffect(() => {
    let isMounted = true;
    async function fetchProblem() {
      try {
        setLoading(true);
        const res = await API.get(`/build/problems/${slug}`);
        if (isMounted && res.data?.problem) {
          const p = res.data.problem;
          setProblem(p);

          // Initialize starter file
          const starter = p.starterFiles?.find((f) => f.path === 'index.js')?.content ||
            p.starterFiles?.[0]?.content ||
            `const express = require('express');\nconst app = express();\n\napp.use(express.json());\n\n// TODO: Implement your routes\n\nconst PORT = process.env.PORT || 3000;\napp.listen(PORT, '0.0.0.0', () => {\n  console.log(\`Server listening on 0.0.0.0:\${PORT}\`);\n});\n`;

          // Restore local draft if exists, else starter
          const savedDraft = localStorage.getItem(`build_code_${slug}`);
          setCode(savedDraft || starter);
        }
      } catch (err) {
        console.error('Failed to load problem:', err);
        toast.error('Failed to load challenge details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProblem();
    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [slug]);

  // 2. Fetch history when history tab is clicked
  useEffect(() => {
    if (leftTab === 'history') {
      fetchHistory();
    }
  }, [leftTab, slug]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await API.get(`/build/submissions?slug=${slug}`);
      setHistoryList(res.data?.submissions || []);
    } catch (err) {
      console.error('Failed to load submissions history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Save code to localStorage on edit
  const handleCodeChange = (newVal) => {
    setCode(newVal || '');
    if (slug) {
      localStorage.setItem(`build_code_${slug}`, newVal || '');
    }
  };

  // Reset to starter files
  const handleResetConfirm = () => {
    const starter = problem?.starterFiles?.find((f) => f.path === 'index.js')?.content ||
      problem?.starterFiles?.[0]?.content ||
      '';
    setCode(starter);
    if (slug) {
      localStorage.removeItem(`build_code_${slug}`);
    }
    setShowResetModal(false);
    toast.success('Workspace reset to initial starter code');
  };

  // Cooldown countdown effect
  useEffect(() => {
    if (rateLimitWait <= 0) return;
    const t = setInterval(() => {
      setRateLimitWait((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [rateLimitWait]);

  // 3. Submit solution
  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write your solution before submitting.');
      return;
    }

    if (rateLimitWait > 0) {
      toast.error(`Rate limited. Please wait ${rateLimitWait}s before submitting again.`);
      return;
    }

    try {
      setSubmissionStatus('queued');
      setSubmissionResult(null);
      setConsoleOpen(true);
      if (window.innerWidth < 1024) {
        setMobileTab('results');
      }

      const payload = {
        slug,
        files: [
          {
            path: 'index.js',
            content: code,
          },
        ],
      };

      const res = await API.post('/build/submit', payload);
      const newSubId = res.data?.submissionId;
      setSubmissionId(newSubId);

      // Start polling
      startPolling(newSubId);
    } catch (err) {
      console.error('Submission failed:', err);
      if (err.response?.status === 429) {
        setRateLimitWait(60);
        setSubmissionStatus('error');
        setSubmissionResult({
          verdict: 'Rate Limited',
          message: 'You have reached the submission rate limit (5 per minute). Please wait 60s.',
        });
      } else {
        setSubmissionStatus('error');
        setSubmissionResult({
          verdict: 'Submission Error',
          message: err.response?.data?.message || 'Could not queue your submission. Check your network.',
        });
      }
    }
  };

  // 4. Polling submission every 1s
  const startPolling = (id) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const startTime = Date.now();
    const finalStatuses = new Set([
      'Accepted',
      'Wrong Answer',
      'Start Timeout',
      'Runtime Error',
      'Time Limit Exceeded',
      'Internal Error',
    ]);

    pollTimerRef.current = setInterval(async () => {
      // 60s timeout watchdog
      if (Date.now() - startTime > 60000) {
        clearInterval(pollTimerRef.current);
        setSubmissionStatus('finished');
        setSubmissionResult({
          verdict: 'Internal Error',
          message: 'Evaluation timed out waiting for worker. Please try again.',
          score: 0,
          passed: 0,
          total: problem?.visibleTests?.length || 0,
        });
        return;
      }

      try {
        const res = await API.get(`/build/submissions/${id}`);
        const sub = res.data?.submission;
        if (!sub) return;

        if (sub.status === 'Running') {
          setSubmissionStatus('running');
        }

        if (finalStatuses.has(sub.status)) {
          clearInterval(pollTimerRef.current);
          setSubmissionStatus('finished');
          setSubmissionResult(sub);

          if (sub.status === 'Accepted') {
            toast.success('🎉 Accepted! All test cases passed!');
          } else {
            toast.error(`Evaluation finished: ${sub.status}`);
          }

          // Refresh history if history tab open
          fetchHistory();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);
  };

  // Toggle expanded test detail
  const toggleTestExpand = (idx) => {
    setExpandedTests((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Distinct endpoint list extracted from visible tests
  const endpointCards = useMemo(() => {
    if (!problem?.visibleTests) return [];
    const map = new Map();

    problem.visibleTests.forEach((t) => {
      const key = `${t.request?.method || 'GET'} ${t.request?.path || '/'}`;
      if (!map.has(key)) {
        map.set(key, {
          method: t.request?.method || 'GET',
          path: t.request?.path || '/',
          sampleRequest: t.request,
          sampleExpect: t.expect,
          examples: [t],
        });
      } else {
        map.get(key).examples.push(t);
      }
    });

    return Array.from(map.values());
  }, [problem]);

  // Aggregate results list combining visible and hidden
  const testResultsList = useMemo(() => {
    if (!problem) return [];
    const results = submissionResult?.testResults || [];

    // Map results by test name
    const resultMap = new Map();
    results.forEach((r) => {
      resultMap.set(r.name, r);
    });

    // Visible tests
    const visibleItems = (problem.visibleTests || []).map((t, idx) => {
      const runResult = resultMap.get(t.name);
      return {
        id: `vis-${idx}`,
        name: t.name,
        method: t.request?.method || 'GET',
        path: t.request?.path || '/',
        request: t.request,
        expect: t.expect,
        passed: runResult ? runResult.passed : null,
        got: runResult?.got || null,
        isHidden: false,
      };
    });

    // If finished, include hidden tests from worker report
    const hiddenItems = results
      .filter((r) => r.visible === false || !(problem.visibleTests || []).some((vt) => vt.name === r.name))
      .map((r, idx) => ({
        id: `hid-${idx}`,
        name: r.name || `Hidden Edge Case #${idx + 1}`,
        passed: r.passed,
        isHidden: true,
      }));

    return [...visibleItems, ...hiddenItems];
  }, [problem, submissionResult]);

  const passedCount = submissionResult?.passed ?? 0;
  const totalCount = submissionResult?.total ?? (problem?.visibleTests?.length || 0);
  const scorePercent = submissionResult?.score ?? (totalCount > 0 && passedCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0);

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-accent-build animate-spin" />
        <span className="text-xs font-mono text-text-muted">Loading API Workbench...</span>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="py-16 text-center space-y-3">
        <h2 className="text-lg font-bold text-text">Challenge Not Found</h2>
        <Link to="/build" className="text-xs text-accent-build hover:underline">
          Return to API Challenges
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] -mx-3 sm:-mx-6 lg:-mx-8 -my-2 sm:-my-3.5 bg-bg text-text overflow-hidden select-none">
      {/* ─── Top Workbench Navbar ─── */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 bg-surface border-b border-border/50 shrink-0 z-20">
        {/* Left: Back + Title + Badges */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/build"
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-raised transition-colors shrink-0"
            title="Back to Build Mode list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-px bg-border/60 shrink-0 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-accent-build bg-accent-build/10 border border-accent-build/30 shrink-0">
              <Boxes className="w-3 h-3" />
              API Workbench
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-text truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {problem.title}
            </h1>
            <DifficultyBadge difficulty={problem.difficulty} />
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
              <Server className="w-2.5 h-2.5" />
              Node + Express
            </span>
          </div>
        </div>

        {/* Right: Actions (Reset + Submit) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-2.5 py-1 text-xs text-text-muted hover:text-text hover:bg-surface-raised border border-border/50 rounded flex items-center gap-1 transition-colors"
            title="Reset code to starter template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submissionStatus === 'queued' || submissionStatus === 'running' || rateLimitWait > 0}
            className={`px-3.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-all shadow-sm ${
              submissionStatus === 'queued' || submissionStatus === 'running'
                ? 'bg-accent-build/50 text-black cursor-not-allowed'
                : rateLimitWait > 0
                ? 'bg-surface-raised text-text-muted border border-border/60 cursor-not-allowed'
                : 'bg-accent-build hover:bg-accent-build-hover text-black shadow-accent-build/20 hover:shadow active:scale-95'
            }`}
          >
            {submissionStatus === 'queued' || submissionStatus === 'running' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Tests...</span>
              </>
            ) : rateLimitWait > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Wait {rateLimitWait}s</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit API</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ─── Mobile / Tablet Navigation Pills (< 1024px) ─── */}
      <div className="lg:hidden flex items-center border-b border-border/50 bg-surface px-2 py-1 gap-1 text-xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('brief')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition-colors ${
            mobileTab === 'brief'
              ? 'bg-surface-raised text-accent-build border border-accent-build/30'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Brief & Specs
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('code')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition-colors ${
            mobileTab === 'code'
              ? 'bg-surface-raised text-accent-build border border-accent-build/30'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Code Editor
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('results')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition-colors ${
            mobileTab === 'results'
              ? 'bg-surface-raised text-accent-build border border-accent-build/30'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Results ({passedCount}/{totalCount})
        </button>
      </div>

      {/* ─── 3-Column Main Workspace ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
        
        {/* ════════ COLUMN 1 (LEFT): Brief, Endpoints, Contract, History ════════ */}
        <aside
          className={`lg:col-span-3 flex flex-col min-h-0 bg-surface/50 ${
            mobileTab === 'brief' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Sub-tabs header */}
          <div className="flex items-center border-b border-border/40 bg-surface px-2 gap-1 overflow-x-auto shrink-0 select-none">
            {[
              { id: 'brief', label: 'Brief', icon: BookOpen },
              { id: 'endpoints', label: 'Endpoints', icon: Zap },
              { id: 'contract', label: 'Contract', icon: ShieldCheck },
              { id: 'history', label: 'History', icon: History },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLeftTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                    leftTab === tab.id
                      ? 'border-accent-build text-accent-build bg-surface-raised/40 font-semibold'
                      : 'border-transparent text-text-muted hover:text-text hover:bg-surface-raised/20'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Left Panel Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB: Brief */}
            {leftTab === 'brief' && (
              <div className="space-y-4 animate-fadeIn">
                <MarkdownRenderer content={problem.statement} />
              </div>
            )}

            {/* TAB: Endpoints */}
            {leftTab === 'endpoints' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="text-[11px] text-text-muted leading-relaxed">
                  Required REST endpoints derived from integration test specifications:
                </div>
                {endpointCards.map((ep, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border/50 bg-surface-raised/50 space-y-2 hover:border-accent-build/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MethodBadge method={ep.method} size="sm" />
                      <span className="font-mono text-xs font-semibold text-text tracking-tight">
                        {ep.path}
                      </span>
                    </div>

                    {/* Sample Request Payload */}
                    {ep.sampleRequest?.body && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-text-muted uppercase">Sample Request Body</span>
                        <pre className="p-2 rounded bg-surface border border-border/40 text-[10px] font-mono text-text overflow-x-auto">
                          <code>{JSON.stringify(ep.sampleRequest.body, null, 2)}</code>
                        </pre>
                      </div>
                    )}

                    {/* Expected Status & Body */}
                    {ep.sampleExpect && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-text-muted uppercase">
                          Expected Response ({ep.sampleExpect.status || 200})
                        </span>
                        {ep.sampleExpect.bodyContains && (
                          <pre className="p-2 rounded bg-surface border border-border/40 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                            <code>{JSON.stringify(ep.sampleExpect.bodyContains, null, 2)}</code>
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB: Contract (Rules & Environment) */}
            {leftTab === 'contract' && (
              <div className="space-y-3.5 animate-fadeIn text-xs">
                <div className="p-3 rounded-lg border border-accent-build/30 bg-accent-build/5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-accent-build">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Evaluation Contract</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Your code executes in an isolated Docker container with zero access to the internet. Comply with the following constraints to pass evaluation:
                  </p>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">1. Port & Host Binding</span>
                    <p className="text-text-muted font-sans text-xs">
                      Server must listen on port <strong>3000</strong> and bind to <code>0.0.0.0</code>:
                    </p>
                    <code className="block p-1.5 rounded bg-surface border border-border/30 text-text">
                      app.listen(3000, '0.0.0.0');
                    </code>
                  </div>

                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">2. In-Memory Data Storage</span>
                    <p className="text-text-muted font-sans text-xs">
                      Persist data in in-memory JavaScript variables, arrays, or objects. Do not write to local disk (filesystem is read-only).
                    </p>
                  </div>

                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">3. Pre-installed Packages</span>
                    <p className="text-text-muted font-sans text-xs">
                      <code>express</code> and <code>cors</code> are pre-installed. Do not attempt to <code>npm install</code> extra packages.
                    </p>
                  </div>

                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">4. Entrypoint</span>
                    <p className="text-text-muted font-sans text-xs">
                      The primary server file must be named <code>index.js</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: History */}
            {leftTab === 'history' && (
              <div className="space-y-2.5 animate-fadeIn">
                {historyLoading ? (
                  <div className="py-8 text-center space-y-2">
                    <Loader2 className="w-5 h-5 text-accent-build animate-spin mx-auto" />
                    <span className="text-xs font-mono text-text-muted">Loading history...</span>
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="py-8 text-center space-y-2 border border-dashed border-border/50 rounded-lg">
                    <History className="w-6 h-6 text-text-muted mx-auto" />
                    <p className="text-xs text-text-muted">No submissions recorded yet for this challenge.</p>
                  </div>
                ) : (
                  historyList.map((sub) => {
                    const isAc = sub.status === 'Accepted';
                    return (
                      <div
                        key={sub._id}
                        className="p-2.5 rounded-lg border border-border/50 bg-surface-raised/40 space-y-1.5 text-xs hover:border-accent-build/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-semibold font-mono text-[11px] px-2 py-0.5 rounded ${
                              isAc
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {sub.status}
                          </span>
                          <span className="font-mono text-xs font-bold text-text">
                            {sub.score ?? 0}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                          <span>
                            {sub.passed ?? 0}/{sub.total ?? 0} tests passed
                          </span>
                          <span>
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ════════ COLUMN 2 (CENTER): Monaco Editor + Output Console ════════ */}
        <main
          className={`lg:col-span-6 flex flex-col min-h-0 bg-surface-inset ${
            mobileTab === 'code' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* File Tab Bar (Stage 1: single file index.js) */}
          <div className="flex items-center justify-between border-b border-border/50 bg-surface px-3 py-1.5 select-none shrink-0">
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-surface-raised border border-border/60 text-xs font-mono font-medium text-text shadow-sm">
                <FileCode className="w-3.5 h-3.5 text-accent-build" />
                <span>index.js</span>
                <span className="w-1.5 h-1.5 rounded-full bg-accent-build ml-1" title="Active File" />
              </div>
            </div>

            <span className="text-[10px] font-mono text-text-muted">
              JavaScript (Node.js 20)
            </span>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[300px] relative">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                formatOnPaste: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* ─── Bottom Console Area ─── */}
          <div className="border-t border-border/50 bg-surface flex flex-col shrink-0">
            {/* Console Toolbar */}
            <div
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="flex items-center justify-between px-3 py-1.5 bg-surface-raised/60 hover:bg-surface-raised cursor-pointer border-b border-border/40 select-none text-xs"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-accent-build" />
                <span className="font-mono font-semibold text-text">Output Console</span>
                {submissionResult?.verdict && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      submissionResult.verdict === 'Accepted'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {submissionResult.verdict}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${consoleOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Console Content */}
            {consoleOpen && (
              <div className="p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-2 bg-surface">
                {submissionStatus === 'queued' || submissionStatus === 'running' ? (
                  <div className="flex items-center gap-2 text-accent-build text-xs py-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Starting your server in Docker container, then running tests...</span>
                  </div>
                ) : submissionResult ? (
                  <div className="space-y-2">
                    {/* Verdict Banner */}
                    <div
                      className={`p-2.5 rounded border flex items-start gap-2.5 ${
                        submissionResult.verdict === 'Accepted'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : submissionResult.verdict === 'Start Timeout'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {submissionResult.verdict === 'Accepted' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <span className="font-bold text-xs uppercase tracking-wide block">
                          {submissionResult.verdict} ({passedCount}/{totalCount} Passed)
                        </span>
                        <p className="text-[11px] font-sans leading-relaxed">
                          {submissionResult.verdict === 'Start Timeout'
                            ? 'Your server did not respond on port 3000. Check it listens on 3000 and binds to 0.0.0.0.'
                            : submissionResult.verdict === 'Internal Error'
                            ? 'Something went wrong on our side. Try again.'
                            : submissionResult.message || (submissionResult.verdict === 'Accepted' ? 'All integration tests passed successfully.' : 'Some test cases failed. Inspect requirements checklist on the right.')}
                        </p>
                      </div>
                    </div>

                    {/* Execution Time */}
                    {submissionResult.timeTakenMs != null && (
                      <div className="text-[11px] text-text-muted flex items-center gap-1.5 pt-1">
                        <Clock className="w-3 h-3 text-accent-build" />
                        <span>Execution time: {submissionResult.timeTakenMs} ms</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-text-muted text-[11px] py-2 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    <span>Click "Submit API" to evaluate your Express server in Docker sandbox.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ════════ COLUMN 3 (RIGHT): Requirements Checklist (Stage 1 Flat List) ════════ */}
        <aside
          className={`lg:col-span-3 flex flex-col min-h-0 bg-surface/50 ${
            mobileTab === 'results' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header & Progress Bar */}
          <div className="p-3 border-b border-border/50 bg-surface space-y-2.5 shrink-0 select-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-build" />
                Requirements Checklist
              </span>
              <span className="text-xs font-mono font-bold text-accent-build">
                {submissionStatus === 'finished' ? `${passedCount}/${totalCount} Passed` : `${totalCount} Tests`}
              </span>
            </div>

            {/* Progress Bar (Determinate or Indeterminate) */}
            <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden relative">
              {submissionStatus === 'queued' || submissionStatus === 'running' ? (
                <div className="h-full w-1/3 bg-accent-build rounded-full animate-build-indeterminate" />
              ) : (
                <div
                  className={`h-full transition-all duration-500 ease-out rounded-full ${
                    scorePercent === 100
                      ? 'bg-emerald-500'
                      : scorePercent > 0
                      ? 'bg-accent-build'
                      : 'bg-zinc-600'
                  }`}
                  style={{ width: `${scorePercent}%` }}
                />
              )}
            </div>
          </div>

          {/* Test List Container (Stage 1 Flat List) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {submissionStatus === 'queued' || submissionStatus === 'running' ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-7 h-7 rounded-full border-2 border-accent-build border-t-transparent animate-spin mx-auto" />
                <div className="space-y-1">
                  <span className="text-xs font-mono font-semibold text-text block">
                    Starting your server, then running tests...
                  </span>
                  <p className="text-[11px] text-text-muted">
                    Zero fake progress. Test results appear all at once.
                  </p>
                </div>
              </div>
            ) : (
              testResultsList.map((test, index) => {
                const isFailed = test.passed === false;
                const isPassed = test.passed === true;
                const isIdle = test.passed === null;
                const isExpanded = expandedTests[index];

                return (
                  <div
                    key={test.id || index}
                    className={`rounded-lg border transition-all text-xs ${
                      isPassed
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : isFailed
                        ? 'border-rose-500/40 bg-rose-500/5'
                        : 'border-border/50 bg-surface-raised/30'
                    }`}
                  >
                    {/* Test Header Row */}
                    <div
                      onClick={() => !test.isHidden && isFailed && toggleTestExpand(index)}
                      className={`p-2.5 flex items-center justify-between gap-2 ${
                        !test.isHidden && isFailed ? 'cursor-pointer hover:bg-surface-raised/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Status Light */}
                        <div className="shrink-0">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isFailed ? (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-border block mx-0.5" />
                          )}
                        </div>

                        {/* Method badge (for visible tests) */}
                        {!test.isHidden && test.method && (
                          <MethodBadge method={test.method} size="xs" />
                        )}

                        {/* Test Name */}
                        <span className="font-medium text-xs text-text truncate">
                          {test.name}
                        </span>
                      </div>

                      {/* Lock for Hidden Tests or Expand indicator */}
                      <div className="shrink-0 flex items-center gap-1 text-text-muted">
                        {test.isHidden ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border/40">
                            <Lock className="w-2.5 h-2.5" />
                            Hidden
                          </span>
                        ) : isFailed ? (
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-text-muted transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        ) : null}
                      </div>
                    </div>

                    {/* Expanded Failure Inspection (Visible tests only) */}
                    {!test.isHidden && isFailed && isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-rose-500/20 space-y-2 text-[11px] font-mono animate-fadeIn">
                        {/* Request Sent */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-text-muted uppercase font-bold block">
                            Request Sent
                          </span>
                          <div className="p-2 rounded bg-surface border border-border/40 text-text">
                            <div>{test.method} {test.path}</div>
                            {test.request?.body && (
                              <pre className="mt-1 text-[10px] text-text-muted overflow-x-auto">
                                <code>{JSON.stringify(test.request.body, null, 2)}</code>
                              </pre>
                            )}
                          </div>
                        </div>

                        {/* Expected */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-text-muted uppercase font-bold block">
                            Expected
                          </span>
                          <div className="p-2 rounded bg-surface border border-border/40 text-emerald-400">
                            <div>Status: {test.expect?.status || 200}</div>
                            {test.expect?.bodyContains && (
                              <pre className="mt-1 text-[10px] overflow-x-auto">
                                <code>{JSON.stringify(test.expect.bodyContains, null, 2)}</code>
                              </pre>
                            )}
                          </div>
                        </div>

                        {/* Actual Got */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-rose-400 uppercase font-bold block">
                            Actual (Got)
                          </span>
                          <div className="p-2 rounded bg-surface border border-rose-500/30 text-rose-300">
                            <div>Status: {test.got?.status ?? 'No response'}</div>
                            {test.got?.body !== undefined && (
                              <pre className="mt-1 text-[10px] overflow-x-auto">
                                <code>
                                  {typeof test.got.body === 'object'
                                    ? JSON.stringify(test.got.body, null, 2)
                                    : String(test.got.body)}
                                </code>
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* ─── Reset Confirmation Modal ─── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border/80 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2 rounded-full bg-amber-500/10 border border-amber-500/25">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text">Reset Starter Code?</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              This will overwrite your current edits in <code>index.js</code> with the original starter code. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-raised rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors"
              >
                Reset Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
