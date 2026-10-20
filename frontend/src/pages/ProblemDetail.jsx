import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/client';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useBookmark } from '../hooks/useBookmark';
import {
  Terminal,
  Play,
  Send,
  Loader2,
  MessageSquare,
  Bookmark,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  X,
  ShieldAlert,
  Clock,
  HardDrive,
  FileText,
  BarChart3,
  ArrowLeft,
  RotateCcw,
  Calendar,
  ExternalLink
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

const LANGUAGES = [
  { id: 'cpp', label: 'C++ (GCC 14)', monaco: 'cpp' },
  { id: 'java', label: 'Java (OpenJDK 21)', monaco: 'java' },
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'javascript', label: 'JavaScript (Node.js)', monaco: 'javascript' },
  { id: 'c', label: 'C (GCC 14)', monaco: 'c' },
  { id: 'assembly', label: 'Assembly (NASM)', monaco: 'assembly' },
  { id: 'cobol', label: 'COBOL', monaco: 'cobol' },
];

const defaultTemplates = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}`,
  python: `# Your code here\n`,
  javascript: `// Your code here\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}`,
  assembly: `section .data\n    ; Your code here\n\nsection .text\n    global _start\n\n_start:\n    ; Exit\n    mov eax, 60\n    xor edi, edi\n    syscall`,
  cobol: `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. SOLUTION.\n       PROCEDURE DIVISION.\n           * Your code here\n           STOP RUN.`
};

const getVerdictStyles = (status = '') => {
  const lower = status.toLowerCase();
  if (lower === 'accepted' || lower === 'ac') {
    return { text: 'text-success font-medium', label: 'Accepted' };
  }
  if (lower === 'wrong_answer' || lower === 'wrong answer' || lower === 'wa') {
    return { text: 'text-danger font-medium', label: 'Wrong Answer' };
  }
  if (lower.includes('compile') || lower === 'ce') {
    return { text: 'text-warning font-medium', label: 'Compile Error' };
  }
  if (lower.includes('runtime') || lower === 'rte') {
    return { text: 'text-danger font-medium', label: 'Runtime Error' };
  }
  if (lower.includes('limit') || lower === 'tle') {
    return { text: 'text-warning font-medium', label: 'Time Limit Exceeded' };
  }
  return { text: 'text-text-muted', label: status || 'Pending' };
};

