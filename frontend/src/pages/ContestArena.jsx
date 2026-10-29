import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useContestSocket } from '../hooks/useContestSocket';
import { toast } from 'react-hot-toast';
import {
  Trophy,
  Clock,
  Code2,
  Boxes,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Users,
  Radio,
  ArrowLeft,
  X,
  Crown,
  Medal,
  FileText,
  Check,
  ChevronRight,
  Terminal,
  ExternalLink,
  Play,
  ChevronDown,
  ShieldAlert,
  HardDrive,
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';
import RatingBadge from '../components/RatingBadge';
import { getAvatarSrc } from '../utils/avatar';

const LANGUAGES = [
  { id: 'cpp', label: 'C++ (GCC 14)', monaco: 'cpp', judge0Id: 54 },
  { id: 'java', label: 'Java (OpenJDK 21)', monaco: 'java', judge0Id: 62 },
  { id: 'python', label: 'Python 3', monaco: 'python', judge0Id: 71 },
  { id: 'javascript', label: 'JavaScript (Node.js)', monaco: 'javascript', judge0Id: 63 },
  { id: 'c', label: 'C (GCC 14)', monaco: 'c', judge0Id: 50 },
  { id: 'assembly', label: 'Assembly (NASM)', monaco: 'assembly', judge0Id: 45 },
  { id: 'cobol', label: 'COBOL', monaco: 'cobol', judge0Id: 77 },
];

const defaultTemplates = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}\n`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}\n`,
  python: `# Write your solution below\ndef solve(input_data):\n    # Your code here\n    return input_data\n`,
  javascript: `// Write your solution below\nfunction solve(input) {\n    // Your code here\n    return input;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}\n`,
  assembly: `section .data\n    ; Your code here\n\nsection .text\n    global _start\n\n_start:\n    ; Exit\n    mov eax, 60\n    xor edi, edi\n    syscall\n`,
  cobol: `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. SOLUTION.\n       PROCEDURE DIVISION.\n           * Your code here\n           STOP RUN.\n`,
};

