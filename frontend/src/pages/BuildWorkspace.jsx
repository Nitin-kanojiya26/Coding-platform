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
  Info,
  FolderTree,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  X,
  FilePlus,
  FolderPlus,
  ChevronsDownUp,
  GripVertical,
  GripHorizontal
} from 'lucide-react';

/**
 * File icon helper based on extension
 */
function FileIcon({ path = '', className = 'w-3.5 h-3.5' }) {
  if (path.endsWith('.json')) {
    return <span className={`text-amber-400 font-mono font-bold text-[10px] leading-none shrink-0 ${className}`}>{'{}'}</span>;
  }
  if (path.endsWith('.md')) {
    return <FileText className={`text-sky-400 shrink-0 ${className}`} />;
  }
  return <FileCode className={`text-accent-build shrink-0 ${className}`} />;
}

export default function BuildWorkspace() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef(null);

  // Problem & workspace state
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leftTab, setLeftTab] = useState('brief'); // 'brief' | 'endpoints' | 'contract' | 'history'
  const [mobileTab, setMobileTab] = useState('code'); // 'brief' | 'code' | 'results' (for < 1024px)
  const [showResetModal, setShowResetModal] = useState(false);
  const [copiedStatement, setCopiedStatement] = useState(false);

  // ─── Multi-File State (server.js as primary entry) ───
  const [files, setFiles] = useState([
    { path: 'server.js', content: '' }
  ]);
  const [activeFilePath, setActiveFilePath] = useState('server.js');
  const [openTabs, setOpenTabs] = useState(['server.js']);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileType, setNewFileType] = useState('file'); // 'file' | 'folder'
  const [newFileName, setNewFileName] = useState('');
  const [fileExplorerOpen, setFileExplorerOpen] = useState(true);
  const [collapsedFolders, setCollapsedFolders] = useState({});

  // ─── LeetCode-Style Resizable Panel Dimensions ───
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('build_split_left');
    return saved ? Math.min(Math.max(Number(saved), 18), 40) : 26;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('build_split_right');
    return saved ? Math.min(Math.max(Number(saved), 20), 45) : 30;
  });
  const [consoleHeight, setConsoleHeight] = useState(() => {
    const saved = localStorage.getItem('build_console_height');
    return saved ? Math.min(Math.max(Number(saved), 60), 400) : 170;
  });

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isDraggingConsole, setIsDraggingConsole] = useState(false);

  // Submissions & evaluation state
  const [submissionId, setSubmissionId] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState('idle'); // 'idle' | 'queued' | 'running' | 'finished' | 'error'
  const [submissionResult, setSubmissionResult] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rateLimitWait, setRateLimitWait] = useState(0); // cooldown in seconds

  // Console drawer state
  const [consoleOpen, setConsoleOpen] = useState(true);

  // Expandable test items & group states
  const [expandedTests, setExpandedTests] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Monaco editor reference
  const editorRef = useRef(null);
  const pollTimerRef = useRef(null);

  // 1. Fetch problem details and load multi-file starter
  useEffect(() => {
    let isMounted = true;
    async function fetchProblem() {
      try {
        setLoading(true);
        const res = await API.get(`/build/problems/${slug}`);
        if (isMounted && res.data?.problem) {
          const p = res.data.problem;
          setProblem(p);

          // Convert starter files to server.js if needed
          let initialStarterFiles = (p.starterFiles && p.starterFiles.length > 0)
            ? p.starterFiles.map((f) => ({
                path: f.path === 'index.js' ? 'server.js' : f.path,
                content: f.content,
              }))
            : [
                {
                  path: 'server.js',
                  content: `const express = require('express');\nconst app = express();\n\napp.use(express.json());\n\n// TODO: Implement your routes\n\nconst PORT = process.env.PORT || 3000;\napp.listen(PORT, '0.0.0.0', () => {\n  console.log(\`Server listening on 0.0.0.0:\${PORT}\`);\n});\n`,
                },
              ];

          // Restore local draft if exists, else starter files
          const savedDraft = localStorage.getItem(`build_files_${slug}`);
          if (savedDraft) {
            try {
              const parsed = JSON.parse(savedDraft);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Ensure server.js entry (convert old index.js draft to server.js)
                const migrated = parsed.map((f) => ({
                  ...f,
                  path: f.path === 'index.js' ? 'server.js' : f.path,
                }));
                const hasEntry = migrated.some((f) => f.path === 'server.js');
                if (hasEntry) {
                  localStorage.setItem(`build_files_${slug}`, JSON.stringify(migrated));
                  setFiles(migrated);
                  setOpenTabs(migrated.map((f) => f.path));
                  setActiveFilePath(migrated[0].path);
                  return;
                }
              }
            } catch (_) {}
          }

          setFiles(initialStarterFiles);
          setOpenTabs(initialStarterFiles.map((f) => f.path));
          setActiveFilePath(initialStarterFiles[0]?.path || 'server.js');
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

  // ─── Mouse Resizing Listeners (LeetCode-Style) ───
  useEffect(() => {
    if (!isDraggingLeft && !isDraggingRight && !isDraggingConsole) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Left panel horizontal resize
      if (isDraggingLeft) {
        const newLeftPercent = ((e.clientX - rect.left) / rect.width) * 100;
        if (newLeftPercent >= 16 && newLeftPercent <= 42) {
          setLeftWidth(newLeftPercent);
          localStorage.setItem('build_split_left', String(newLeftPercent));
        }
      }

      // Right panel horizontal resize
      if (isDraggingRight) {
        const newRightPercent = ((rect.right - e.clientX) / rect.width) * 100;
        if (newRightPercent >= 18 && newRightPercent <= 45) {
          setRightWidth(newRightPercent);
          localStorage.setItem('build_split_right', String(newRightPercent));
        }
      }

      // Console drawer vertical resize
      if (isDraggingConsole) {
        const newHeight = rect.bottom - e.clientY;
        if (newHeight >= 50 && newHeight <= 420) {
          setConsoleHeight(newHeight);
          localStorage.setItem('build_console_height', String(newHeight));
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
      setIsDraggingConsole(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight, isDraggingConsole]);

  // Active file content lookup
  const activeFileContent = useMemo(() => {
    const f = files.find((file) => file.path === activeFilePath);
    return f ? f.content : '';
  }, [files, activeFilePath]);

  // Update active file content & save draft to localStorage
  const handleCodeChange = (newVal) => {
    const updated = files.map((file) =>
      file.path === activeFilePath ? { ...file, content: newVal || '' } : file
    );
    setFiles(updated);
    if (slug) {
      localStorage.setItem(`build_files_${slug}`, JSON.stringify(updated));
    }
  };

  // Add new file or folder (VS Code style)
  const handleCreateFile = () => {
    let raw = newFileName.trim().replace(/\\/g, '/');
    if (raw.startsWith('/')) raw = raw.slice(1);
    if (raw.endsWith('/')) raw = raw.slice(0, -1);

    if (!raw) {
      toast.error(newFileType === 'folder' ? 'Please enter a folder name.' : 'Please enter a filename.');
      return;
    }

    if (raw.includes('..')) {
      toast.error('Directory traversal (..) is not allowed.');
      return;
    }

    if (newFileType === 'folder') {
      const folderFilePath = `${raw}/index.js`;
      if (files.some((f) => f.path.toLowerCase() === folderFilePath.toLowerCase())) {
        toast.error(`Folder "${raw}" already exists.`);
        return;
      }
      if (files.length >= 20) {
        toast.error('Maximum limit of 20 files reached.');
        return;
      }
      const newFileList = [
        ...files,
        { path: folderFilePath, content: `// ${raw}/index.js\n\nmodule.exports = {};\n` },
      ];
      setFiles(newFileList);
      if (!openTabs.includes(folderFilePath)) {
        setOpenTabs([...openTabs, folderFilePath]);
      }
      setActiveFilePath(folderFilePath);
      setNewFileName('');
      setShowNewFileInput(false);
      if (slug) {
        localStorage.setItem(`build_files_${slug}`, JSON.stringify(newFileList));
      }
      toast.success(`Created folder "${raw}/"`);
      return;
    }

    // Default to .js if no extension provided
    if (!raw.includes('.')) {
      raw += '.js';
    }

    if (files.some((f) => f.path.toLowerCase() === raw.toLowerCase())) {
      toast.error('A file with this path already exists.');
      return;
    }

    if (files.length >= 20) {
      toast.error('Maximum limit of 20 files reached.');
      return;
    }

    const defaultContent = raw.endsWith('.json')
      ? '{\n  \n}\n'
      : raw.endsWith('.md')
      ? `# ${raw}\n`
      : `// ${raw}\n\n`;

    const newFileList = [...files, { path: raw, content: defaultContent }];
    setFiles(newFileList);

    if (!openTabs.includes(raw)) {
      setOpenTabs([...openTabs, raw]);
    }
    setActiveFilePath(raw);
    setNewFileName('');
    setShowNewFileInput(false);

    if (slug) {
      localStorage.setItem(`build_files_${slug}`, JSON.stringify(newFileList));
    }
    toast.success(`Created "${raw}"`);
  };

  // Delete file
  const handleDeleteFile = (pathToDelete, e) => {
    if (e) e.stopPropagation();
    if (pathToDelete === 'server.js' || pathToDelete === 'index.js') {
      toast.error(`"${pathToDelete}" is the required server entry point and cannot be deleted.`);
      return;
    }

    const newFileList = files.filter((f) => f.path !== pathToDelete);
    const newTabs = openTabs.filter((t) => t !== pathToDelete);

    setFiles(newFileList);
    setOpenTabs(newTabs.length > 0 ? newTabs : ['server.js']);

    if (activeFilePath === pathToDelete) {
      setActiveFilePath(newTabs[0] || 'server.js');
    }

    if (slug) {
      localStorage.setItem(`build_files_${slug}`, JSON.stringify(newFileList));
    }
    toast.success(`Deleted "${pathToDelete}"`);
  };

  // Close tab
  const handleCloseTab = (tabToClose, e) => {
    if (e) e.stopPropagation();
    if (openTabs.length <= 1) return; // Keep at least one tab open

    const newTabs = openTabs.filter((t) => t !== tabToClose);
    setOpenTabs(newTabs);

    if (activeFilePath === tabToClose) {
      setActiveFilePath(newTabs[0]);
    }
  };

  // Reset to starter files
  const handleResetConfirm = () => {
    let starter = (problem?.starterFiles && problem.starterFiles.length > 0)
      ? problem.starterFiles.map((f) => ({
          path: f.path === 'index.js' ? 'server.js' : f.path,
          content: f.content,
        }))
      : [{ path: 'server.js', content: '' }];

    setFiles(starter);
    setOpenTabs(starter.map((f) => f.path));
    setActiveFilePath(starter[0]?.path || 'server.js');

    if (slug) {
      localStorage.removeItem(`build_files_${slug}`);
    }
    setShowResetModal(false);
    toast.success('Workspace reset to initial starter files.');
  };

  // Cooldown countdown effect
  useEffect(() => {
    if (rateLimitWait <= 0) return;
    const t = setInterval(() => {
      setRateLimitWait((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [rateLimitWait]);

  // 3. Submit solution with all files
  const handleSubmit = async () => {
    const hasEntry = files.some(
      (f) => (f.path === 'server.js' || f.path === 'index.js') && f.content.trim()
    );

    if (!hasEntry) {
      toast.error('An entry file ("server.js" or "index.js") is required and must contain your code.');
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
        files: files.map((f) => ({ path: f.path, content: f.content })),
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
          status: 'Rate Limited',
          verdict: 'Rate Limited',
          message: 'You have reached the submission rate limit (5 per minute). Please wait 60s.',
        });
      } else {
        setSubmissionStatus('error');
        setSubmissionResult({
          status: 'Submission Error',
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
          status: 'Internal Error',
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
  const toggleTestExpand = (key) => {
    setExpandedTests((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle collapsed endpoint group
  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Toggle folder collapse in tree
  const toggleFolderCollapse = (folderName) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  // ─── VS Code Style File Tree Structure ───
  const fileTree = useMemo(() => {
    const folders = {};
    const rootFiles = [];

    files.forEach((file) => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        const folderName = parts[0];
        const subPath = parts.slice(1).join('/');
        if (!folders[folderName]) folders[folderName] = [];
        folders[folderName].push({ ...file, subPath });
      } else {
        rootFiles.push(file);
      }
    });

    return { folders, rootFiles };
  }, [files]);

  // Distinct endpoint list extracted from visible tests (for Brief / Endpoints tab)
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

  // ─── Grouped Checklist Logic (Stage 2) ───
  const groupedChecklist = useMemo(() => {
    if (!problem) return { endpointGroups: [], hiddenTests: [] };

    const results = submissionResult?.testResults || [];
    const resultMap = new Map();
    results.forEach((r) => {
      resultMap.set(r.name, r);
    });

    // 1. Group visible tests by endpoint key
    const endpointMap = new Map();

    (problem.visibleTests || []).forEach((t, idx) => {
      const method = (t.request?.method || 'GET').toUpperCase();
      const path = t.request?.path || '/';
      const endpointKey = `${method} ${path}`;

      const runResult = resultMap.get(t.name);
      const testItem = {
        id: `vis-${idx}`,
        name: t.name,
        method,
        path,
        request: t.request,
        expect: t.expect,
        passed: runResult ? runResult.passed : null,
        got: runResult?.got || null,
        isHidden: false,
      };

      if (!endpointMap.has(endpointKey)) {
        endpointMap.set(endpointKey, {
          key: endpointKey,
          method,
          path,
          tests: [testItem],
        });
      } else {
        endpointMap.get(endpointKey).tests.push(testItem);
      }
    });

    // Calculate group stats
    const endpointGroups = Array.from(endpointMap.values()).map((grp) => {
      const passedInGroup = grp.tests.filter((t) => t.passed === true).length;
      const failedInGroup = grp.tests.filter((t) => t.passed === false).length;
      const totalInGroup = grp.tests.length;

      let groupStatus = 'idle';
      if (submissionStatus === 'queued' || submissionStatus === 'running') {
        groupStatus = 'running';
      } else if (passedInGroup === totalInGroup && totalInGroup > 0) {
        groupStatus = 'passed';
      } else if (failedInGroup > 0) {
        groupStatus = 'failed';
      }

      return {
        ...grp,
        passedCount: passedInGroup,
        totalCount: totalInGroup,
        status: groupStatus,
      };
    });

    // 2. Hidden tests group
    const hiddenTests = results
      .filter((r) => r.visible === false || !(problem.visibleTests || []).some((vt) => vt.name === r.name))
      .map((r, idx) => ({
        id: `hid-${idx}`,
        name: r.name || `Hidden Edge Case #${idx + 1}`,
        passed: r.passed,
        isHidden: true,
      }));

    return { endpointGroups, hiddenTests };
  }, [problem, submissionResult, submissionStatus]);

  const passedCount = submissionResult?.passed ?? 0;
  const totalCount = submissionResult?.total ?? (problem?.visibleTests?.length || 0);
  const scorePercent = submissionResult?.score ?? (totalCount > 0 && passedCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0);
  const verdict = submissionResult?.verdict || submissionResult?.status || '';
  const isAccepted = verdict === 'Accepted';

  if (loading) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center space-y-3">
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

  const isDraggingAny = isDraggingLeft || isDraggingRight || isDraggingConsole;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-[calc(100vh-5.4rem)] rounded-xl border border-border/60 bg-bg text-text overflow-hidden shadow-md ${
        isDraggingAny ? 'select-none' : ''
      }`}
    >
      {/* ─── Top Workbench Header (Cleanly separated from Navbar) ─── */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 bg-surface border-b border-border/50 shrink-0 z-10 select-none">
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
            <h1 className="text-xs sm:text-sm font-bold text-text truncate max-w-[180px] sm:max-w-xs md:max-w-md">
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
      <div className="lg:hidden flex items-center border-b border-border/50 bg-surface px-2 py-1 gap-1 text-xs shrink-0 select-none">
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
          Code Editor ({files.length})
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
          Checklist ({passedCount}/{totalCount})
        </button>
      </div>

      {/* ─── 3-Column Main Workspace with LeetCode-Style Resizers ─── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* ════════ COLUMN 1 (LEFT): Brief, Endpoints, Contract, History ════════ */}
        <aside
          style={{ width: window.innerWidth >= 1024 ? `${leftWidth}%` : '100%' }}
          className={`flex-col min-h-0 bg-surface/50 shrink-0 ${
            mobileTab === 'brief' ? 'flex w-full' : 'hidden lg:flex'
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

          {/* Left Panel Body (Allow text selection & copy) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
            {/* TAB: Brief */}
            {leftTab === 'brief' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-border/40 select-none">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider font-bold">
                    Problem Description
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(problem.statement);
                      setCopiedStatement(true);
                      setTimeout(() => setCopiedStatement(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-text-muted hover:text-text hover:bg-surface-raised border border-border/50 transition-colors"
                    title="Copy entire problem description"
                  >
                    {copiedStatement ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                </div>
                <MarkdownRenderer content={problem.statement} />
              </div>
            )}

            {/* TAB: Endpoints */}
            {leftTab === 'endpoints' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="text-[11px] text-text-muted leading-relaxed select-none">
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
                        <span className="text-[10px] font-mono text-text-muted uppercase select-none">Sample Request Body</span>
                        <pre className="p-2 rounded bg-surface border border-border/40 text-[10px] font-mono text-text overflow-x-auto">
                          <code>{JSON.stringify(ep.sampleRequest.body, null, 2)}</code>
                        </pre>
                      </div>
                    )}

                    {/* Expected Status & Body */}
                    {ep.sampleExpect && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-text-muted uppercase select-none">
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
                    Your code executes in an isolated Docker container with zero access to the internet. Comply with the following constraints:
                  </p>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">1. Entrypoint</span>
                    <p className="text-text-muted font-sans text-xs">
                      The primary server file must be named <code>server.js</code> (or <code>index.js</code>).
                    </p>
                  </div>

                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">2. Port & Host Binding</span>
                    <p className="text-text-muted font-sans text-xs">
                      Server must listen on port <strong>3000</strong> and bind to <code>0.0.0.0</code>:
                    </p>
                    <code className="block p-1.5 rounded bg-surface border border-border/30 text-text">
                      app.listen(3000, '0.0.0.0');
                    </code>
                  </div>

                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">3. Multi-File Architecture</span>
                    <p className="text-text-muted font-sans text-xs">
                      Modular files like <code>routes/todos.js</code> are fully supported. Use standard <code>require('./path')</code>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">4. In-Memory Data Storage</span>
                    <p className="text-text-muted font-sans text-xs">
                      Persist data in in-memory JavaScript variables, arrays, or objects. (Filesystem is read-only).
                    </p>
                  </div>

                  <div className="p-2.5 rounded border border-border/50 bg-surface-raised/60 space-y-1">
                    <span className="text-text font-bold text-accent-build block">5. Pre-installed Packages</span>
                    <p className="text-text-muted font-sans text-xs">
                      <code>express</code> and <code>cors</code> are pre-installed. Do not attempt to <code>npm install</code> extra packages.
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
                  <div className="py-8 text-center space-y-2 border border-dashed border-border/50 rounded-lg select-none">
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

        {/* ─── RESIZE HANDLE 1 (Left <-> Center) ─── */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingLeft(true);
          }}
          className="hidden lg:flex w-1.5 hover:w-2 bg-border/40 hover:bg-accent-build cursor-col-resize items-center justify-center transition-all select-none shrink-0 group relative z-20"
          title="Drag to resize Brief panel"
        >
          <div className="w-0.5 h-6 rounded-full bg-text-muted/40 group-hover:bg-black transition-colors" />
        </div>

        {/* ════════ COLUMN 2 (CENTER): VS Code-Style Explorer + Editor + Resizable Console ════════ */}
        <main
          className={`flex-1 flex flex-col min-h-0 bg-surface-inset ${
            mobileTab === 'code' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          {/* File Tab Bar & Explorer Controls */}
          <div className="flex items-center justify-between border-b border-border/50 bg-surface px-2 select-none shrink-0 overflow-x-auto">
            {/* Tabs List */}
            <div className="flex items-center gap-1 py-1">
              {/* Explorer toggle button */}
              <button
                type="button"
                onClick={() => setFileExplorerOpen(!fileExplorerOpen)}
                className={`p-1.5 rounded transition-colors ${
                  fileExplorerOpen ? 'bg-accent-build/15 text-accent-build' : 'text-text-muted hover:text-text'
                }`}
                title="Toggle File Explorer (VS Code Style)"
              >
                <FolderTree className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-border/50 mx-1 shrink-0" />

              {/* Open File Tabs */}
              {openTabs.map((tabPath) => {
                const isActive = activeFilePath === tabPath;
                const isEntry = tabPath === 'server.js' || tabPath === 'index.js';
                return (
                  <div
                    key={tabPath}
                    onClick={() => setActiveFilePath(tabPath)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-surface-raised border border-border text-text shadow-xs'
                        : 'text-text-muted hover:text-text hover:bg-surface-raised/40'
                    }`}
                  >
                    <FileIcon path={tabPath} className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[120px]">{tabPath}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent-build ml-0.5" />}

                    {/* Close Tab Button */}
                    {!isEntry && openTabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleCloseTab(tabPath, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
                        title="Close tab"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add file inline trigger */}
              <button
                type="button"
                onClick={() => {
                  setShowNewFileInput(true);
                  setNewFileType('file');
                }}
                className="p-1 text-text-muted hover:text-accent-build rounded transition-colors ml-1"
                title="New File"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              {/* Add folder inline trigger */}
              <button
                type="button"
                onClick={() => {
                  setShowNewFileInput(true);
                  setNewFileType('folder');
                }}
                className="p-1 text-text-muted hover:text-accent-build rounded transition-colors"
                title="New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-[10px] font-mono text-text-muted hidden sm:inline shrink-0 pl-2">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {/* New File / Folder Inline Bar (VS Code style) */}
          {showNewFileInput && (
            <div className="flex items-center gap-2 p-2 bg-surface-raised border-b border-border/50 animate-fadeIn text-xs">
              {newFileType === 'folder' ? (
                <FolderPlus className="w-4 h-4 text-accent-build shrink-0" />
              ) : (
                <FilePlus className="w-4 h-4 text-accent-build shrink-0" />
              )}
              <input
                type="text"
                placeholder={
                  newFileType === 'folder'
                    ? 'Folder name (e.g. routes, models, controllers)'
                    : 'File name (e.g. routes/todos.js, models/item.js, data.json)'
                }
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                  if (e.key === 'Escape') setShowNewFileInput(false);
                }}
                className="flex-1 bg-surface px-2.5 py-1 text-xs font-mono text-text rounded border border-border focus:border-accent-build focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateFile}
                className="px-2.5 py-1 bg-accent-build text-black font-semibold text-xs rounded hover:bg-accent-build-hover"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewFileInput(false)}
                className="p-1 text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Center Main Workspace: VS Code Explorer Sidebar + Monaco Editor */}
          <div className="flex-1 min-h-[220px] flex relative overflow-hidden">
            {/* VS Code Style File Explorer Sidebar */}
            {fileExplorerOpen && (
              <div className="w-48 border-r border-border/50 bg-surface/80 flex flex-col shrink-0 text-xs font-mono select-none">
                {/* Explorer Header */}
                <div className="p-2 border-b border-border/40 flex items-center justify-between text-[10px] text-text-muted uppercase tracking-wider font-bold">
                  <span>Explorer</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewFileInput(true);
                        setNewFileType('file');
                      }}
                      className="p-1 hover:text-accent-build rounded"
                      title="New File"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewFileInput(true);
                        setNewFileType('folder');
                      }}
                      className="p-1 hover:text-accent-build rounded"
                      title="New Folder"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tree View */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                  {/* Folders */}
                  {Object.entries(fileTree.folders).map(([folderName, folderFiles]) => {
                    const isCollapsed = collapsedFolders[folderName];
                    return (
                      <div key={folderName} className="space-y-0.5">
                        <div
                          onClick={() => toggleFolderCollapse(folderName)}
                          className="flex items-center gap-1.5 px-1.5 py-1 rounded text-text-muted hover:text-text hover:bg-surface-raised/40 cursor-pointer text-xs"
                        >
                          <ChevronRight className={`w-3 h-3 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} />
                          {isCollapsed ? (
                            <Folder className="w-3.5 h-3.5 text-accent-build/80" />
                          ) : (
                            <FolderOpen className="w-3.5 h-3.5 text-accent-build" />
                          )}
                          <span className="font-semibold text-xs truncate">{folderName}</span>
                        </div>

                        {/* Indented folder files */}
                        {!isCollapsed && (
                          <div className="pl-4 space-y-0.5 border-l border-border/30 ml-2">
                            {folderFiles.map((file) => {
                              const isActive = activeFilePath === file.path;
                              return (
                                <div
                                  key={file.path}
                                  onClick={() => {
                                    if (!openTabs.includes(file.path)) {
                                      setOpenTabs([...openTabs, file.path]);
                                    }
                                    setActiveFilePath(file.path);
                                  }}
                                  className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                                    isActive
                                      ? 'bg-accent-build/15 text-accent-build font-bold'
                                      : 'text-text-muted hover:text-text hover:bg-surface-raised/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileIcon path={file.subPath} className="w-3.5 h-3.5" />
                                    <span className="truncate text-xs">{file.subPath}</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteFile(file.path, e)}
                                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
                                    title="Delete file"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Root files */}
                  {fileTree.rootFiles.map((file) => {
                    const isActive = activeFilePath === file.path;
                    const isEntry = file.path === 'server.js' || file.path === 'index.js';
                    return (
                      <div
                        key={file.path}
                        onClick={() => {
                          if (!openTabs.includes(file.path)) {
                            setOpenTabs([...openTabs, file.path]);
                          }
                          setActiveFilePath(file.path);
                        }}
                        className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-accent-build/15 text-accent-build font-bold'
                            : 'text-text-muted hover:text-text hover:bg-surface-raised/40'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileIcon path={file.path} className="w-3.5 h-3.5" />
                          <span className="truncate text-xs">{file.path}</span>
                          {isEntry && (
                            <span className="text-[9px] font-mono px-1 rounded bg-accent-build/20 text-accent-build uppercase">
                              entry
                            </span>
                          )}
                        </div>

                        {!isEntry && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFile(file.path, e)}
                            className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
                            title="Delete file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monaco Editor Container */}
            <div className="flex-1 min-w-0 h-full relative">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={activeFileContent}
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
          </div>

          {/* ─── RESIZE HANDLE 3 (Editor <-> Console Vertical Resizer) ─── */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingConsole(true);
            }}
            className="h-1.5 hover:h-2 bg-border/40 hover:bg-accent-build cursor-row-resize flex items-center justify-center transition-all select-none shrink-0 group relative z-20"
            title="Drag to resize Console"
          >
            <div className="h-0.5 w-8 rounded-full bg-text-muted/40 group-hover:bg-black transition-colors" />
          </div>

          {/* ─── Bottom Console Area (Resizable) ─── */}
          <div
            style={{ height: consoleOpen ? `${consoleHeight}px` : 'auto' }}
            className="border-t border-border/50 bg-surface flex flex-col shrink-0 overflow-hidden transition-[height] duration-75"
          >
            {/* Console Toolbar */}
            <div
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="flex items-center justify-between px-3 py-1.5 bg-surface-raised/60 hover:bg-surface-raised cursor-pointer border-b border-border/40 select-none text-xs shrink-0"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-accent-build" />
                <span className="font-mono font-semibold text-text">Output Console</span>
                {verdict && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      isAccepted
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {verdict}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${consoleOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Console Content */}
            {consoleOpen && (
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-2 bg-surface select-text">
                {submissionStatus === 'queued' || submissionStatus === 'running' ? (
                  <div className="flex items-center gap-2 text-accent-build text-xs py-2 select-none">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Starting your server in Docker container, then running tests...</span>
                  </div>
                ) : submissionResult ? (
                  <div className="space-y-2">
                    {/* Verdict Banner */}
                    <div
                      className={`p-2.5 rounded border flex items-start gap-2.5 ${
                        isAccepted
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : verdict === 'Start Timeout'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {isAccepted ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <span className="font-bold text-xs uppercase tracking-wide block">
                          {verdict} ({passedCount}/{totalCount} Passed)
                        </span>
                        <p className="text-[11px] font-sans leading-relaxed">
                          {verdict === 'Start Timeout'
                            ? 'Your server did not respond on port 3000. Check it listens on 3000 and binds to 0.0.0.0.'
                            : verdict === 'Internal Error'
                            ? 'Something went wrong on our side. Try again.'
                            : isAccepted
                            ? 'All integration tests passed successfully.'
                            : submissionResult.message || 'Some test cases failed. Inspect requirements checklist on the right.'}
                        </p>
                      </div>
                    </div>

                    {/* Execution Time */}
                    {submissionResult.timeTakenMs != null && (
                      <div className="text-[11px] text-text-muted flex items-center gap-1.5 pt-1 select-none">
                        <Clock className="w-3 h-3 text-accent-build" />
                        <span>Execution time: {submissionResult.timeTakenMs} ms</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-text-muted text-[11px] py-2 flex items-center gap-2 select-none">
                    <Info className="w-3.5 h-3.5" />
                    <span>Click "Submit API" to evaluate your multi-file Express project in Docker.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ─── RESIZE HANDLE 2 (Center <-> Right) ─── */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingRight(true);
          }}
          className="hidden lg:flex w-1.5 hover:w-2 bg-border/40 hover:bg-accent-build cursor-col-resize items-center justify-center transition-all select-none shrink-0 group relative z-20"
          title="Drag to resize Checklist panel"
        >
          <div className="w-0.5 h-6 rounded-full bg-text-muted/40 group-hover:bg-black transition-colors" />
        </div>

        {/* ════════ COLUMN 3 (RIGHT): Grouped Requirements Checklist ════════ */}
        <aside
          style={{ width: window.innerWidth >= 1024 ? `${rightWidth}%` : '100%' }}
          className={`flex-col min-h-0 bg-surface/50 shrink-0 ${
            mobileTab === 'results' ? 'flex w-full' : 'hidden lg:flex'
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

          {/* Test Groups Container (Stage 2 Grouped by Endpoint) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 select-text">
            {submissionStatus === 'queued' || submissionStatus === 'running' ? (
              <div className="py-12 text-center space-y-3 select-none">
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
              <>
                {/* 1. Visible Tests Grouped by Endpoint */}
                {groupedChecklist.endpointGroups.map((grp) => {
                  const isCollapsed = collapsedGroups[grp.key];
                  return (
                    <div
                      key={grp.key}
                      className="rounded-lg border border-border/50 bg-surface overflow-hidden shadow-xs"
                    >
                      {/* Group Header */}
                      <div
                        onClick={() => toggleGroupCollapse(grp.key)}
                        className="p-2.5 flex items-center justify-between gap-2 bg-surface-raised/70 hover:bg-surface-raised cursor-pointer transition-colors select-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MethodBadge method={grp.method} size="xs" />
                          <span className="font-mono text-xs font-bold text-text truncate">
                            {grp.path}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Group score indicator */}
                          {submissionStatus === 'finished' && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                grp.passedCount === grp.totalCount
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {grp.passedCount}/{grp.totalCount}
                            </span>
                          )}
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-text-muted transition-transform ${
                              isCollapsed ? '-rotate-90' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Group Test Items */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-1.5 divide-y divide-border/30">
                          {grp.tests.map((test) => {
                            const isFailed = test.passed === false;
                            const isPassed = test.passed === true;
                            const isExpanded = expandedTests[test.id];

                            return (
                              <div key={test.id} className="pt-1.5 first:pt-0">
                                <div
                                  onClick={() => isFailed && toggleTestExpand(test.id)}
                                  className={`p-2 rounded flex items-center justify-between gap-2 text-xs transition-colors ${
                                    isPassed
                                      ? 'bg-emerald-500/5'
                                      : isFailed
                                      ? 'bg-rose-500/5 cursor-pointer hover:bg-rose-500/10'
                                      : 'bg-surface-raised/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {/* Status Light */}
                                    <div className="shrink-0">
                                      {isPassed ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : isFailed ? (
                                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                      ) : (
                                        <span className="w-2 h-2 rounded-full bg-border block mx-0.5" />
                                      )}
                                    </div>
                                    <span className="text-xs text-text truncate">
                                      {test.name}
                                    </span>
                                  </div>

                                  {isFailed && (
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-text-muted transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                  )}
                                </div>

                                {/* Expanded Failure Details */}
                                {isFailed && isExpanded && (
                                  <div className="mt-1.5 p-2.5 rounded bg-surface border border-rose-500/30 space-y-2 text-[10px] font-mono animate-fadeIn select-text">
                                    <div>
                                      <span className="text-text-muted uppercase font-bold block mb-0.5">Request Sent</span>
                                      <div className="text-text">
                                        {test.method} {test.path}
                                      </div>
                                      {test.request?.body && (
                                        <pre className="text-text-muted overflow-x-auto mt-0.5">
                                          <code>{JSON.stringify(test.request.body, null, 2)}</code>
                                        </pre>
                                      )}
                                    </div>

                                    <div>
                                      <span className="text-emerald-400 uppercase font-bold block mb-0.5">Expected</span>
                                      <div>Status: {test.expect?.status || 200}</div>
                                      {test.expect?.bodyContains && (
                                        <pre className="text-emerald-400/80 overflow-x-auto mt-0.5">
                                          <code>{JSON.stringify(test.expect.bodyContains, null, 2)}</code>
                                        </pre>
                                      )}
                                    </div>

                                    <div>
                                      <span className="text-rose-400 uppercase font-bold block mb-0.5">Actual (Got)</span>
                                      <div className="text-rose-300">Status: {test.got?.status ?? 'No response'}</div>
                                      {test.got?.body !== undefined && (
                                        <pre className="text-rose-300 overflow-x-auto mt-0.5">
                                          <code>
                                            {typeof test.got.body === 'object'
                                              ? JSON.stringify(test.got.body, null, 2)
                                              : String(test.got.body)}
                                          </code>
                                        </pre>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 2. Hidden Verification Suite */}
                {groupedChecklist.hiddenTests.length > 0 && (
                  <div className="rounded-lg border border-border/50 bg-surface overflow-hidden shadow-xs">
                    <div className="p-2.5 flex items-center justify-between gap-2 bg-surface-raised/70 select-none">
                      <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-text-muted">
                        <Lock className="w-3.5 h-3.5 text-accent-build" />
                        <span>Hidden Edge Case Suite</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border/40">
                        {groupedChecklist.hiddenTests.filter((t) => t.passed).length}/{groupedChecklist.hiddenTests.length} Passed
                      </span>
                    </div>

                    <div className="p-2 space-y-1.5 divide-y divide-border/30">
                      {groupedChecklist.hiddenTests.map((test) => (
                        <div
                          key={test.id}
                          className="pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded text-xs bg-surface-raised/20"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {test.passed === true ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : test.passed === false ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <Lock className="w-3 h-3 text-text-muted shrink-0" />
                            )}
                            <span className="text-xs text-text-muted truncate">{test.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted shrink-0">Private</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ─── Reset Confirmation Modal ─── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn select-none">
          <div className="bg-surface border border-border/80 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2 rounded-full bg-amber-500/10 border border-amber-500/25">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text">Reset All Files?</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              This will overwrite all your current files and restore the original starter files. This action cannot be undone.
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
                Reset Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