export default function ProblemDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const terminalRef = useRef(null);
  const containerRef = useRef(null);

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('cpp');
  const [codeByLang, setCodeByLang] = useState(() => {
    const saved = localStorage.getItem(`code_${slug}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultTemplates;
      }
    }
    return defaultTemplates;
  });

  // Resizable split state (percentage of left panel)
  const [splitPercent, setSplitPercent] = useState(() => {
    const saved = localStorage.getItem('codexium_ide_split');
    const parsed = saved ? parseFloat(saved) : 44;
    return isNaN(parsed) ? 44 : Math.min(Math.max(parsed, 20), 80);
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleWindowResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(`code_${slug}`, JSON.stringify(codeByLang));
  }, [codeByLang, slug]);

  useEffect(() => {
    localStorage.setItem('codexium_ide_split', String(splitPercent));
  }, [splitPercent]);

  // Horizontal resizer mouse drag handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const newPercent = ((clientX - rect.left) / rect.width) * 100;
      if (newPercent >= 20 && newPercent <= 80) {
        setSplitPercent(newPercent);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState(null);
  const [activeTestTab, setActiveTestTab] = useState(0);

  // Console mode: 'testcase' (sample inputs) vs 'result' (execution output)
  const [consoleTab, setConsoleTab] = useState('testcase');
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);

  // Left panel tabs: 'description' | 'submissions' | 'discussion'
  const [leftTab, setLeftTab] = useState('description');

  // Submissions & Rate graph telemetry
  const [submissionsList, setSubmissionsList] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [problemStats, setProblemStats] = useState(null);
  const [copiedSubCode, setCopiedSubCode] = useState(false);
  const [codeLoadedNotice, setCodeLoadedNotice] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [copied, setCopied] = useState(false);

  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem?._id);

  // Fetch problem data & telemetry
  const fetchProblemSubmissions = async (probId = problem?._id) => {
    if (!probId) return;
    setSubmissionsLoading(true);
    try {
      const res = await API.get(`/submissions/problem/${probId}?userId=${user?._id || ''}&limit=50`);
      const raw = res.data?.submissions || res.data || [];
      setSubmissionsList(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const fetchProblemStats = async (probId = problem?._id) => {
    if (!probId) return;
    try {
      const res = await API.get(`/submissions/problem/${probId}/stats`);
      setProblemStats(res.data?.data || res.data || null);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadProblemWorkspace() {
      try {
        const res = await API.get(`/problems/${slug}`);
        if (!isMounted) return;

        const p = res.data.problem || res.data;
        setProblem(p);

        const initialLang = p.language || 'cpp';
        setLanguage(initialLang);

        // Fetch comments, submissions & rate graph stats concurrently
        const [cRes] = await Promise.all([
          API.get(`/problems/${p._id}/comments`).catch(() => ({ data: {} })),
          fetchProblemSubmissions(p._id),
          fetchProblemStats(p._id),
        ]);

        if (isMounted) {
          setComments(cRes.data.comments || cRes.data || []);
        }
      } catch (err) {
        if (isMounted) navigate('/problems');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProblemWorkspace();

    return () => {
      isMounted = false;
    };
  }, [slug, navigate]);

  useEffect(() => {
    if (terminalLogs && terminalRef.current) {
      terminalRef.current.scrollTop = 0;
    }
  }, [terminalLogs]);

  const activeCode = codeByLang[language] ?? '';

  const handleCodeChange = (val) => {
    const text = val || '';
    setCodeByLang((prev) => ({ ...prev, [language]: text }));
  };

  const triggerSandboxRun = async () => {
    setRunning(true);
    setTerminalLogs(null);
    setActiveTestTab(0);
    setConsoleTab('result');
    try {
      const res = await API.post(`/problems/${problem._id}/run`, {
        language,
        code: activeCode,
      });
      setTerminalLogs({ mode: 'sandbox', data: res.data });
    } catch (e) {
      setTerminalLogs({
        mode: 'error',
        out: e.response?.data?.message || 'Compilation execution error.',
      });
    } finally {
      setRunning(false);
    }
  };

  const triggerProductionTransmit = async () => {
    setSubmitting(true);
    setTerminalLogs(null);
    setConsoleTab('result');
    try {
      const res = await API.post('/submissions', {
        problemId: problem._id,
        language,
        code: activeCode,
      });
      const submissionData = res.data.submission || res.data;
      setTerminalLogs({ mode: 'production', data: submissionData });

      // Refresh submissions telemetry and rate stats immediately
      fetchProblemSubmissions(problem._id);
      fetchProblemStats(problem._id);
    } catch (e) {
      setTerminalLogs({
        mode: 'error',
        out: e.response?.data?.message || 'Submission runtime fault.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSubmissionIntoEditor = (sub) => {
    if (!sub?.code) return;
    if (sub.language && LANGUAGES.some((l) => l.id === sub.language)) {
      setLanguage(sub.language);
      setCodeByLang((prev) => ({ ...prev, [sub.language]: sub.code }));
    } else {
      setCodeByLang((prev) => ({ ...prev, [language]: sub.code }));
    }
    setCodeLoadedNotice(true);
    setTimeout(() => setCodeLoadedNotice(false), 2500);
  };

  const handleSelectSubmission = async (sub) => {
    setSelectedSubmission(sub);
    if (!sub?.code && sub?._id) {
      try {
        const res = await API.get(`/submissions/${sub._id}`);
        const fullSub = res.data.submission || res.data;
        setSelectedSubmission(fullSub);
      } catch (e) {
        console.error('Failed to load full submission details:', e);
      }
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await API.post(`/problems/${problem._id}/comments`, { text: newComment });
      setComments([res.data.comment || res.data, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`h-[calc(100vh-5.5rem)] overflow-hidden flex flex-col lg:flex-row gap-0 border border-border/40 rounded-md bg-bg text-text ${
        isDragging ? 'select-none cursor-col-resize' : ''
      }`}
    >
      {/* ─── LEFT PANEL: Problem Workspace & Submissions ─── */}
      <div
        style={{ width: isDesktop ? `${splitPercent}%` : '100%' }}
        className="w-full flex flex-col overflow-y-auto border-b lg:border-b-0 lg:border-r border-border/40 bg-bg shrink-0"
      >
        {/* Left Panel Tabs Toolbar (LeetCode Style: Description, Submissions, Discussion) */}
        <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border/40 bg-surface/50 shrink-0 text-xs select-none">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setLeftTab('description');
                setSelectedSubmission(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                leftTab === 'description'
                  ? 'bg-surface-raised text-text font-medium border border-border/50'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Description</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('submissions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                leftTab === 'submissions'
                  ? 'bg-surface-raised text-text font-medium border border-border/50'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Submissions</span>
              {submissionsList.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface-raised border border-border/40 rounded-full text-text-muted">
                  {submissionsList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setLeftTab('discussion');
                setSelectedSubmission(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                leftTab === 'discussion'
                  ? 'bg-surface-raised text-text font-medium border border-border/50'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Discussion</span>
              {comments.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface-raised border border-border/40 rounded-full text-text-muted">
                  {comments.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              className="p-1.5 rounded hover:bg-surface-raised text-text-muted hover:text-text transition-colors"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
            >
              <Bookmark
                className={`h-3.5 w-3.5 transition-all ${
                  isBookmarked ? 'fill-warning text-warning' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* ─── TAB 1: Problem Description ─── */}
        {leftTab === 'description' && (
          <div className="p-4 space-y-4 flex-1 text-xs sm:text-sm">
            {/* Header info */}
            <div className="space-y-2 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold text-text truncate">
                  {problem?.title}
                </h1>
                {problem?.difficulty && <DifficultyBadge difficulty={problem.difficulty} />}
              </div>

              {problem?.tags?.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {problem.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono text-text-muted bg-surface-raised/50 px-1.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description Body */}
            <div className="leading-relaxed text-text whitespace-pre-wrap font-sans text-xs sm:text-sm">
              {problem?.description}
            </div>

            {problem?.tags?.some((tag) =>
              ['linked list', 'tree', 'binary tree', 'graph'].includes(tag.toLowerCase())
            ) && (
              <div className="bg-warning/10 border border-warning/20 rounded p-3 text-xs text-warning/90 leading-relaxed font-sans">
                Please construct and use the intended data structure (Nodes, Pointers, Trees, etc.) in memory rather than flattening to an array.
              </div>
            )}

            {/* Sample Test Cases (LeetCode Seamless Style, No Hide Icon) */}
            {problem?.sampleTestCases?.length > 0 && (
              <div className="space-y-4 pt-1">
                {problem.sampleTestCases.map((tc, i) => (
                  <div key={i} className="space-y-1.5 text-xs">
                    <span className="font-semibold text-text">Example {i + 1}:</span>
                    <div className="bg-surface-raised/25 border-l-2 border-border/70 pl-3 py-2 pr-3 rounded-r font-mono text-xs space-y-1">
                      <div>
                        <span className="font-medium text-text-muted select-none">Input: </span>
                        <span className="text-text font-mono">{tc.displayInput || tc.input}</span>
                      </div>
                      <div>
                        <span className="font-medium text-text-muted select-none">Output: </span>
                        <span className="text-text font-mono">{tc.output}</span>
                      </div>
                      {tc.explanation && (
                        <div className="pt-0.5">
                          <span className="font-medium text-text-muted select-none">Explanation: </span>
                          <span className="text-text-muted font-sans text-[11px] leading-relaxed">{tc.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {problem?.constraints && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
                  Constraints:
                </span>
                <ul className="text-xs space-y-1 font-mono text-text-muted">
                  {problem.constraints
                    .split('\n')
                    .filter(Boolean)
                    .map((c, i) => (
                      <li key={i} className="before:content-['•'] before:mr-2 before:text-border">
                        {c}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: Submissions (LeetCode Style Clean List & Detail) ─── */}
        {leftTab === 'submissions' && (
          <div className="p-4 space-y-4 text-xs">
            {selectedSubmission ? (
              /* ─── LeetCode Style Submission Detail View ─── */
              <div className="space-y-4">
                {/* Back navigation header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border/30">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text font-medium transition-colors group cursor-pointer"
                    title="Return to submissions list"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-accent" />
                    <span>All Submissions</span>
                  </button>

                  {selectedSubmission._id && (
                    <Link
                      to={`/submissions/${selectedSubmission._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-mono"
                      title="Open dedicated telemetry and distribution graphs in full page"
                    >
                      <span>Full Telemetry</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Verdict & timestamp */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {selectedSubmission.status?.toLowerCase() === 'accepted' || selectedSubmission.status?.toLowerCase() === 'ac' ? (
                      <span className="text-base font-bold text-success flex items-center gap-1.5">
                        <CheckCircle className="h-5 w-5 shrink-0" /> Accepted
                      </span>
                    ) : (
                      <span className="text-base font-bold text-danger flex items-center gap-1.5">
                        <XCircle className="h-5 w-5 shrink-0" />
                        <span className="capitalize">
                          {selectedSubmission.status?.replace(/_/g, ' ') || 'Wrong Answer'}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted font-mono flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>
                      Submitted on{' '}
                      {new Date(selectedSubmission.createdAt || selectedSubmission.submittedAt || Date.now()).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Performance telemetry metrics cards (Runtime, Memory) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Runtime Card */}
                  <div className="bg-surface-raised/40 border border-border/30 rounded p-2.5 space-y-0.5">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3 text-success" /> Runtime
                      </span>
                      {problemStats?.acceptedRuntimes?.length > 0 && selectedSubmission.runtime != null && (
                        <span className="text-[10px] font-mono text-success bg-success/10 px-1 rounded border border-success/30">
                          Beats{' '}
                          {Math.round(
                            (problemStats.acceptedRuntimes.filter((r) => r > selectedSubmission.runtime).length /
                              problemStats.acceptedRuntimes.length) *
                              100
                          )}
                          %
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-base font-bold text-text">
                      {selectedSubmission.runtime != null ? `${selectedSubmission.runtime} ms` : '—'}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {problemStats?.acceptedRuntimes?.length > 0 && selectedSubmission.runtime != null
                        ? `Faster than ${Math.round(
                            (problemStats.acceptedRuntimes.filter((r) => r > selectedSubmission.runtime).length /
                              problemStats.acceptedRuntimes.length) *
                              100
                          )}% of users`
                        : 'Execution runtime'}
                    </div>
                  </div>

                  {/* Memory Card */}
                  <div className="bg-surface-raised/40 border border-border/30 rounded p-2.5 space-y-0.5">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="flex items-center gap-1 text-[11px]">
                        <HardDrive className="h-3 w-3 text-accent" /> Memory
                      </span>
                      {problemStats?.acceptedMemories?.length > 0 && selectedSubmission.memory != null && (
                        <span className="text-[10px] font-mono text-accent bg-accent/10 px-1 rounded border border-accent/30">
                          Beats{' '}
                          {Math.round(
                            (problemStats.acceptedMemories.filter((m) => m > selectedSubmission.memory).length /
                              problemStats.acceptedMemories.length) *
                              100
                          )}
                          %
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-base font-bold text-text">
                      {selectedSubmission.memory != null ? `${selectedSubmission.memory} MB` : '—'}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {problemStats?.acceptedMemories?.length > 0 && selectedSubmission.memory != null
                        ? `Less memory than ${Math.round(
                            (problemStats.acceptedMemories.filter((m) => m > selectedSubmission.memory).length /
                              problemStats.acceptedMemories.length) *
                              100
                          )}% of users`
                        : 'Peak memory usage'}
                    </div>
                  </div>
                </div>

                {/* Test Cases Passed Summary */}
                {(selectedSubmission.totalTestCases != null || selectedSubmission.passedTestCases != null) && (
                  <div className="bg-surface-raised/30 border border-border/30 rounded px-3 py-2 flex items-center justify-between font-mono text-[11px]">
                    <span className="text-text-muted">Test Cases:</span>
                    <span className="text-text font-medium">
                      {selectedSubmission.passedTestCases ?? 0} / {selectedSubmission.totalTestCases ?? 0} passed
                    </span>
                  </div>
                )}

                {/* Compiler / Runtime error output if present */}
                {selectedSubmission.errorLog && (
                  <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger space-y-1 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>Execution Output / Error</span>
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto bg-black/40 p-2.5 rounded text-[10px]">
                      {selectedSubmission.errorLog}
                    </pre>
                  </div>
                )}

                {/* Submitted Code Viewer & Actions */}
                <div className="border border-border/40 rounded overflow-hidden bg-surface/30">
                  <div className="flex items-center justify-between px-3 py-2 bg-surface-raised/60 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text text-xs">Submitted Code</span>
                      <span className="text-[10px] font-mono uppercase bg-surface-raised px-1.5 py-0.2 rounded text-text-muted">
                        {selectedSubmission.language || 'cpp'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedSubmission.code) return;
                          navigator.clipboard.writeText(selectedSubmission.code);
                          setCopiedSubCode(true);
                          setTimeout(() => setCopiedSubCode(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface border border-border/40 hover:bg-surface-raised text-[11px] text-text-muted hover:text-text transition-colors cursor-pointer"
                        title="Copy code"
                      >
                        {copiedSubCode ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedSubCode ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadSubmissionIntoEditor(selectedSubmission)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-bg hover:opacity-90 text-[11px] font-medium transition-opacity cursor-pointer"
                        title="Load this submission into the code editor"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Edit in Workspace</span>
                      </button>
                    </div>
                  </div>

                  {codeLoadedNotice && (
                    <div className="px-3 py-1.5 bg-success/15 border-b border-success/30 text-success text-[11px] font-medium flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> Code loaded into editor on the right!
                    </div>
                  )}

                  <div className="h-64 bg-[#1e1e1e]">
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language={
                        LANGUAGES.find((l) => l.id === selectedSubmission.language)?.monaco ||
                        selectedSubmission.language ||
                        'cpp'
                      }
                      value={selectedSubmission.code || '// No code recorded'}
                      options={{
                        readOnly: true,
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono, monospace',
                        minimap: { enabled: false },
                        scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
                        lineNumbersMinChars: 2,
                        domReadOnly: true,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* ─── Submissions List View ─── */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                  <span className="text-xs font-semibold text-text">
                    All Submissions ({submissionsList.length})
                  </span>
                  <span className="text-[11px] text-text-muted font-mono">
                    Click any submission to view time, ms & code
                  </span>
                </div>

                {submissionsLoading ? (
                  <div className="py-12 text-center text-text-muted space-y-2">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-accent" />
                    <p className="text-[11px]">Loading submissions...</p>
                  </div>
                ) : submissionsList.length === 0 ? (
                  <div className="py-12 text-center text-text-muted border border-border/30 rounded p-6 space-y-2">
                    <Clock className="h-6 w-6 mx-auto text-text-muted" />
                    <p className="text-xs text-text font-medium">No submissions yet for this problem.</p>
                    <p className="text-[11px] text-text-muted">
                      Submit your code to see your submissions history here!
                    </p>
                  </div>
                ) : (
                  <div className="border border-border/30 rounded overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 px-3 py-2 bg-surface-raised/40 text-[11px] font-medium text-text-muted border-b border-border/30 font-mono">
                      <div className="col-span-5">Status</div>
                      <div className="col-span-2">Language</div>
                      <div className="col-span-2 text-right">Runtime</div>
                      <div className="col-span-3 text-right">Memory</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-border/20">
                      {submissionsList.map((sub, idx) => {
                        const verdict = getVerdictStyles(sub.status);
                        return (
                          <div
                            key={sub._id || idx}
                            onClick={() => handleSelectSubmission(sub)}
                            className="grid grid-cols-12 px-3 py-2.5 items-center hover:bg-surface-raised/50 transition-colors cursor-pointer group"
                            title="Click to view submission details, runtime and code"
                          >
                            {/* Status + Date */}
                            <div className="col-span-5 min-w-0 pr-2">
                              <div className={`text-xs ${verdict.text} group-hover:underline flex items-center gap-1.5`}>
                                {verdict.label === 'Accepted' ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-danger shrink-0" />
                                )}
                                <span className="truncate">{verdict.label}</span>
                              </div>
                              <span className="text-[10px] text-text-muted font-mono block">
                                {new Date(sub.createdAt || sub.submittedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {/* Language */}
                            <div className="col-span-2">
                              <span className="text-[11px] font-mono text-text-muted capitalize">
                                {sub.language}
                              </span>
                            </div>

                            {/* Runtime */}
                            <div className="col-span-2 text-right font-mono text-xs text-text">
                              {sub.runtime != null ? `${sub.runtime} ms` : '—'}
                            </div>

                            {/* Memory + Arrow */}
                            <div className="col-span-3 text-right font-mono text-xs text-text-muted flex items-center justify-end gap-1.5">
                              <span>{sub.memory != null ? `${sub.memory} MB` : '—'}</span>
                              <span className="text-text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all text-xs">
                                →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: Discussion ─── */}
        {leftTab === 'discussion' && (
          <div className="p-4 space-y-4 flex-1 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <span className="text-xs font-semibold text-text">Community Discussion ({comments.length})</span>
            </div>

            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your approach, hint, or complexity..."
                className="flex-1 bg-surface-raised/40 border border-border/40 px-2.5 py-1.5 text-xs text-text placeholder-text-muted rounded focus:outline-none focus:border-border"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-text text-bg rounded text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Post
              </button>
            </form>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="py-8 text-center text-text-muted">
                  No discussions yet. Be the first to share your solution breakdown!
                </div>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="bg-surface-raised/30 border border-border/30 rounded p-3 text-xs space-y-1">
                    <div className="flex justify-between text-[10px] text-text-muted font-mono">
                      <span className="text-text font-medium">{c.user?.name || 'Anonymous'}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-text font-sans leading-relaxed">{c.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── RESIZER HANDLE (Draggable splitter between Problem and Code) ─── */}
      <div
        onMouseDown={handleMouseDown}
        className={`hidden lg:flex w-2.5 relative z-20 cursor-col-resize items-center justify-center transition-colors group shrink-0 ${
          isDragging
            ? 'bg-accent/40'
            : 'bg-border/20 hover:bg-accent/30 border-x border-border/30'
        }`}
        title="Drag to resize Problem and Code panels"
      >
        <div
          className={`w-0.5 h-8 rounded-full transition-colors ${
            isDragging ? 'bg-accent' : 'bg-text-muted/40 group-hover:bg-accent/80'
          }`}
        />
      </div>

      {/* ─── RIGHT PANEL: Editor & Terminal ─── */}
      <div
        style={{ width: isDesktop ? `calc(100% - ${splitPercent}% - 0.625rem)` : '100%' }}
        className={`w-full flex flex-col h-full bg-bg relative flex-1 min-w-0 ${
          isDragging ? 'pointer-events-none' : ''
        }`}
      >
        {/* Editor Top Toolbar */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/40 bg-surface/50 shrink-0">
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-surface-raised border border-border/40 rounded px-2.5 py-1 text-xs font-mono text-text outline-none hover:border-border cursor-pointer transition-colors"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id} className="bg-[#121212] text-white">
                  {lang.label}
                </option>
              ))}
            </select>
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

        {/* Monaco Code Editor */}
        <div className="flex-1 min-h-[200px] bg-[#1e1e1e]">
          <Editor
            height="100%"
            theme="vs-dark"
            language={LANGUAGES.find((l) => l.id === language)?.monaco || 'cpp'}
            value={activeCode}
            onChange={handleCodeChange}
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
              padding: { top: 10 },
              lineNumbersMinChars: 3,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Bottom Console Toolbar: LeetCode-style Testcase & Result tabs + Run/Submit */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 bg-surface/40 shrink-0">
          {/* LeetCode Seamless Console Tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setConsoleTab('testcase')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                consoleTab === 'testcase'
                  ? 'bg-surface-raised text-text font-medium border border-border/50'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Testcase
            </button>
            <button
              type="button"
              onClick={() => setConsoleTab('result')}
              className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 ${
                consoleTab === 'result'
                  ? 'bg-surface-raised text-text font-medium border border-border/50'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <span>Test Result</span>
              {terminalLogs?.mode === 'sandbox' && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    terminalLogs.data?.overallStatus?.toLowerCase() === 'accepted'
                      ? 'bg-success'
                      : 'bg-danger'
                  }`}
                />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerSandboxRun}
              disabled={running || submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border border-border/50 bg-surface-raised hover:bg-surface-raised/80 text-text transition-colors disabled:opacity-50"
            >
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 text-text-muted" />}
              <span>Run</span>
            </button>

            <button
              type="button"
              onClick={triggerProductionTransmit}
              disabled={running || submitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded text-xs font-medium bg-success text-black hover:opacity-90 transition-opacity disabled:opacity-50 font-semibold"
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* Terminal / Testcase Console Body */}
        <div
          ref={terminalRef}
          className="bg-bg border-t border-border/40 p-3.5 shrink-0 min-h-[170px] max-h-[250px] overflow-y-auto"
        >
          {/* TAB 1: Testcase (Seamless LeetCode Case Tabs & Input Parameters) */}
          {consoleTab === 'testcase' && (
            <div className="space-y-3 font-mono text-xs">
              {problem?.sampleTestCases?.length > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 pb-2 border-b border-border/30 overflow-x-auto">
                    {problem.sampleTestCases.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSampleIndex(idx)}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                          activeSampleIndex === idx
                            ? 'bg-surface-raised text-text border border-border/50 font-medium'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {problem.sampleTestCases[activeSampleIndex] && (
                    <div className="space-y-2.5 text-[11px]">
                      <div>
                        <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1 font-sans">
                          Input:
                        </span>
                        <div className="bg-surface-raised/30 border border-border/30 p-2.5 rounded text-text font-mono whitespace-pre-wrap">
                          {problem.sampleTestCases[activeSampleIndex].displayInput ||
                            problem.sampleTestCases[activeSampleIndex].input}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1 font-sans">
                          Expected Output:
                        </span>
                        <div className="bg-surface-raised/30 border border-border/30 p-2.5 rounded text-success font-mono whitespace-pre-wrap">
                          {problem.sampleTestCases[activeSampleIndex].output}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-text-muted text-xs font-mono py-4 text-center">
                  No sample test cases configured for this challenge.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Test Result */}
          {consoleTab === 'result' && (
            <>
              {terminalLogs ? (
                <div className="font-mono text-xs space-y-3">
                  {/* Error Output */}
                  {terminalLogs.mode === 'error' && (
                    <div className="p-2.5 rounded bg-danger/10 border border-danger/30 text-danger space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <ShieldAlert className="h-4 w-4" />
                        <span>Execution Error</span>
                      </div>
                      <pre className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed">
                        {terminalLogs.out}
                      </pre>
                    </div>
                  )}

                  {/* Sandbox Run Mode */}
                  {terminalLogs.mode === 'sandbox' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border/30">
                        <div className="flex items-center gap-1.5">
                          {terminalLogs.data.overallStatus?.toLowerCase() === 'accepted' ? (
                            <span className="font-medium text-success flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" /> Accepted
                            </span>
                          ) : (
                            <span className="font-medium text-danger flex items-center gap-1">
                              <XCircle className="h-4 w-4" />{' '}
                              {terminalLogs.data.overallStatus || 'Wrong Answer'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-text-muted font-mono">
                          {terminalLogs.data.passed} / {terminalLogs.data.total} passed
                        </span>
                      </div>

                      {/* Testcase Tabs */}
                      {terminalLogs.data.results?.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {terminalLogs.data.results.map((r, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveTestTab(idx)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                                  activeTestTab === idx
                                    ? 'bg-surface-raised text-text border border-border/50 font-medium'
                                    : 'text-text-muted hover:text-text'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    r.passed ? 'bg-success' : 'bg-danger'
                                  }`}
                                />
                                <span>Case {idx + 1}</span>
                              </button>
                            ))}
                          </div>

                          {/* Active Case Details */}
                          {terminalLogs.data.results[activeTestTab] && (
                            <div className="space-y-2 text-[11px]">
                              <div>
                                <span className="text-text-muted block text-[10px] mb-0.5">Input:</span>
                                <div className="bg-surface-raised/40 p-2 rounded text-text whitespace-pre-wrap">
                                  {terminalLogs.data.results[activeTestTab].displayInput ||
                                    terminalLogs.data.results[activeTestTab].input ||
                                    'N/A'}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-text-muted block text-[10px] mb-0.5">Output:</span>
                                  <div
                                    className={`p-2 rounded whitespace-pre-wrap ${
                                      terminalLogs.data.results[activeTestTab].passed
                                        ? 'bg-surface-raised/40 text-success'
                                        : 'bg-danger/10 text-danger border border-danger/20'
                                    }`}
                                  >
                                    {terminalLogs.data.results[activeTestTab].actualOutput || '(empty)'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-text-muted block text-[10px] mb-0.5">Expected:</span>
                                  <div className="bg-surface-raised/40 p-2 rounded text-success whitespace-pre-wrap">
                                    {terminalLogs.data.results[activeTestTab].expectedOutput || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Production Submission Mode */}
                  {terminalLogs.mode === 'production' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border/30">
                        <div>
                          {terminalLogs.data.status?.toLowerCase() === 'accepted' ? (
                            <span className="text-sm font-semibold text-success flex items-center gap-1.5">
                              <CheckCircle className="h-4 w-4" /> Accepted
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-danger flex items-center gap-1.5">
                              <XCircle className="h-4 w-4" /> {terminalLogs.data.status || 'Wrong Answer'}
                            </span>
                          )}
                          <div className="text-[11px] text-text-muted font-sans mt-0.5">
                            {terminalLogs.data.passedTestCases ?? 0} /{' '}
                            {terminalLogs.data.totalTestCases ?? 0} test cases passed.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (terminalLogs.data) {
                              handleSelectSubmission(terminalLogs.data);
                              setLeftTab('submissions');
                            } else {
                              setLeftTab('submissions');
                            }
                          }}
                          className="text-xs text-accent hover:underline flex items-center gap-1 font-sans font-medium cursor-pointer"
                        >
                          View Details & Code →
                        </button>
                      </div>

                      {/* Runtime & Memory Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-surface-raised/40 border border-border/30 rounded p-2.5 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-success" />
                          <div>
                            <span className="text-[10px] text-text-muted block">Runtime</span>
                            <span className="font-mono text-text font-medium">
                              {terminalLogs.data.runtime ?? 0} ms
                            </span>
                            {problemStats?.acceptedRuntimes?.length > 0 && terminalLogs.data.runtime != null && (
                              <span className="text-[10px] text-accent block font-mono">
                                Beats{' '}
                                {Math.round(
                                  (problemStats.acceptedRuntimes.filter((r) => r > terminalLogs.data.runtime).length /
                                    problemStats.acceptedRuntimes.length) *
                                    100
                                )}
                                % of users
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-surface-raised/40 border border-border/30 rounded p-2.5 flex items-center gap-2">
                          <HardDrive className="h-3.5 w-3.5 text-accent" />
                          <div>
                            <span className="text-[10px] text-text-muted block">Memory</span>
                            <span className="font-mono text-text font-medium">
                              {terminalLogs.data.memory ?? 0} MB
                            </span>
                            {problemStats?.acceptedMemories?.length > 0 && terminalLogs.data.memory != null && (
                              <span className="text-[10px] text-accent block font-mono">
                                Beats{' '}
                                {Math.round(
                                  (problemStats.acceptedMemories.filter((m) => m > terminalLogs.data.memory).length /
                                    problemStats.acceptedMemories.length) *
                                    100
                                )}
                                % of users
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full min-h-[110px] items-center justify-center text-text-muted text-xs font-mono space-y-1.5 py-4">
                  <Terminal className="h-4 w-4 text-text-muted" />
                  <span>You must run your code first to evaluate against test cases.</span>
                  <button
                    type="button"
                    onClick={triggerSandboxRun}
                    disabled={running || submitting}
                    className="mt-1 px-3 py-1 bg-surface-raised border border-border/40 rounded text-xs text-text hover:bg-surface-raised/80 transition-colors"
                  >
                    Run Code
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}