function ContestUserAvatar({ avatar, name, className = "h-5 w-5 rounded" }) {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = getAvatarSrc(avatar);
  const hasAvatar = Boolean(avatar && !imgError);

  if (!hasAvatar) {
    const initials = (name || 'U').trim().slice(0, 2).toUpperCase();
    return (
      <div className={`flex items-center justify-center bg-surface-raised border border-border/60 font-mono text-text font-medium select-none overflow-hidden shrink-0 ${className}`}>
        <span className="text-[9px]">{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={avatarSrc}
      alt={name || 'User'}
      className={`${className} border border-border/60 object-cover bg-surface-raised shrink-0`}
      onError={() => setImgError(true)}
    />
  );
}

export default function ContestArena() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Panel state
  const [leftTab, setLeftTab] = useState('statement'); // 'statement' | 'submissions'
  const [mobileTab, setMobileTab] = useState('statement'); // 'statement' | 'code' | 'console'
  const [userSubmissions, setUserSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Editor & Language states
  const [language, setLanguage] = useState('cpp');
  const [codeStore, setCodeStore] = useState(() => {
    try {
      const saved = localStorage.getItem(`codexium_contest_code_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [judgingVerdict, setJudgingVerdict] = useState(null);

  // LeetCode-style Console & Runner states
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [consoleTab, setConsoleTab] = useState('testcase'); // 'testcase' | 'result'
  const [consoleHeight, setConsoleHeight] = useState(() => {
    const saved = localStorage.getItem('codexium_contest_console_h');
    const parsed = saved ? parseFloat(saved) : 230;
    return isNaN(parsed) ? 230 : Math.min(Math.max(parsed, 100), 550);
  });
  const [isDraggingConsole, setIsDraggingConsole] = useState(false);
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const [activeTestTab, setActiveTestTab] = useState(0);
  const [runningCode, setRunningCode] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [runError, setRunError] = useState(null);
  const terminalRef = useRef(null);

  // Standings slide-over
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);

  // Time remaining clock
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [isEnded, setIsEnded] = useState(false);

  // Solved problem tracker for active user in this contest
  const [solvedProblemIds, setSolvedProblemIds] = useState(new Set());

  // Resizable split state (percentage of left panel)
  const [splitPercent, setSplitPercent] = useState(() => {
    const saved = localStorage.getItem('codexium_contest_split');
    const parsed = saved ? parseFloat(saved) : 48;
    return isNaN(parsed) ? 48 : Math.min(Math.max(parsed, 25), 75);
  });
  const [isDragging, setIsDragging] = useState(false);

  // Real-time Socket.IO hook
  const {
    isConnected: socketConnected,
    standings: liveStandings,
    contestStatus: socketContestStatus,
    latestVerdict,
  } = useContestSocket(id);

  // Fetch contest details, problems, and standings
  const fetchContestData = async () => {
    try {
      setLoading(true);
      const [contestRes, problemsRes, standingsRes] = await Promise.all([
        API.get(`/contests/${id}`),
        API.get(`/contests/${id}/problems`).catch(() => ({ data: { problems: [] } })),
        API.get(`/contests/${id}/standings`).catch(() => ({ data: { standings: [] } })),
      ]);

      const cData = contestRes.data?.contest;
      setContest(cData);
      const probList = problemsRes.data?.problems || [];
      setProblems(probList);

      const stList = standingsRes.data?.standings || [];
      setLeaderboardData(stList);

      // Check which problems this user has already solved from standings
      const myStanding = stList.find(
        (s) => s.userId === user?.id || s.userId?._id === user?.id
      );
      if (myStanding?.problemResults) {
        const solvedSet = new Set();
        Object.entries(myStanding.problemResults).forEach(([pid, res]) => {
          if (res.solved) solvedSet.add(String(pid));
        });
        setSolvedProblemIds(solvedSet);
      }

      if (cData?.status === 'ended') {
        setIsEnded(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load contest.');
      navigate('/contests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContestData();
  }, [id, user?.id]);

  // Update live standings from Socket.IO
  useEffect(() => {
    if (liveStandings?.standings) {
      setLeaderboardData(liveStandings.standings);
      const myStanding = liveStandings.standings.find(
        (s) => s.userId === user?.id || s.userId?._id === user?.id
      );
      if (myStanding?.problemResults) {
        const solvedSet = new Set();
        Object.entries(myStanding.problemResults).forEach(([pid, res]) => {
          if (res.solved) solvedSet.add(String(pid));
        });
        setSolvedProblemIds(solvedSet);
      }
    }
  }, [liveStandings, user?.id]);

  // Robust problem normalization: extracts fields whether flat or nested inside `problem`
  const rawProb = problems[activeProblemIndex] || null;
  const innerProb = rawProb?.problem || {};
  const currentProblem = rawProb
    ? {
        ...innerProb,
        ...rawProb,
        _id: rawProb._id || innerProb._id || rawProb.problemId || innerProb.problemId,
        title: rawProb.title || innerProb.title || 'Challenge',
        description:
          rawProb.description ||
          innerProb.description ||
          innerProb.statement ||
          rawProb.statement ||
          '',
        difficulty: rawProb.difficulty || innerProb.difficulty || 'medium',
        testCases:
          rawProb.testCases ||
          rawProb.sampleTestCases ||
          innerProb.sampleTestCases ||
          innerProb.visibleTests ||
          [],
        timeLimit: rawProb.timeLimit || innerProb.timeLimit || 2000,
        constraints: rawProb.constraints || innerProb.constraints || '',
        label: rawProb.label || String.fromCharCode(65 + activeProblemIndex),
        points: rawProb.points || innerProb.points || 100,
      }
    : null;

  const currentProblemId = currentProblem ? String(currentProblem._id || currentProblem.problemId) : null;
  const isCurrentProblemSolved = currentProblemId && solvedProblemIds.has(currentProblemId);

  // Active code for currently selected problem and language
  const activeCode = currentProblemId
    ? codeStore[`${currentProblemId}_${language}`] ?? defaultTemplates[language] ?? ''
    : defaultTemplates[language] ?? '';

  const handleCodeChange = (val) => {
    if (!currentProblemId) return;
    setCodeStore((prev) => ({
      ...prev,
      [`${currentProblemId}_${language}`]: val || '',
    }));
  };

  const handleResetCode = () => {
    if (!currentProblemId) return;
    setCodeStore((prev) => ({
      ...prev,
      [`${currentProblemId}_${language}`]: defaultTemplates[language] || '',
    }));
  };

  // Persist code per contest and console height
  useEffect(() => {
    try {
      localStorage.setItem(`codexium_contest_code_${id}`, JSON.stringify(codeStore));
    } catch (_) {}
  }, [codeStore, id]);

  useEffect(() => {
    localStorage.setItem('codexium_contest_console_h', String(consoleHeight));
  }, [consoleHeight]);

  // Vertical console resize listener (drag row)
  useEffect(() => {
    const handleConsoleMove = (e) => {
      if (!isDraggingConsole) return;
      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY - 44;
      if (newHeight >= 90 && newHeight <= windowHeight * 0.75) {
        setConsoleHeight(newHeight);
      }
    };

    const handleConsoleUp = () => {
      if (isDraggingConsole) setIsDraggingConsole(false);
    };

    if (isDraggingConsole) {
      window.addEventListener('mousemove', handleConsoleMove);
      window.addEventListener('mouseup', handleConsoleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleConsoleMove);
      window.removeEventListener('mouseup', handleConsoleUp);
    };
  }, [isDraggingConsole]);

  // Handle verdict received from WebSocket or polling
  const handleVerdictReceived = (verdict, toastId) => {
    if (toastId) toast.dismiss(toastId);
    setSubmitting(false);
    setJudgingVerdict(verdict);
    setConsoleTab('result');
    setConsoleOpen(true);
    setMobileTab('console');

    const isAccepted =
      verdict.status?.toLowerCase() === 'accepted' || verdict.status?.toLowerCase() === 'ac';

    if (isAccepted) {
      toast.success('Accepted! Problem Solved.', { duration: 4000 });
      if (currentProblemId) {
        setSolvedProblemIds((prev) => new Set([...prev, currentProblemId]));
      }
    } else {
      toast.error(`Verdict: ${verdict.status?.toUpperCase() || 'Rejected'}`, {
        duration: 4000,
      });
    }

    fetchMySubmissions();
    API.get(`/contests/${id}/standings`).then((res) => {
      if (res.data?.standings) {
        setLeaderboardData(res.data.standings);
      }
    }).catch(() => {});
  };

  // Handle live submission verdict
  useEffect(() => {
    if (latestVerdict) {
      handleVerdictReceived(latestVerdict);
    }
  }, [latestVerdict]);

  // Live countdown clock to contest start or end
  useEffect(() => {
    if (!contest) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(contest.startTime).getTime();
      const end = new Date(contest.endTime).getTime();

      if (now < start && contest.status === 'scheduled') {
        const diff = start - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(
          `Starts in ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        const diff = end - now;
        if (diff <= 0 || socketContestStatus === 'ended') {
          setTimeRemaining('00:00:00');
          setIsEnded(true);
          clearInterval(interval);
        } else {
          // If problems were not loaded because it was scheduled, re-fetch now!
          if (problems.length === 0 && contest.status === 'scheduled') {
            fetchContestData();
          }
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining(
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          );
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest?.startTime, contest?.endTime, contest?.status, socketContestStatus, problems.length]);

  // Handle drag resizing between left and right split panes
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const newPercent = (e.clientX / window.innerWidth) * 100;
      if (newPercent >= 20 && newPercent <= 80) {
        setSplitPercent(newPercent);
        localStorage.setItem('codexium_contest_split', newPercent.toString());
      }
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Fetch submissions for current problem
  const fetchMySubmissions = async () => {
    const rawProb = problems[activeProblemIndex];
    if (!rawProb || !contest) return;
    try {
      setLoadingSubmissions(true);
      const pid = rawProb._id || rawProb.problemId || rawProb.problem?._id;
      const res = await API.get(`/contests/${id}/submissions`, {
        params: { problemId: pid },
      }).catch(() => null);

      if (res?.data?.submissions) {
        setUserSubmissions(res.data.submissions);
      }
    } catch (_) {
      // ignore
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (leftTab === 'submissions') {
      fetchMySubmissions();
    }
  }, [leftTab, activeProblemIndex]);

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
  };

  // Run code against example test cases (LeetCode-style runner)
  const handleRunCode = async () => {
    if (!currentProblemId) {
      toast.error('No challenge selected.');
      return;
    }

    if (!activeCode.trim()) {
      toast.error('Please write some code before running.');
      return;
    }

    if (contest?.type === 'api') {
      toast('Backend APIs track requires repository submission to verify full suite.', { icon: '📦' });
      return;
    }

    setRunningCode(true);
    setRunResults(null);
    setRunError(null);
    setActiveTestTab(0);
    setConsoleTab('result');
    setConsoleOpen(true);
    setMobileTab('console');

    try {
      const res = await API.post(`/problems/${currentProblemId}/run`, {
        language,
        code: activeCode,
      });
      setRunResults(res.data);
      if (res.data?.overallStatus?.toLowerCase() === 'accepted') {
        toast.success('Sample test cases passed!', { id: 'run-toast' });
      } else {
        toast.error(res.data?.overallStatus?.toUpperCase() || 'Sample test cases failed', { id: 'run-toast' });
      }
    } catch (err) {
      const isOffline = err.response?.status === 503 || err.response?.data?.isServiceUnavailable;
      const message =
        err.response?.data?.message ||
        (isOffline
          ? 'The code execution engine is temporarily offline. Please try again shortly.'
          : 'Execution encountered an error.');
      setRunError(message);
      toast.error(isOffline ? 'Execution engine offline' : 'Execution notice', { id: 'run-toast' });
    } finally {
      setRunningCode(false);
    }
  };

  // Submit code for official judging or post-contest practice evaluation
  const handleSubmit = async () => {
    if (!currentProblemId) {
      toast.error('No challenge selected.');
      return;
    }

    if (!activeCode.trim()) {
      toast.error('Please write some code before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setJudgingVerdict(null);
      setConsoleTab('result');
      setConsoleOpen(true);

      const submitToastId = toast.loading(
        isEnded ? 'Submitting solution for practice evaluation...' : 'Submitting solution for judging...'
      );

      let submissionId = null;
      if (contest.type === 'dsa') {
        const selectedLang = LANGUAGES.find((l) => l.id === language);
        const res = await API.post('/submissions', {
          problemId: currentProblemId,
          contestId: contest._id,
          code: activeCode,
          language,
          languageId: selectedLang?.judge0Id || 63,
        });
        submissionId = res.data?.submissionId || res.data?.submission?._id;
        if (res.data?.mode === 'sync' && res.data?.submission) {
          handleVerdictReceived(res.data.submission, submitToastId);
          return;
        }
      } else {
        const res = await API.post('/build/submissions', {
          problemId: currentProblemId,
          contestId: contest._id,
          repoUrl: activeCode.trim(),
        });
        submissionId = res.data?.submissionId || res.data?.submission?._id;
      }

      // Asynchronous verdict resolution with polling fallback
      if (submissionId) {
        let finished = false;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1200));
          try {
            const pollRes = await API.get(`/submissions/${submissionId}`);
            const sub = pollRes.data?.submission || pollRes.data;
            if (sub && sub.status && sub.status !== 'pending') {
              handleVerdictReceived(sub, submitToastId);
              finished = true;
              break;
            }
          } catch (_) {}
        }
        if (!finished) {
          toast.dismiss(submitToastId);
          setSubmitting(false);
          toast('Evaluation in progress. Results will update automatically.', { icon: '⏳' });
        }
      } else {
        toast.dismiss(submitToastId);
        setSubmitting(false);
      }
    } catch (err) {
      setSubmitting(false);
      const isOffline = err.response?.status === 503 || err.response?.data?.isServiceUnavailable;
      const message =
        err.response?.data?.message ||
        (isOffline
          ? 'The code execution engine is temporarily offline. Please try submitting again shortly.'
          : 'Error submitting solution.');
      toast.error(message);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded text-warning" title="1st Place">
          <Crown className="w-3.5 h-3.5 fill-warning/20 text-warning" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded text-zinc-400" title="2nd Place">
          <Medal className="w-3.5 h-3.5 fill-zinc-400/20 text-zinc-400" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded text-amber-600" title="3rd Place">
          <Medal className="w-3.5 h-3.5 fill-amber-600/20 text-amber-600" />
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-text-muted w-5 text-center">
        {rank}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-bg text-text-muted text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        <span>Loading contest workspace...</span>
      </div>
    );
  }

  return (
    <div
      className={`h-[calc(100vh-3.5rem)] flex flex-col bg-bg text-text overflow-hidden select-none ${
        isDragging ? 'cursor-col-resize select-none' : ''
      }`}
    >
      {/* ─── Top Contest Header ──────── */}
      <header className="h-10 bg-bg border-b border-border/30 px-4 sm:px-6 shrink-0 text-xs select-none z-30">
        <div className="w-full max-w-7xl mx-auto h-full flex items-center justify-between gap-3">
          {/* Left: Back Link & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to={`/contests/${id}`}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-raised transition-colors shrink-0"
              title="Return to Contest Lobby"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>

            <span className="font-semibold text-text truncate max-w-[160px] sm:max-w-xs text-xs">
              {contest?.title}
            </span>

            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border/40 text-text-muted uppercase shrink-0">
              {contest?.type === 'dsa' ? 'Algorithms' : 'Backend APIs'}
            </span>
          </div>

          {/* Center: Problem Switcher Tabs (A, B, C, D) */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {problems.map((prob, idx) => {
              const letter = prob.label || String.fromCharCode(65 + idx);
              const isActive = activeProblemIndex === idx;
              const probId = String(prob._id || prob.problemId || prob.problem?._id);
              const isSolved = solvedProblemIds.has(probId);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveProblemIndex(idx);
                    setJudgingVerdict(null);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors shrink-0 ${
                    isActive
                      ? 'bg-accent/15 text-accent font-semibold border border-accent/40'
                      : 'text-text-muted hover:text-text hover:bg-surface-raised/40 border border-transparent'
                  }`}
                >
                  <span>{letter}</span>
                  {isSolved ? (
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0" title="Solved" />
                  ) : (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        (prob.difficulty || prob.problem?.difficulty || '').toLowerCase() === 'easy'
                          ? 'bg-success'
                          : (prob.difficulty || prob.problem?.difficulty || '').toLowerCase() === 'medium'
                          ? 'bg-warning'
                          : 'bg-danger'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Timer, Live Beacon & Leaderboard Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Real-time countdown timer */}
            <div
              className={`font-mono text-xs px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                isEnded
                  ? 'bg-surface-raised text-text-muted border-border/40'
                  : 'bg-surface-raised/60 text-text border-border/40'
              }`}
              title="Time Remaining"
            >
              <Clock className="w-3 h-3 text-text-muted" />
              <span className={isEnded ? 'text-text-muted font-semibold' : 'font-semibold text-text'}>
                {isEnded ? 'ENDED' : timeRemaining}
              </span>
            </div>

            {/* Connection Beacon */}
            <div
              className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-text-muted"
              title={socketConnected ? 'Live Connection Active' : 'Connecting...'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  socketConnected ? 'bg-success' : 'bg-warning animate-pulse'
                }`}
              />
              <span>LIVE</span>
            </div>

            {/* Standings Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !showLeaderboard;
                setShowLeaderboard(next);
                if (next) {
                  API.get(`/contests/${id}/standings`).then((res) => {
                    if (res.data?.standings) {
                      setLeaderboardData(res.data.standings);
                    }
                  }).catch(() => {});
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors border ${
                showLeaderboard
                  ? 'bg-accent/15 text-accent border-accent/40 font-medium'
                  : 'bg-surface-raised border-border/40 text-text hover:bg-surface-raised/80'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-warning" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Navigation Tabs (< 1024px) ─── */}
      <div className="lg:hidden flex items-center justify-between border-b border-border/30 bg-bg px-2 py-1.5 shrink-0 z-30 select-none">
        <div className="flex items-center gap-1 flex-1">
          <button
            type="button"
            onClick={() => setMobileTab('statement')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded text-center transition-colors ${
              mobileTab === 'statement'
                ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Statement
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
            Code
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
            {(runResults || judgingVerdict) && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (runResults?.overallStatus?.toLowerCase() === 'accepted' || judgingVerdict?.status?.toLowerCase() === 'accepted')
                    ? 'bg-emerald-400'
                    : 'bg-rose-500'
                }`}
              />
            )}
          </button>
        </div>
      </div>

      {/* ─── Main Workspace: Split Pane (Left Statement / Right Editor) ─ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-bg">
        
        {/* ─── LEFT PANEL: Problem Statement & Submissions ─── */}
        <div
          style={{ width: window.innerWidth >= 1024 ? `${splitPercent}%` : '100%' }}
          className={`w-full flex-col overflow-y-auto border-b lg:border-b-0 lg:border-r border-border/30 bg-bg shrink-0 pb-16 lg:pb-0 ${
            window.innerWidth >= 1024 ? 'flex' : mobileTab === 'statement' ? 'flex flex-1 min-h-0' : 'hidden'
          }`}
        >
          {/* Left Panel Tabs (Description | My Submissions) */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-bg shrink-0 text-xs select-none">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLeftTab('statement')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  leftTab === 'statement'
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>Description</span>
              </button>

              <button
                type="button"
                onClick={() => setLeftTab('submissions')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  leftTab === 'submissions'
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span>My Submissions</span>
              </button>
            </div>

            {/* Solved Status Indicator */}
            {isCurrentProblemSolved && (
              <span className="text-[11px] font-mono text-success flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Solved
              </span>
            )}
          </div>

          {/* Left Panel Content */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto text-xs space-y-5">
            {leftTab === 'statement' ? (
              currentProblem ? (
                <>
                  {/* Problem Title & Difficulty */}
                  <div className="space-y-2 pb-3 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-accent text-sm">
                        {currentProblem.label || String.fromCharCode(65 + activeProblemIndex)}.
                      </span>
                      <h1 className="text-base font-semibold text-text">
                        {currentProblem.title}
                      </h1>
                    </div>

                    <div className="flex items-center gap-3 pt-0.5">
                      <DifficultyBadge difficulty={currentProblem.difficulty || 'medium'} />

                      <span className="text-[11px] font-mono text-text-muted">
                        Time Limit: {currentProblem.timeLimit || 2000} ms
                      </span>

                      {currentProblem.points && (
                        <span className="text-[11px] font-mono text-text-muted">
                          Score: {currentProblem.points} pts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className="text-text leading-relaxed space-y-3 font-sans text-xs sm:text-sm whitespace-pre-wrap">
                    {currentProblem.description || currentProblem.statement || (
                      <span className="text-text-muted italic">No problem statement provided.</span>
                    )}
                  </div>

                  {/* Input / Output Format */}
                  {currentProblem.inputFormat && (
                    <div className="space-y-1 pt-2">
                      <h3 className="font-semibold text-text text-xs uppercase tracking-wider text-[11px]">
                        Input Format
                      </h3>
                      <div className="text-text-muted font-sans text-xs leading-relaxed whitespace-pre-wrap">
                        {currentProblem.inputFormat}
                      </div>
                    </div>
                  )}

                  {currentProblem.outputFormat && (
                    <div className="space-y-1 pt-2">
                      <h3 className="font-semibold text-text text-xs uppercase tracking-wider text-[11px]">
                        Output Format
                      </h3>
                      <div className="text-text-muted font-sans text-xs leading-relaxed whitespace-pre-wrap">
                        {currentProblem.outputFormat}
                      </div>
                    </div>
                  )}

                  {/* Examples / Test Cases */}
                  {currentProblem.testCases && currentProblem.testCases.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <h3 className="font-semibold text-text uppercase tracking-wider text-[11px]">
                        Examples
                      </h3>

                      <div className="space-y-3">
                        {currentProblem.testCases.map((tc, idx) => (
                          <div
                            key={idx}
                            className="bg-surface-raised/30 border border-border/30 rounded p-3 space-y-2 font-mono text-xs"
                          >
                            <div className="text-[11px] text-text-muted font-sans font-medium">
                              Example {idx + 1}:
                            </div>
                            <div>
                              <div className="text-[10px] text-text-muted font-mono mb-0.5">Input:</div>
                              <pre className="p-2 bg-surface-inset rounded border border-border/30 text-text overflow-x-auto text-xs whitespace-pre-wrap">
                                {tc.input || tc.displayInput || ''}
                              </pre>
                            </div>
                            <div>
                              <div className="text-[10px] text-text-muted font-mono mb-0.5">Output:</div>
                              <pre className="p-2 bg-surface-inset rounded border border-border/30 text-text overflow-x-auto text-xs whitespace-pre-wrap">
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
                  {currentProblem.constraints && (
                    <div className="space-y-1.5 pt-3 border-t border-border/30">
                      <h3 className="font-semibold text-text uppercase tracking-wider text-[11px]">
                        Constraints
                      </h3>
                      <div className="bg-surface-raised/30 border border-border/30 rounded p-2.5 font-mono text-xs text-text-muted whitespace-pre-wrap">
                        {currentProblem.constraints}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center text-text-muted text-xs space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-accent/60" />
                  <div className="font-semibold text-text text-sm">
                    {contest?.status === 'scheduled' ? 'Contest Starts Soon' : 'No Challenges Available'}
                  </div>
                  <p className="text-text-muted max-w-sm mx-auto text-xs">
                    {contest?.status === 'scheduled'
                      ? 'The problem descriptions will unlock automatically when the contest begins.'
                      : 'No challenges found for this contest.'}
                  </p>
                </div>
              )
            ) : (
              /* ─── Submissions Tab View ─── */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                  <span className="font-semibold text-text text-xs">
                    My Submissions for Problem {currentProblem?.label || String.fromCharCode(65 + activeProblemIndex)}
                  </span>
                  <button
                    type="button"
                    onClick={fetchMySubmissions}
                    className="text-[11px] text-accent hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {loadingSubmissions ? (
                  <div className="py-12 text-center text-text-muted text-xs space-y-2">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-accent" />
                    <span>Loading submissions...</span>
                  </div>
                ) : userSubmissions.length === 0 ? (
                  <div className="py-12 text-center text-text-muted text-xs space-y-1.5">
                    <Clock className="w-5 h-5 mx-auto text-text-muted" />
                    <p>No submissions recorded for this challenge yet.</p>
                  </div>
                ) : (
                  <div className="border border-border/30 rounded overflow-hidden">
                    <div className="grid grid-cols-12 px-3 py-2 bg-surface-raised/40 text-[11px] font-medium text-text-muted border-b border-border/30 font-mono">
                      <div className="col-span-5">Verdict</div>
                      <div className="col-span-3">Language</div>
                      <div className="col-span-2 text-right">Runtime</div>
                      <div className="col-span-2 text-right">Time</div>
                    </div>

                    <div className="divide-y divide-border/20">
                      {userSubmissions.map((sub, idx) => {
                        const isAc =
                          sub.status?.toLowerCase() === 'accepted' || sub.status?.toLowerCase() === 'ac';
                        return (
                          <div
                            key={sub._id || idx}
                            className="grid grid-cols-12 px-3 py-2 items-center text-xs hover:bg-surface-raised/35 transition-colors font-mono"
                          >
                            <div className="col-span-5 min-w-0 pr-2">
                              <span
                                className={`font-medium ${
                                  isAc ? 'text-success' : 'text-danger'
                                }`}
                              >
                                {sub.status || 'Pending'}
                              </span>
                            </div>
                            <div className="col-span-3 text-text-muted capitalize text-[11px]">
                              {sub.language || 'cpp'}
                            </div>
                            <div className="col-span-2 text-right text-text">
                              {sub.runtime != null ? `${sub.runtime}ms` : '—'}
                            </div>
                            <div className="col-span-2 text-right text-text-muted text-[10px]">
                              {new Date(sub.createdAt || sub.submittedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
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
        </div>

        {/* ─── Resizable Drag Handle ─── */}
        <div
          onMouseDown={() => setIsDragging(true)}
          className="hidden lg:flex w-1 bg-border/20 hover:bg-accent/40 cursor-col-resize items-center justify-center transition-colors select-none shrink-0"
        />

        {/* ─── RIGHT PANEL: Code Workspace & Action Bar ─── */}
        <div className={`flex-1 flex-col bg-bg overflow-hidden min-w-0 pb-14 lg:pb-0 ${window.innerWidth >= 1024 ? 'flex' : mobileTab !== 'statement' ? 'flex' : 'hidden'}`}>
          
          {/* Editor Top Toolbar */}
          <div className="h-9 bg-bg border-b border-border/30 px-3 flex items-center justify-between shrink-0 text-xs select-none">
            {contest.type === 'dsa' ? (
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-text-muted" />
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-surface border border-border text-text text-xs rounded px-2 py-0.5 focus:outline-none focus:border-border font-mono cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
                <Boxes className="w-3.5 h-3.5 text-accent-build" />
                <span>Backend APIs: Solution Repository</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetCode}
              className="text-text-muted hover:text-text text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset code to default template"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Code Editor or API input */}
          <div className={`relative overflow-hidden bg-[#1e1e1e] ${window.innerWidth < 1024 && mobileTab === 'console' ? 'hidden' : 'flex-1'}`}>
            {contest.type === 'dsa' ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={
                  LANGUAGES.find((l) => l.id === language)?.monaco || language
                }
                value={activeCode}
                onChange={(newVal) => handleCodeChange(newVal || '')}
                onMount={(editor, monaco) => {
                  if (typeof document !== 'undefined' && document.fonts) {
                    document.fonts.ready.then(() => {
                      monaco.editor.remeasureFonts();
                    });
                  }
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: `'JetBrains Mono', Menlo, Monaco, Consolas, 'Courier New', monospace`,
                  letterSpacing: 0,
                  fontLigatures: false,
                  cursorStyle: 'line',
                  cursorWidth: 2,
                  cursorBlinking: 'smooth',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  automaticLayout: true,
                  padding: { top: 10 },
                }}
              />
            ) : (
              <div className="p-6 h-full flex flex-col justify-center max-w-lg mx-auto space-y-4 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-text font-medium block">
                    Public Git Repository URL:
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Enter your repository link. We will test your solution and update your score.
                  </p>
                </div>
                <input
                  type="url"
                  placeholder="https://github.com/username/api-project"
                  value={activeCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border text-text rounded focus:outline-none focus:border-accent"
                />
              </div>
            )}
          </div>

          {/* ─── RESIZE HANDLE: Vertical Splitter between Editor and Console ─── */}
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

          {/* ─── LeetCode-style Console Drawer ─── */}
          {consoleOpen && (window.innerWidth >= 1024 || mobileTab === 'console') && (
            <div
              style={{ height: (window.innerWidth < 1024 && mobileTab === 'console') ? '100%' : `${consoleHeight}px` }}
              className={`flex flex-col bg-bg border-t border-border/30 overflow-hidden select-text ${window.innerWidth < 1024 && mobileTab === 'console' ? 'flex-1' : 'shrink-0'}`}
            >
              <div
                ref={terminalRef}
                className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3"
              >
                {/* TAB 1: Testcase */}
                {consoleTab === 'testcase' && (
                  <div className="space-y-3 font-mono text-xs">
                    {currentProblem?.testCases && currentProblem.testCases.length > 0 ? (
                      <>
                        {/* Case selector pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                          {currentProblem.testCases.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveSampleIndex(idx)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                activeSampleIndex === idx
                                  ? 'bg-surface-raised text-text font-semibold shadow-xs border border-border/50'
                                  : 'text-text-muted hover:text-text hover:bg-surface-raised/40 border border-transparent'
                              }`}
                            >
                              Case {idx + 1}
                            </button>
                          ))}
                        </div>

                        {/* Active Case Details */}
                        {currentProblem.testCases[activeSampleIndex] && (
                          <div className="space-y-2.5 pt-1 text-xs">
                            <div className="space-y-1">
                              <span className="text-[11px] text-text-muted font-sans font-medium">Input =</span>
                              <div className="bg-surface-raised/40 px-3.5 py-2 rounded font-mono text-xs text-text whitespace-pre-wrap select-text leading-relaxed border border-border/20">
                                {currentProblem.testCases[activeSampleIndex].input ||
                                  currentProblem.testCases[activeSampleIndex].displayInput ||
                                  ''}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] text-text-muted font-sans font-medium">Expected Output =</span>
                              <div className="bg-surface-raised/40 px-3.5 py-2 rounded font-mono text-xs text-emerald-400 whitespace-pre-wrap select-text leading-relaxed border border-border/20">
                                {currentProblem.testCases[activeSampleIndex].output || ''}
                              </div>
                            </div>
                            {currentProblem.testCases[activeSampleIndex].explanation && (
                              <div className="text-[11px] text-text-muted font-sans pt-0.5">
                                <span className="font-medium text-text">Explanation: </span>
                                {currentProblem.testCases[activeSampleIndex].explanation}
                              </div>
                            )}
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

                {/* TAB 2: Test Result */}
                {consoleTab === 'result' && (
                  <div className="space-y-3 font-mono text-xs">
                    {runningCode ? (
                      <div className="py-8 flex flex-col items-center justify-center text-text-muted text-xs font-mono gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        <span>Running code against sample test cases...</span>
                      </div>
                    ) : runError ? (
                      <div
                        className={`p-3.5 rounded-lg border space-y-1.5 ${
                          runError.toLowerCase().includes('offline') || runError.toLowerCase().includes('temporarily')
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs">
                          {runError.toLowerCase().includes('offline') || runError.toLowerCase().includes('temporarily') ? (
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
                          {runError}
                        </p>
                      </div>
                    ) : runResults ? (
                      <div className="space-y-3">
                        {/* Overall Status Banner */}
                        <div className="flex items-center justify-between pb-1 text-xs">
                          <div className="flex items-center gap-2">
                            {runResults.overallStatus?.toLowerCase() === 'accepted' ? (
                              <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-sm">
                                <CheckCircle2 className="h-4 w-4" /> Accepted
                              </span>
                            ) : (
                              <span className="font-semibold text-rose-400 flex items-center gap-1.5 text-sm">
                                <XCircle className="h-4 w-4" />{' '}
                                {runResults.overallStatus === 'wrong_answer'
                                  ? 'Wrong Answer'
                                  : runResults.overallStatus?.toUpperCase() || 'Execution Error'}
                              </span>
                            )}
                            <span className="text-text-muted font-mono text-xs">
                              ({runResults.passed} / {runResults.total} passed)
                            </span>
                          </div>
                        </div>

                        {/* Result Case Tabs */}
                        {runResults.results?.length > 0 && (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                              {runResults.results.map((r, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setActiveTestTab(idx)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                    activeTestTab === idx
                                      ? 'bg-surface-raised text-text font-semibold shadow-xs border border-border/50'
                                      : 'text-text-muted hover:text-text hover:bg-surface-raised/40 border border-transparent'
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

                            {/* Active Case Result Details */}
                            {runResults.results[activeTestTab] && (
                              <div className="space-y-2.5 text-xs">
                                <div className="space-y-1">
                                  <span className="text-[11px] text-text-muted font-sans font-medium">Input =</span>
                                  <div className="bg-surface-raised/40 px-3.5 py-2 rounded text-text whitespace-pre-wrap font-mono select-text leading-relaxed border border-border/20">
                                    {runResults.results[activeTestTab].displayInput ||
                                      runResults.results[activeTestTab].input ||
                                      ''}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <div className="space-y-1">
                                    <span className="text-[11px] text-text-muted font-sans font-medium">Output (Your Code) =</span>
                                    <div
                                      className={`px-3.5 py-2 rounded whitespace-pre-wrap font-mono select-text leading-relaxed border ${
                                        runResults.results[activeTestTab].passed
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      }`}
                                    >
                                      {runResults.results[activeTestTab].actualOutput || '(empty)'}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[11px] text-text-muted font-sans font-medium">Expected Output =</span>
                                    <div className="bg-surface-raised/40 px-3.5 py-2 rounded text-emerald-400 whitespace-pre-wrap font-mono select-text leading-relaxed border border-border/20">
                                      {runResults.results[activeTestTab].expectedOutput || ''}
                                    </div>
                                  </div>
                                </div>

                                {runResults.results[activeTestTab].stderr && (
                                  <div className="space-y-1 pt-1">
                                    <span className="text-[11px] text-amber-400 font-sans font-medium">Stderr / Compiler Messages =</span>
                                    <pre className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded font-mono text-xs whitespace-pre-wrap select-text leading-relaxed">
                                      {runResults.results[activeTestTab].stderr}
                                    </pre>
                                  </div>
                                )}

                                {runResults.results[activeTestTab].runtime != null && (
                                  <div className="text-[11px] font-mono text-text-muted pt-0.5">
                                    Execution time: {runResults.results[activeTestTab].runtime}ms
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : judgingVerdict ? (
                      /* Official Submission Verdict with Green Sign if Accepted */
                      <div className="space-y-3">
                        <div
                          className={`p-3.5 rounded-lg border space-y-2 ${
                            judgingVerdict.status?.toLowerCase() === 'accepted' || judgingVerdict.status?.toLowerCase() === 'ac'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : judgingVerdict.status?.toLowerCase() === 'error'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-sm">
                              {judgingVerdict.status?.toLowerCase() === 'accepted' || judgingVerdict.status?.toLowerCase() === 'ac' ? (
                                <>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                  <span>Accepted</span>
                                </>
                              ) : judgingVerdict.status?.toLowerCase() === 'error' ? (
                                <>
                                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                                  <span>Service Unavailable</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-5 h-5 text-rose-400" />
                                  <span className="uppercase">{judgingVerdict.status || 'Wrong Answer'}</span>
                                </>
                              )}
                            </div>
                            {judgingVerdict.runtime != null && (
                              <span className="font-mono text-xs text-text-muted">
                                {judgingVerdict.runtime} ms
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-text font-mono">
                            {judgingVerdict.status?.toLowerCase() === 'accepted' || judgingVerdict.status?.toLowerCase() === 'ac'
                              ? 'All hidden test cases passed! Solution verified against real output.'
                              : judgingVerdict.passedTestCases != null
                              ? `${judgingVerdict.passedTestCases} / ${judgingVerdict.totalTestCases} test cases passed.`
                              : 'Submission evaluated against hidden test cases.'}
                          </p>

                          {judgingVerdict.errorLog && (
                            <pre className="p-2.5 bg-surface-inset rounded border border-border/30 text-amber-300 overflow-x-auto text-xs whitespace-pre-wrap select-text">
                              {judgingVerdict.errorLog}
                            </pre>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <button
                            type="button"
                            onClick={() => setLeftTab('submissions')}
                            className="text-accent hover:underline flex items-center gap-1 font-sans font-medium cursor-pointer"
                          >
                            View all submissions for this problem →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full min-h-[100px] items-center justify-center text-text-muted text-xs font-mono space-y-1.5 py-6 select-none">
                        <Terminal className="h-4 w-4 text-text-muted" />
                        <span>Click "Run" to test on example test cases or "Submit" for official evaluation.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Seamless LeetCode-Style Footer Action Bar ─── */}
          <div className="h-11 bg-bg border-t border-border/30 px-3 flex items-center justify-between shrink-0 text-xs select-none">
            {/* Left: Console Toggle & Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConsoleOpen(!consoleOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  consoleOpen
                    ? 'bg-surface-raised text-text font-medium border border-border/40'
                    : 'text-text-muted hover:text-text hover:bg-surface-raised/50 border border-transparent'
                }`}
                title={consoleOpen ? 'Collapse console' : 'Expand console'}
              >
                <Terminal className="h-3.5 w-3.5 text-accent" />
                <span>Console</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${consoleOpen ? '' : 'rotate-180'}`} />
              </button>

              {consoleOpen && (
                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-border/30">
                  <button
                    type="button"
                    onClick={() => setConsoleTab('testcase')}
                    className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
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
                    className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                      consoleTab === 'result'
                        ? 'bg-surface-raised text-text font-medium'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <span>Test Result</span>
                    {(runResults || judgingVerdict) && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          (runResults?.overallStatus?.toLowerCase() === 'accepted' || judgingVerdict?.status?.toLowerCase() === 'accepted')
                            ? 'bg-emerald-400'
                            : 'bg-rose-500'
                        }`}
                      />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Center: Contest status */}
            <div className="hidden md:flex text-[11px] text-text-muted font-mono">
              {isEnded ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Practice Mode Active
                </span>
              ) : (
                <span>
                  {contest.scoring === 'icpc' ? 'Standard Rules: +20m penalty per wrong answer' : 'Score Mode: Points per passed test'}
                </span>
              )}
            </div>

            {/* Right: Run and Vibrant Green Submit buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {contest.type === 'dsa' && (
                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={runningCode || submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-raised hover:bg-surface-raised/80 text-text transition-colors border border-border/40 disabled:opacity-50 cursor-pointer"
                >
                  {runningCode ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-accent fill-accent/20" />
                  )}
                  <span>Run</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#2cbb5d] hover:bg-[#2cbb5d]/90 text-white transition-all shadow-xs disabled:opacity-50 active:scale-[0.98] cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Live Leaderboard Slide-Over ── */}
        {showLeaderboard && (
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[560px] bg-bg border-l border-border/30 shadow-2xl z-40 flex flex-col">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between bg-bg text-xs select-none">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" />
                <span className="font-semibold text-text">Contest Rankings</span>
                <span className="font-mono text-[10px] text-text-muted px-1.5 py-0.2 bg-surface-raised rounded">
                  {leaderboardData.length} Participants
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Standings Table Body */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-[11px] font-medium text-text-muted select-none">
                    <th className="py-2 px-3 w-10 text-center">Rank</th>
                    <th className="py-2 px-3">Participant</th>
                    <th className="py-2 px-3 text-center">Rating</th>
                    <th className="py-2 px-3 text-right">Solved</th>
                    <th className="py-2 px-3 text-right pr-4">Penalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {leaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-text-muted text-xs">
                        No submissions recorded yet. Be the first to solve!
                      </td>
                    </tr>
                  ) : (
                    leaderboardData.map((row, idx) => {
                      const rank = row.rank || idx + 1;
                      const isCurrentUser =
                        String(row.userId?._id || row.userId) === String(user?._id || user?.id);
                      const ratingVal = row.newRating || row.oldRating || 1500;
                      const delta = row.ratingDelta;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isCurrentUser
                              ? 'bg-accent/10 border-l-2 border-accent'
                              : 'hover:bg-surface-raised/35'
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              {getRankBadge(rank)}
                            </div>
                          </td>

                          {/* User info */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <ContestUserAvatar
                                avatar={row.avatar}
                                name={row.userName || row.name || row.displayName || 'Participant'}
                                className="h-5 w-5 rounded"
                              />
                              <span className="font-normal text-text truncate max-w-[110px] sm:max-w-[140px]">
                                {row.userName || row.name || row.displayName || 'Participant'}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] text-accent font-semibold shrink-0">
                                  (You)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Rating & Delta */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-center">
                            <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                              <RatingBadge
                                rating={ratingVal}
                                tierName={row.ratingBadge}
                                size="xs"
                              />
                              <span className="font-semibold text-text">
                                {ratingVal}
                              </span>
                              {delta !== null && delta !== undefined && (
                                <span
                                  className={`text-[10px] font-medium ${
                                    delta > 0
                                      ? 'text-success'
                                      : delta < 0
                                      ? 'text-danger'
                                      : 'text-text-muted'
                                  }`}
                                >
                                  {delta > 0 ? `+${delta}` : delta}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Solved */}
                          <td className="py-2.5 px-3 text-right font-medium text-success whitespace-nowrap">
                            {row.solvedCount || 0}
                          </td>

                          {/* Penalty */}
                          <td className="py-2.5 px-3 text-right text-text-muted whitespace-nowrap pr-4">
                            {row.penaltyMinutes || 0}m
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Status */}
            <div className="px-3 py-2 bg-bg border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-text-muted select-none">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-success animate-pulse" />
                Live Updates
              </span>
              <span>Real-Time</span>
            </div>
          </aside>
        )}

      </div>

      {/* ─── Persistent Mobile Bottom Action Bar (< 1024px) ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border/50 px-3 py-2 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2">
          {contest?.type === 'dsa' && (
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-surface-raised border border-border/50 rounded px-2 py-1 text-xs font-mono text-text outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id} className="bg-[#121212] text-white">
                  {lang.label.split(' ')[0]}
                </option>
              ))}
            </select>
          )}

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
          {contest?.type === 'dsa' && (
            <button
              type="button"
              onClick={handleRunCode}
              disabled={runningCode || submitting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-surface-raised hover:bg-surface-raised/80 text-text transition-colors border border-border/50 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {runningCode ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              ) : (
                <Play className="w-3.5 h-3.5 text-accent fill-accent/20" />
              )}
              <span>Run</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#2cbb5d] hover:bg-[#2cbb5d]/90 text-white transition-all shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
