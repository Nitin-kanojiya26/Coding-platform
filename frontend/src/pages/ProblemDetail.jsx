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
  ExternalLink,
  ChevronDown,
  AlertTriangle
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
  const [mobileTab, setMobileTab] = useState('description'); // 'description' | 'code' | 'console'

  // Vertical testcases / console height state (LeetCode style)
  const [consoleHeight, setConsoleHeight] = useState(() => {
    const saved = localStorage.getItem('codexium_console_height');
    const parsed = saved ? parseFloat(saved) : 230;
    return isNaN(parsed) ? 230 : Math.min(Math.max(parsed, 100), 600);
  });
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [isDraggingConsole, setIsDraggingConsole] = useState(false);

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

  useEffect(() => {
    localStorage.setItem('codexium_console_height', String(consoleHeight));
  }, [consoleHeight]);

  // Horizontal resizer mouse drag handler
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Dragging event listeners for both horizontal and vertical resizers
  useEffect(() => {
    if (!isDragging && !isDraggingConsole) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Horizontal splitter: Problem Panel <-> Code Editor
      if (isDragging) {
        const clientX = e.clientX;
        const newPercent = ((clientX - rect.left) / rect.width) * 100;
        if (newPercent >= 20 && newPercent <= 80) {
          setSplitPercent(newPercent);
        }
      }

      // Vertical splitter: Code Editor <-> Test Cases & Console Drawer
      if (isDraggingConsole) {
        const newHeight = rect.bottom - e.clientY - 40;
        const maxHeight = Math.max(rect.height - 180, 200);
        if (newHeight >= 60 && newHeight <= maxHeight) {
          setConsoleHeight(newHeight);
          setConsoleOpen(true);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsDraggingConsole(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isDraggingConsole]);

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

  const activeCode = (codeByLang[language] !== undefined && codeByLang[language] !== '')
    ? codeByLang[language]
    : (defaultTemplates[language] || '');

  const handleCodeChange = (val) => {
    const text = val || '';
    setCodeByLang((prev) => ({ ...prev, [language]: text }));
  };

  const handleResetCode = () => {
    const template = defaultTemplates[language] || '';
    setCodeByLang((prev) => ({ ...prev, [language]: template }));
  };

  const triggerSandboxRun = async () => {
    setRunning(true);
    setTerminalLogs(null);
    setActiveTestTab(0);
    setConsoleTab('result');
    setConsoleOpen(true);
    setMobileTab('console');
    try {
      const res = await API.post(`/problems/${problem._id}/run`, {
        language,
        code: activeCode,
      });
      setTerminalLogs({ mode: 'sandbox', data: res.data });
    } catch (e) {
      const isOffline = e.response?.status === 503 || e.response?.data?.isServiceUnavailable;
      const message =
        e.response?.data?.message ||
        (isOffline
          ? 'The code execution engine is temporarily offline. Please try again shortly.'
          : 'Code execution encountered an error.');
      setTerminalLogs({
        mode: 'error',
        isServiceUnavailable: isOffline,
        out: message,
      });
    } finally {
      setRunning(false);
    }
  };

  const triggerProductionTransmit = async () => {
    setSubmitting(true);
    setTerminalLogs(null);
    setConsoleTab('result');
    setConsoleOpen(true);
    setMobileTab('console');
    try {
      const res = await API.post('/submissions', {
        problemId: problem._id,
        language,
        code: activeCode,
      });
      let submissionData = res.data.submission || res.data;
      const subId = res.data.submissionId || submissionData?._id;

      // Poll until BullMQ background worker finishes judging
      if (subId && submissionData.status === 'pending') {
        const maxAttempts = 30;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            const pollRes = await API.get(`/submissions/${subId}`);
            const updated = pollRes.data.submission || pollRes.data;
            if (updated && updated.status !== 'pending') {
              submissionData = updated;
              break;
            }
          } catch (pollErr) {
            console.error('Polling error:', pollErr);
          }
        }
      }

      setTerminalLogs({ mode: 'production', data: submissionData });

      // Refresh submissions telemetry and rate stats immediately
      fetchProblemSubmissions(problem._id);
      fetchProblemStats(problem._id);
    } catch (e) {
      const isOffline = e.response?.status === 503 || e.response?.data?.isServiceUnavailable;
      const message =
        e.response?.data?.message ||
        (isOffline
          ? 'The code execution engine is temporarily offline. Please try again shortly.'
          : 'Submission processing encountered an error.');
      setTerminalLogs({
        mode: 'error',
        isServiceUnavailable: isOffline,
        out: message,
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
      className={`h-[calc(100vh-3rem)] w-full flex flex-col lg:flex-row overflow-hidden bg-bg text-text select-none ${
        isDragging ? 'cursor-col-resize select-none' : isDraggingConsole ? 'cursor-row-resize select-none' : ''
      }`}
    >
      {/* ─── Mobile Navigation Tabs (< 1024px) ─── */}
      <div className="lg:hidden flex items-center justify-between border-b border-border/30 bg-bg px-2 py-1.5 shrink-0 z-30 select-none">
        <div className="flex items-center gap-1 flex-1">
          <button
            type="button"
            onClick={() => setMobileTab('description')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded text-center transition-colors ${
              mobileTab === 'description'
                ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Description
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('code')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded text-center transition-colors ${
              mobileTab === 'code'
                ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Code Editor
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab('console');
              setConsoleOpen(true);
            }}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded text-center transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === 'console'
                ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span>Console</span>
            {terminalLogs && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  terminalLogs.mode === 'error'
                    ? 'bg-rose-500'
                    : terminalLogs.data?.overallStatus?.toLowerCase() === 'accepted' || terminalLogs.data?.status?.toLowerCase() === 'accepted'
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
            )}
          </button>
        </div>
      </div>

      {/* ─── LEFT PANEL: Problem Workspace & Submissions ─── */}
      <div
        style={{ width: isDesktop ? `${splitPercent}%` : '100%' }}
        className={`w-full flex-col overflow-y-auto border-b lg:border-b-0 lg:border-r border-border/30 bg-bg shrink-0 pb-16 lg:pb-0 ${
          isDesktop ? 'flex' : mobileTab === 'description' ? 'flex flex-1 min-h-0' : 'hidden'
        }`}
      >
        {/* Left Panel Tabs Toolbar (LeetCode Style: Description, Submissions, Discussion) */}
        <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border/30 bg-bg shrink-0 text-xs select-none">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setLeftTab('description');
                setSelectedSubmission(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                leftTab === 'description'
                  ? 'bg-accent/15 text-accent font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Description</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('submissions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                leftTab === 'submissions'
                  ? 'bg-accent/15 text-accent font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Submissions</span>
              {submissionsList.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface-raised rounded-full text-text-muted">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
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
              className="p-1.5 rounded hover:bg-surface-raised text-text-muted hover:text-text transition-colors cursor-pointer"
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

        {/* ─── TAB 1: Problem Description (Contest Arena Seamless Style) ─── */}
        {leftTab === 'description' && (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto text-xs space-y-5 select-text">
            {/* Header info */}
            <div className="space-y-2 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold text-text">
                  {problem?.title}
                </h1>
              </div>

              <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                {problem?.difficulty && <DifficultyBadge difficulty={problem.difficulty} />}

                {problem?.timeLimit && (
                  <span className="text-[11px] font-mono text-text-muted">
                    Time Limit: {problem.timeLimit} ms
                  </span>
                )}

                {problem?.memoryLimit && (
                  <span className="text-[11px] font-mono text-text-muted">
                    Memory Limit: {problem.memoryLimit} MB
                  </span>
                )}

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
            </div>

            {/* Description Body */}
            <div className="leading-relaxed text-text space-y-3 font-sans text-xs sm:text-sm whitespace-pre-wrap">
              {problem?.description || problem?.statement || (
                <span className="text-text-muted italic">No problem statement provided.</span>
              )}
            </div>

            {/* Input Format */}
            {problem?.inputFormat && (
              <div className="space-y-1 pt-2">
                <h3 className="font-semibold text-text text-xs uppercase tracking-wider text-[11px]">
                  Input Format
                </h3>
                <div className="text-text-muted font-sans text-xs leading-relaxed whitespace-pre-wrap">
                  {problem.inputFormat}
                </div>
              </div>
            )}

            {/* Output Format */}
            {problem?.outputFormat && (
              <div className="space-y-1 pt-2">
                <h3 className="font-semibold text-text text-xs uppercase tracking-wider text-[11px]">
                  Output Format
                </h3>
                <div className="text-text-muted font-sans text-xs leading-relaxed whitespace-pre-wrap">
                  {problem.outputFormat}
                </div>
              </div>
            )}

            {/* Data structure hint */}
            {problem?.tags?.some((tag) =>
              ['linked list', 'tree', 'binary tree', 'graph'].includes(tag.toLowerCase())
            ) && (
              <div className="bg-warning/10 border border-warning/20 rounded p-3 text-xs text-warning/90 leading-relaxed font-sans">
                Please construct and use the intended data structure (Nodes, Pointers, Trees, etc.) in memory rather than flattening to an array.
              </div>
            )}

            {/* Examples / Test Cases (Exact Contest Arena Style) */}
            {(problem?.sampleTestCases || problem?.testCases)?.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border/30">
                <h3 className="font-semibold text-text uppercase tracking-wider text-[11px]">
                  Examples
                </h3>

                <div className="space-y-3">
                  {(problem.sampleTestCases || problem.testCases).map((tc, idx) => (
                    <div
                      key={idx}
                      className="bg-surface-raised/30 border border-border/30 rounded p-3 space-y-2 font-mono text-xs"
                    >
                      <div className="text-[11px] text-text-muted font-sans font-medium">
                        Example {idx + 1}:
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted font-mono mb-0.5">Input:</div>
                        <pre className="p-2 bg-surface-inset rounded border border-border/30 text-text overflow-x-auto text-xs whitespace-pre-wrap font-mono">
                          {tc.input || tc.displayInput || ''}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted font-mono mb-0.5">Output:</div>
                        <pre className="p-2 bg-surface-inset rounded border border-border/30 text-text overflow-x-auto text-xs whitespace-pre-wrap font-mono">
                          {tc.output || ''}
                        </pre>
                      </div>
                      {tc.explanation && (
                        <div className="text-[11px] text-text-muted font-sans pt-1">
                          <span className="font-medium text-text">Explanation: </span>
                          {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Constraints */}
            {problem?.constraints && (
              <div className="space-y-1.5 pt-3 border-t border-border/30">
                <h3 className="font-semibold text-text uppercase tracking-wider text-[11px]">
                  Constraints
                </h3>
                <div className="bg-surface-raised/30 border border-border/30 rounded p-2.5 font-mono text-xs text-text-muted whitespace-pre-wrap">
                  {problem.constraints}
                </div>
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
        className={`w-full flex-col h-full bg-bg relative flex-1 min-w-0 pb-14 lg:pb-0 ${
          isDragging || isDraggingConsole ? 'pointer-events-none select-none' : ''
        } ${isDesktop ? 'flex' : mobileTab !== 'description' ? 'flex' : 'hidden'}`}
      >
        {/* Editor Top Toolbar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border/30 bg-bg shrink-0">
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent border border-border/30 rounded px-2.5 py-1 text-xs font-mono text-text outline-none hover:border-border/60 cursor-pointer transition-colors"
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
              onClick={handleResetCode}
              className="p-1 rounded text-text-muted hover:text-text transition-colors flex items-center gap-1 text-xs cursor-pointer"
              title="Reset code to standard template"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px]">Reset</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 rounded text-text-muted hover:text-text transition-colors cursor-pointer"
              title="Copy code"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Monaco Code Editor */}
        <div className={`min-h-[140px] bg-[#1e1e1e] ${!isDesktop && mobileTab === 'console' ? 'hidden' : 'flex-1'}`}>
          <Editor
            height="100%"
            theme="vs-dark"
            language={LANGUAGES.find((l) => l.id === language)?.monaco || 'cpp'}
            value={activeCode}
            onChange={handleCodeChange}
            onMount={(editor, monaco) => {
              if (typeof document !== 'undefined' && document.fonts) {
                document.fonts.ready.then(() => {
                  monaco.editor.remeasureFonts();
                });
              }
            }}
            options={{
              fontSize: 13,
              fontFamily: `'JetBrains Mono', Menlo, Monaco, Consolas, 'Courier New', monospace`,
              letterSpacing: 0,
              fontLigatures: false,
              cursorStyle: 'line',
              cursorWidth: 2,
              cursorBlinking: 'smooth',
              minimap: { enabled: false },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
              padding: { top: 10 },
              lineNumbersMinChars: 3,
              automaticLayout: true,
            }}
          />
        </div>

        {/* ─── RESIZE HANDLE: Vertical Splitter between Editor and Test Cases / Console (only when console is open) ─── */}
        {consoleOpen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingConsole(true);
            }}
            className={`h-1.5 hover:h-2 relative z-20 cursor-row-resize flex items-center justify-center transition-all group shrink-0 select-none ${
              isDraggingConsole ? 'bg-accent/40' : 'bg-border/30 hover:bg-accent/30'
            }`}
            title="Drag to resize Console"
          >
            <div
              className={`h-0.5 w-10 rounded-full transition-colors ${
                isDraggingConsole ? 'bg-accent' : 'bg-text-muted/30 group-hover:bg-accent/80'
              }`}
            />
          </div>
        )}

        {/* ─── Drawer Content (Completely hidden when consoleOpen is false) ─── */}
        {consoleOpen && (isDesktop || mobileTab === 'console') && (
          <div
            style={{ height: (!isDesktop && mobileTab === 'console') ? '100%' : `${consoleHeight}px` }}
            className={`flex flex-col bg-bg overflow-hidden select-text ${!isDesktop && mobileTab === 'console' ? 'flex-1' : 'shrink-0'}`}
          >
            <div
              ref={terminalRef}
              className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3"
            >
              {/* TAB 1: Testcase (Clean, unboxed & seamless) */}
              {consoleTab === 'testcase' && (
                <div className="space-y-3 font-mono text-xs">
                  {problem?.sampleTestCases?.length > 0 ? (
                    <>
                      {/* Case selector pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                        {problem.sampleTestCases.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveSampleIndex(idx)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              activeSampleIndex === idx
                                ? 'bg-surface-raised text-text font-semibold shadow-xs'
                                : 'text-text-muted hover:text-text hover:bg-surface-raised/40'
                            }`}
                          >
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>

                      {/* Clean Unboxed Case Details */}
                      {problem.sampleTestCases[activeSampleIndex] && (
                        <div className="space-y-3 pt-1 text-xs">
                          <div className="space-y-1">
                            <span className="text-[11px] text-text-muted font-sans font-medium">Input =</span>
                            <div className="bg-surface-raised/40 px-3.5 py-2.5 rounded-lg font-mono text-xs text-text whitespace-pre-wrap select-text leading-relaxed">
                              {problem.sampleTestCases[activeSampleIndex].displayInput ||
                                problem.sampleTestCases[activeSampleIndex].input}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-text-muted font-sans font-medium">Expected =</span>
                            <div className="bg-surface-raised/40 px-3.5 py-2.5 rounded-lg font-mono text-xs text-emerald-400 whitespace-pre-wrap select-text leading-relaxed">
                              {problem.sampleTestCases[activeSampleIndex].output}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-text-muted text-xs font-mono py-6 text-center select-none">
                      No sample test cases configured for this challenge.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Test Result (Clean, unboxed & seamless) */}
              {consoleTab === 'result' && (
                <>
                  {terminalLogs ? (
                    <div className="font-mono text-xs space-y-3">
                      {/* Execution Error */}
                      {terminalLogs.mode === 'error' && (
                        <div
                          className={`p-3.5 rounded-lg space-y-1.5 ${
                            terminalLogs.isServiceUnavailable
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-xs">
                            {terminalLogs.isServiceUnavailable ? (
                              <>
                                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                                <span className="text-amber-300 font-bold">Execution Engine Notice</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                                <span>Execution Notice</span>
                              </>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-xs font-sans leading-relaxed select-text opacity-95">
                            {terminalLogs.out}
                          </p>
                        </div>
                      )}

                      {/* Sandbox Run Mode */}
                      {terminalLogs.mode === 'sandbox' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-1 text-xs">
                            <div className="flex items-center gap-2">
                              {terminalLogs.data.overallStatus?.toLowerCase() === 'accepted' ? (
                                <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-sm">
                                  <CheckCircle className="h-4 w-4" /> Accepted
                                </span>
                              ) : (
                                <span className="font-semibold text-rose-400 flex items-center gap-1.5 text-sm">
                                  <XCircle className="h-4 w-4" />{' '}
                                  {terminalLogs.data.overallStatus || 'Wrong Answer'}
                                </span>
                              )}
                              <span className="text-text-muted font-mono text-xs">
                                ({terminalLogs.data.passed} / {terminalLogs.data.total} passed)
                              </span>
                            </div>
                          </div>

                          {/* Result Case Tabs */}
                          {terminalLogs.data.results?.length > 0 && (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                                {terminalLogs.data.results.map((r, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveTestTab(idx)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                      activeTestTab === idx
                                        ? 'bg-surface-raised text-text font-semibold shadow-xs'
                                        : 'text-text-muted hover:text-text hover:bg-surface-raised/40'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        r.passed ? 'bg-emerald-400' : 'bg-rose-500'
                                      }`}
                                    />
                                    <span>Case {idx + 1}</span>
                                  </button>
                                ))}
                              </div>

                              {/* Active Case Details */}
                              {terminalLogs.data.results[activeTestTab] && (
                                <div className="space-y-2.5 text-xs">
                                  <div className="space-y-1">
                                    <span className="text-[11px] text-text-muted font-sans font-medium">Input =</span>
                                    <div className="bg-surface-raised/40 px-3.5 py-2.5 rounded-lg text-text whitespace-pre-wrap font-mono select-text leading-relaxed">
                                      {terminalLogs.data.results[activeTestTab].displayInput ||
                                        terminalLogs.data.results[activeTestTab].input ||
                                        'N/A'}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                      <span className="text-[11px] text-text-muted font-sans font-medium">Output =</span>
                                      <div
                                        className={`px-3.5 py-2.5 rounded-lg whitespace-pre-wrap font-mono select-text leading-relaxed ${
                                          terminalLogs.data.results[activeTestTab].passed
                                            ? 'bg-surface-raised/40 text-emerald-400'
                                            : 'bg-rose-500/10 text-rose-400'
                                        }`}
                                      >
                                        {terminalLogs.data.results[activeTestTab].actualOutput || '(empty)'}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[11px] text-text-muted font-sans font-medium">Expected =</span>
                                      <div className="bg-surface-raised/40 px-3.5 py-2.5 rounded-lg text-emerald-400 whitespace-pre-wrap font-mono select-text leading-relaxed">
                                        {terminalLogs.data.results[activeTestTab].expectedOutput || 'N/A'}
                                      </div>
                                    </div>
                                  </div>

                                  {(terminalLogs.data.results[activeTestTab].compile_output || terminalLogs.data.results[activeTestTab].stderr) && (
                                    <div className="space-y-1 pt-1">
                                      <span className="text-[11px] text-amber-400 font-sans font-medium">Compiler / Diagnostic Output =</span>
                                      <pre className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-lg font-mono text-xs whitespace-pre-wrap select-text leading-relaxed">
                                        {terminalLogs.data.results[activeTestTab].compile_output || terminalLogs.data.results[activeTestTab].stderr}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Production Submission Mode */}
                      {terminalLogs.mode === 'production' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-1">
                            <div>
                              {terminalLogs.data.status?.toLowerCase() === 'accepted' ? (
                                <span className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle className="h-5 w-5" /> Accepted
                                </span>
                              ) : terminalLogs.data.status?.toLowerCase() === 'error' ? (
                                <span className="text-base font-bold text-amber-400 flex items-center gap-1.5">
                                  <AlertTriangle className="h-5 w-5" /> Service Unavailable
                                </span>
                              ) : (
                                <span className="text-base font-bold text-rose-400 flex items-center gap-1.5">
                                  <XCircle className="h-5 w-5" /> {terminalLogs.data.status?.replace(/_/g, ' ') || 'Wrong Answer'}
                                </span>
                              )}
                              <div className="text-xs text-text-muted font-sans mt-0.5">
                                {terminalLogs.data.status?.toLowerCase() === 'error'
                                  ? (terminalLogs.data.errorLog || 'The execution service is temporarily offline. Please try again shortly.')
                                  : `${terminalLogs.data.passedTestCases ?? 0} / ${terminalLogs.data.totalTestCases ?? 0} test cases passed.`}
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

                          {/* Seamless Metric Chips without boxy cards */}
                          <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1">
                            <div className="bg-surface-raised/40 px-3 py-2 rounded-lg flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-text-muted">Runtime:</span>
                              <span className="font-mono text-text font-bold">
                                {terminalLogs.data.runtime ?? 0} ms
                              </span>
                              {problemStats?.acceptedRuntimes?.length > 0 && terminalLogs.data.runtime != null && (
                                <span className="text-[11px] text-accent font-mono ml-1">
                                  (Beats{' '}
                                  {Math.round(
                                    (problemStats.acceptedRuntimes.filter((r) => r > terminalLogs.data.runtime).length /
                                      problemStats.acceptedRuntimes.length) *
                                      100
                                  )}
                                  %)
                                </span>
                              )}
                            </div>

                            <div className="bg-surface-raised/40 px-3 py-2 rounded-lg flex items-center gap-2">
                              <HardDrive className="h-3.5 w-3.5 text-accent" />
                              <span className="text-text-muted">Memory:</span>
                              <span className="font-mono text-text font-bold">
                                {terminalLogs.data.memory ?? 0} MB
                              </span>
                              {problemStats?.acceptedMemories?.length > 0 && terminalLogs.data.memory != null && (
                                <span className="text-[11px] text-accent font-mono ml-1">
                                  (Beats{' '}
                                  {Math.round(
                                    (problemStats.acceptedMemories.filter((m) => m > terminalLogs.data.memory).length /
                                      problemStats.acceptedMemories.length) *
                                      100
                                  )}
                                  %)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col h-full min-h-[100px] items-center justify-center text-text-muted text-xs font-mono space-y-1.5 py-6 select-none">
                      <Terminal className="h-4 w-4 text-text-muted" />
                      <span>Run your code to test against example test cases.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Seamless LeetCode-Style Footer Bar ─── */}
        <div className="flex items-center justify-between px-3 h-10 border-t border-border/40 bg-surface/50 shrink-0 select-none">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConsoleOpen(!consoleOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                consoleOpen
                  ? 'bg-surface-raised text-text font-medium'
                  : 'text-text-muted hover:text-text hover:bg-surface-raised/50'
              }`}
              title={consoleOpen ? 'Collapse console' : 'Expand console'}
            >
              <Terminal className="h-3.5 w-3.5 text-accent" />
              <span>Console</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${consoleOpen ? '' : 'rotate-180'}`} />
            </button>

            {consoleOpen && (
              <div className="flex items-center gap-1 ml-1.5 pl-1.5 border-l border-border/30">
                <button
                  type="button"
                  onClick={() => setConsoleTab('testcase')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    consoleTab === 'testcase'
                      ? 'bg-surface-raised text-text font-medium'
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
                      ? 'bg-surface-raised text-text font-medium'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <span>Test Result</span>
                  {terminalLogs?.mode === 'sandbox' && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        terminalLogs.data?.overallStatus?.toLowerCase() === 'accepted'
                          ? 'bg-emerald-400'
                          : 'bg-rose-500'
                      }`}
                    />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={triggerSandboxRun}
              disabled={running || submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-raised hover:bg-surface-raised/80 text-text transition-colors border border-border/40 disabled:opacity-50 cursor-pointer"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> : <Play className="h-3.5 w-3.5 text-accent fill-accent/20" />}
              <span>Run</span>
            </button>

            <button
              type="button"
              onClick={triggerProductionTransmit}
              disabled={running || submitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#2cbb5d] hover:bg-[#2cbb5d]/90 text-white transition-all shadow-xs disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>Submit</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Persistent Mobile Bottom Action Bar (< 1024px) ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border/50 px-3 py-2 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-surface-raised border border-border/50 rounded px-2 py-1 text-xs font-mono text-text outline-none cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id} className="bg-[#121212] text-white">
                {lang.label.split(' ')[0]}
              </option>
            ))}
          </select>

          {/* Quick tab switch between Editor & Console */}
          <button
            type="button"
            onClick={() => {
              if (mobileTab === 'code') {
                setMobileTab('console');
                setConsoleOpen(true);
              } else {
                setMobileTab('code');
              }
            }}
            className="px-2 py-1 rounded text-xs text-text-muted hover:text-text bg-surface-raised/40 border border-border/40 font-mono flex items-center gap-1 cursor-pointer"
          >
            <Terminal className="h-3 w-3 text-accent" />
            <span>{mobileTab === 'code' ? 'Console' : 'Editor'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Run Button */}
          <button
            type="button"
            onClick={triggerSandboxRun}
            disabled={running || submitting}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-surface-raised hover:bg-surface-raised/80 text-text transition-colors border border-border/50 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> : <Play className="h-3.5 w-3.5 text-accent fill-accent/20" />}
            <span>Run</span>
          </button>

          {/* Mobile Submit Button */}
          <button
            type="button"
            onClick={triggerProductionTransmit}
            disabled={running || submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#2cbb5d] hover:bg-[#2cbb5d]/90 text-white transition-all shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
}