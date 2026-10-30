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
  ChevronLeft,
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
  Pencil,
  ChevronsDownUp,
  GripVertical,
  GripHorizontal,
  Play
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
  const [engineStatus, setEngineStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  const checkEngineStatus = async () => {
    try {
      const res = await API.get('/build/engine-status');
      const isOnline = Boolean(res.data?.available);
      setEngineStatus(isOnline ? 'online' : 'offline');
      return isOnline;
    } catch (_) {
      setEngineStatus('offline');
      return false;
    }
  };

  useEffect(() => {
    checkEngineStatus();
    const interval = setInterval(checkEngineStatus, 25000);
    return () => clearInterval(interval);
  }, []);
  const [checklistOpen, setChecklistOpen] = useState(() => {
    const saved = localStorage.getItem('build_checklist_open');
    return saved !== null ? saved === 'true' : true;
  });

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('build_checklist_open', String(checklistOpen));
  }, [checklistOpen]);

  const handleToggleChecklist = () => {
    const next = !checklistOpen;
    setChecklistOpen(next);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileTab(next ? 'results' : 'code');
    }
  };

  const handleHideChecklist = () => {
    setChecklistOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileTab('code');
    }
  };

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
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  // ─── LeetCode-Style Resizable Panel Dimensions ───
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('build_split_left');
    return saved ? Math.min(Math.max(Number(saved), 18), 40) : 26;
  });
  const [consoleHeight, setConsoleHeight] = useState(() => {
    const saved = localStorage.getItem('build_console_height');
    return saved ? Math.min(Math.max(Number(saved), 60), 400) : 170;
  });

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingConsole, setIsDraggingConsole] = useState(false);

  // Submissions & evaluation state
  const [submissionId, setSubmissionId] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState('idle'); // 'idle' | 'queued' | 'running' | 'finished' | 'error'
  const [submissionResult, setSubmissionResult] = useState(null);
  const [runLoading, setRunLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [subDetailLoading, setSubDetailLoading] = useState(false);
  const [selectedSubFileIdx, setSelectedSubFileIdx] = useState(0);
  const [subCodeCopied, setSubCodeCopied] = useState(false);
  const [subCodeLoadedNotice, setSubCodeLoadedNotice] = useState(false);
  const [rateLimitWait, setRateLimitWait] = useState(0); // cooldown in seconds

  // Console drawer state
  const [consoleOpen, setConsoleOpen] = useState(true);

  // Expandable test items & group states
  const [expandedTests, setExpandedTests] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Monaco editor reference
  const editorRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Re-layout Monaco editor smoothly when checklist toggles
  useEffect(() => {
    if (editorRef.current) {
      const raf = requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
      const t1 = setTimeout(() => editorRef.current?.layout(), 40);
      const t2 = setTimeout(() => editorRef.current?.layout(), 180);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [checklistOpen, leftWidth, fileExplorerOpen]);

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
    } else {
      setSelectedSubmission(null);
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

  const handleSelectSubmission = async (sub) => {
    setSelectedSubmission(sub);
    setSelectedSubFileIdx(0);
    setSubDetailLoading(true);
    try {
      const res = await API.get(`/build/submissions/${sub._id}`);
      const fullSub = res.data?.submission || res.data;
      setSelectedSubmission(fullSub);
    } catch (err) {
      console.error('Failed to load full submission details:', err);
    } finally {
      setSubDetailLoading(false);
    }
  };

  const handleLoadSubmissionFiles = (sub) => {
    if (!sub?.files || sub.files.length === 0) return;
    setFiles(sub.files);
    setOpenTabs(sub.files.map((f) => f.path));
    setActiveFilePath(sub.files[0]?.path || 'server.js');
    localStorage.setItem(`build_files_${slug}`, JSON.stringify(sub.files));
    setSubCodeLoadedNotice(true);
    setTimeout(() => setSubCodeLoadedNotice(false), 2500);
    toast.success('Loaded submission files into workspace editor!');
  };

  const handleCopySubCode = (content) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setSubCodeCopied(true);
    setTimeout(() => setSubCodeCopied(false), 2000);
  };

  // ─── Mouse Resizing Listeners (Left Panel & Console) ───
  useEffect(() => {
    if (!isDraggingLeft && !isDraggingConsole) return;

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
      setIsDraggingConsole(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingConsole]);

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
      let folderName = raw;
      let initialFile = 'index.js';

      if (raw.includes('/')) {
        const parts = raw.split('/');
        folderName = parts[0];
        initialFile = parts.slice(1).join('/') || 'index.js';
      }

      if (!initialFile.includes('.')) {
        initialFile += '.js';
      }

      const folderFilePath = `${folderName}/${initialFile}`;
      if (files.some((f) => f.path.toLowerCase() === folderFilePath.toLowerCase())) {
        toast.error(`A file at "${folderFilePath}" already exists.`);
        return;
      }
      if (files.length >= 20) {
        toast.error('Maximum limit of 20 files reached.');
        return;
      }
      const newFileList = [
        ...files,
        { path: folderFilePath, content: `// ${folderFilePath}\n\nmodule.exports = {};\n` },
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
      toast.success(`Created folder "${folderName}/" with "${initialFile}"`);
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

  // Rename file (VS Code style inline rename)
  const handleRenameFile = (oldPath, newSubOrFull) => {
    let cleaned = (newSubOrFull || '').trim().replace(/\\/g, '/');
    if (cleaned.startsWith('/')) cleaned = cleaned.slice(1);
    if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);

    if (!cleaned) {
      toast.error('Filename cannot be empty.');
      setRenamingPath(null);
      return;
    }
    if (cleaned.includes('..')) {
      toast.error('Directory traversal (..) is not allowed.');
      return;
    }

    // If file was inside a folder and user only typed a new filename (e.g. auth.js)
    let targetPath = cleaned;
    if (!cleaned.includes('/') && oldPath.includes('/')) {
      const folder = oldPath.substring(0, oldPath.lastIndexOf('/'));
      targetPath = `${folder}/${cleaned}`;
    }

    if (!targetPath.includes('.')) {
      targetPath += '.js';
    }

    if (targetPath.toLowerCase() === oldPath.toLowerCase()) {
      setRenamingPath(null);
      return;
    }

    if (files.some((f) => f.path.toLowerCase() === targetPath.toLowerCase())) {
      toast.error(`A file with path "${targetPath}" already exists.`);
      return;
    }

    if (oldPath === 'server.js') {
      toast.error('Cannot rename the main "server.js" entry file.');
      setRenamingPath(null);
      return;
    }

    const updatedFiles = files.map((f) =>
      f.path === oldPath ? { ...f, path: targetPath } : f
    );
    const updatedTabs = openTabs.map((t) => (t === oldPath ? targetPath : t));

    setFiles(updatedFiles);
    setOpenTabs(updatedTabs);
    if (activeFilePath === oldPath) {
      setActiveFilePath(targetPath);
    }

    setRenamingPath(null);
    if (slug) {
      localStorage.setItem(`build_files_${slug}`, JSON.stringify(updatedFiles));
    }
    toast.success(`Renamed to "${targetPath}"`);
  };

  // Rename folder (updates all files inside this folder)
  const handleRenameFolder = (oldFolder, newFolderRaw) => {
    let cleaned = (newFolderRaw || '').trim().replace(/\\/g, '/');
    if (cleaned.startsWith('/')) cleaned = cleaned.slice(1);
    if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);

    if (!cleaned) {
      toast.error('Folder name cannot be empty.');
      setRenamingFolder(null);
      return;
    }
    if (cleaned.includes('/') || cleaned.includes('..')) {
      toast.error('Invalid folder name (cannot contain sub-slashes or ..).');
      return;
    }

    if (cleaned.toLowerCase() === oldFolder.toLowerCase()) {
      setRenamingFolder(null);
      return;
    }

    const targetPrefix = `${cleaned.toLowerCase()}/`;
    const oldPrefix = `${oldFolder}/`;

    if (files.some((f) => f.path.toLowerCase().startsWith(targetPrefix))) {
      toast.error(`A folder named "${cleaned}" already exists.`);
      return;
    }

    const updatedFiles = files.map((f) => {
      if (f.path.startsWith(oldPrefix)) {
        const rest = f.path.slice(oldPrefix.length);
        return { ...f, path: `${cleaned}/${rest}` };
      }
      return f;
    });

    const updatedTabs = openTabs.map((t) => {
      if (t.startsWith(oldPrefix)) {
        const rest = t.slice(oldPrefix.length);
        return `${cleaned}/${rest}`;
      }
      return t;
    });

    setFiles(updatedFiles);
    setOpenTabs(updatedTabs);

    if (activeFilePath.startsWith(oldPrefix)) {
      const rest = activeFilePath.slice(oldPrefix.length);
      setActiveFilePath(`${cleaned}/${rest}`);
    }

    setRenamingFolder(null);
    if (slug) {
      localStorage.setItem(`build_files_${slug}`, JSON.stringify(updatedFiles));
    }
    toast.success(`Renamed folder to "${cleaned}/"`);
  };

  // Delete folder (removes all files in that folder)
  const handleDeleteFolder = (folderName, e) => {
    if (e) e.stopPropagation();
    const folderPrefix = `${folderName}/`;

    const filesInFolder = files.filter((f) => f.path.startsWith(folderPrefix));
    if (filesInFolder.length === 0) return;

    const updatedFiles = files.filter((f) => !f.path.startsWith(folderPrefix));
    const finalFiles = updatedFiles.length > 0 ? updatedFiles : [{ path: 'server.js', content: '' }];
    const updatedTabs = openTabs.filter((t) => !t.startsWith(folderPrefix));
    const finalTabs = updatedTabs.length > 0 ? updatedTabs : ['server.js'];

    setFiles(finalFiles);
    setOpenTabs(finalTabs);

    if (activeFilePath.startsWith(folderPrefix)) {
      setActiveFilePath(finalTabs[0] || 'server.js');
    }

    if (slug) {
      localStorage.setItem(`build_files_${slug}`, JSON.stringify(finalFiles));
    }
    toast.success(`Deleted folder "${folderName}/" (${filesInFolder.length} file(s))`);
  };

  // Delete file
  const handleDeleteFile = (pathToDelete, e) => {
    if (e) e.stopPropagation();
    if (pathToDelete === 'server.js' || pathToDelete === 'index.js') {
      toast.error(`"${pathToDelete}" is your main project file and cannot be deleted.`);
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

  // 2.5 Run code against visible checklist requirements (Sandbox Mode)
  const handleRunCode = async () => {
    const hasEntry = files.some(
      (f) => (f.path === 'server.js' || f.path === 'index.js') && f.content.trim()
    );

    if (!hasEntry) {
      toast.error('Your main file ("server.js") is required to run and test your project.');
      return;
    }

    if (runLoading || submissionStatus === 'queued' || submissionStatus === 'running') {
      return;
    }

    if (engineStatus === 'offline') {
      toast.error('Execution engine is offline.', { id: 'engine-offline' });
      setConsoleOpen(true);
      setChecklistOpen(true);
      if (window.innerWidth < 1024) setMobileTab('results');
      setSubmissionStatus('error');
      setSubmissionResult({
        status: 'Execution Engine Offline',
        verdict: 'Execution Engine Offline',
        message: 'The execution engine is currently offline. Please try again later.',
        isRun: true,
      });
      return;
    }

    try {
      setRunLoading(true);
      setSubmissionResult(null);
      setConsoleOpen(true);
      setChecklistOpen(true);
      if (window.innerWidth < 1024) {
        setMobileTab('results');
      }

      const payload = {
        slug,
        files: files.map((f) => ({ path: f.path, content: f.content })),
      };

      const res = await API.post('/build/run', payload);
      const data = res.data;
      setEngineStatus('online');

      setSubmissionResult({
        status: data.verdict,
        verdict: data.verdict,
        score: data.score,
        passed: data.passed,
        total: data.total,
        message: data.message,
        testResults: data.testResults,
        timeTakenMs: data.timeTakenMs,
        isRun: true,
      });
      setSubmissionStatus('finished');

      if (data.verdict === 'Accepted') {
        toast.success(`Run Passed (${data.passed}/${data.total} tests)`);
      } else {
        toast.error(`Run: ${data.verdict} (${data.passed}/${data.total} passed)`);
      }
    } catch (err) {
      console.error('Run failed:', err);
      const isOffline = err.response?.status === 503 || err.response?.data?.isServiceUnavailable;
      if (isOffline) {
        setEngineStatus('offline');
        toast.error('Execution engine is offline.', { id: 'engine-offline' });
      }
      const message =
        err.response?.data?.message ||
        (isOffline
          ? 'The execution engine is currently offline. Please try again later.'
          : 'Could not execute test run. Check your server code.');
      setSubmissionStatus('error');
      setSubmissionResult({
        status: isOffline ? 'Execution Engine Offline' : 'Run Error',
        verdict: isOffline ? 'Execution Engine Offline' : 'Run Error',
        message,
        isRun: true,
      });
    } finally {
      setRunLoading(false);
    }
  };

  // 3. Submit solution with all files
  const handleSubmit = async () => {
    const hasEntry = files.some(
      (f) => (f.path === 'server.js' || f.path === 'index.js') && f.content.trim()
    );

    if (!hasEntry) {
      toast.error('Your main file ("server.js") is required to run and test your project.');
      return;
    }

    if (runLoading || submissionStatus === 'queued' || submissionStatus === 'running') {
      return;
    }

    if (rateLimitWait > 0) {
      toast.error(`Rate limited. Please wait ${rateLimitWait}s before submitting again.`);
      return;
    }

    if (engineStatus === 'offline') {
      toast.error('Execution engine is offline.', { id: 'engine-offline' });
      setConsoleOpen(true);
      setChecklistOpen(true);
      if (window.innerWidth < 1024) setMobileTab('results');
      setSubmissionStatus('error');
      setSubmissionResult({
        status: 'Execution Engine Offline',
        verdict: 'Execution Engine Offline',
        message: 'The execution engine is currently offline. Please try again later.',
      });
      return;
    }

    try {
      setSubmissionStatus('queued');
      setSubmissionResult(null);
      setConsoleOpen(true);
      setChecklistOpen(true);
      if (window.innerWidth < 1024) {
        setMobileTab('results');
      }

      const payload = {
        slug,
        files: files.map((f) => ({ path: f.path, content: f.content })),
      };

      const res = await API.post('/build/submit', payload);
      setEngineStatus('online');
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
        const isOffline = err.response?.status === 503 || err.response?.data?.isServiceUnavailable;
        if (isOffline) {
          setEngineStatus('offline');
          toast.error('Execution engine is offline.', { id: 'engine-offline' });
        }
        setSubmissionStatus('error');
        setSubmissionResult({
          status: isOffline ? 'Execution Engine Offline' : 'Submission Error',
          verdict: isOffline ? 'Execution Engine Offline' : 'Submission Error',
          message:
            err.response?.data?.message ||
            (isOffline
              ? 'The execution engine is currently offline. Please try again later.'
              : 'Could not queue your submission. Check your network.'),
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
          message: 'Testing timed out. Please try submitting again.',
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
            toast.success('🎉 Great job! All tests passed!');
          } else {
            toast.error(`Tests finished: ${sub.status}`);
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
      if (runLoading || submissionStatus === 'queued' || submissionStatus === 'running') {
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
  }, [problem, submissionResult, submissionStatus, runLoading]);

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

  const isDraggingAny = isDraggingLeft || isDraggingConsole;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-[calc(100vh-3rem)] w-full bg-bg text-text overflow-hidden ${
        isDraggingAny ? 'select-none' : ''
      }`}
    >
      {/* ─── Top Workbench Header (Flat, Seamless LeetCode Style) ─── */}
      <header className="px-4 sm:px-6 py-2 bg-bg border-b border-border/30 shrink-0 z-10 select-none">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Back + Title + Badges */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/build"
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-raised/40 transition-colors shrink-0"
            title="Back to Build Mode list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-px bg-border/40 shrink-0 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold text-text truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {problem.title}
            </h1>
            <DifficultyBadge difficulty={problem.difficulty} />
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
              <Server className="w-2.5 h-2.5" />
              Node.js
            </span>
            {engineStatus === 'online' ? (
              <span
                className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded shrink-0 select-none"
                title="Execution engine is online."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Engine Online</span>
              </span>
            ) : engineStatus === 'offline' ? (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded shrink-0 select-none"
                title="Execution engine is offline."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Engine Offline</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Right: Actions (Checklist Toggle + Reset + Run + Submit) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            id="toggle-checklist-btn"
            type="button"
            onClick={handleToggleChecklist}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors shrink-0 select-none ${
              checklistOpen
                ? 'bg-accent-build/15 text-accent-build font-semibold border border-accent-build/30'
                : 'text-text-muted hover:text-text hover:bg-surface-raised/40 border border-border/40'
            }`}
            title={checklistOpen ? 'Hide Checklist (more space for editor)' : 'Show Requirements Checklist'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{checklistOpen ? 'Hide' : 'Checklist'}</span>
            {submissionStatus === 'finished' ? (
              <span className="text-[10px] font-bold">
                ({passedCount}/{totalCount})
              </span>
            ) : (
              <span className="text-[10px] opacity-75">
                ({totalCount})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-2 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-raised/40 border border-border/40 rounded flex items-center gap-1 transition-colors"
            title="Reset code to starter template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* RUN CODE BUTTON (Visible Tests Fast Runner) */}
          <button
            id="run-code-btn"
            type="button"
            onClick={handleRunCode}
            disabled={runLoading || submissionStatus === 'queued' || submissionStatus === 'running'}
            className={`hidden sm:flex px-3 py-1.5 text-xs font-semibold rounded items-center gap-1.5 transition-all border ${
              runLoading
                ? 'bg-surface-raised text-text-muted border-border cursor-not-allowed'
                : 'bg-surface-raised/60 hover:bg-surface-raised text-text hover:text-white border-border/60 hover:border-text-muted active:scale-95'
            }`}
            title="Run code against visible checklist requirements (Fast Sandbox Test)"
          >
            {runLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-build" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-accent-build" />
                <span>Run</span>
              </>
            )}
          </button>

          {/* SUBMIT SOLUTION BUTTON */}
          <button
            id="submit-solution-btn"
            type="button"
            onClick={handleSubmit}
            disabled={runLoading || submissionStatus === 'queued' || submissionStatus === 'running' || rateLimitWait > 0}
            className={`hidden sm:flex px-3.5 py-1.5 text-xs font-semibold rounded items-center gap-1.5 transition-all shadow-sm ${
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
                <span>Submitting...</span>
              </>
            ) : rateLimitWait > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Wait {rateLimitWait}s</span>
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
    </header>

      {/* ─── Mobile / Tablet Navigation Pills (< 1024px) ─── */}
      <div className="lg:hidden flex items-center border-b border-border/30 bg-bg px-2 py-1 gap-1 text-xs shrink-0 select-none">
        <button
          type="button"
          onClick={() => {
            setMobileTab('brief');
            setChecklistOpen(false);
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded transition-colors ${
            mobileTab === 'brief'
              ? 'bg-accent-build/15 text-accent-build font-semibold'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Brief
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab('code');
            setChecklistOpen(false);
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded transition-colors ${
            mobileTab === 'code'
              ? 'bg-accent-build/15 text-accent-build font-semibold'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Code ({files.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab('results');
            setChecklistOpen(true);
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded transition-colors ${
            mobileTab === 'results'
              ? 'bg-accent-build/15 text-accent-build font-semibold'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Checklist ({passedCount}/{totalCount})
        </button>
      </div>

      {/* ─── 3-Column Main Workspace with LeetCode-Style Resizers ─── */}
      <div className="flex-1 min-w-0 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-bg">
        
        {/* ════════ COLUMN 1 (LEFT): Brief, Endpoints, Contract, History ════════ */}
        <aside
          style={{ width: isDesktop ? `${leftWidth}%` : '100%' }}
          className={`flex-col min-h-0 bg-bg shrink-0 ${
            mobileTab === 'brief' ? 'flex w-full h-full' : 'hidden lg:flex'
          }`}
        >
          {/* Sub-tabs header */}
          <div className="flex items-center border-b border-border/30 bg-bg px-2 gap-1 overflow-x-auto shrink-0 select-none">
            {[
              { id: 'brief', label: 'Brief', icon: BookOpen },
              { id: 'endpoints', label: 'Endpoints', icon: Zap },
              { id: 'contract', label: 'Rules', icon: ShieldCheck },
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
                      ? 'border-accent-build text-accent-build font-semibold'
                      : 'border-transparent text-text-muted hover:text-text hover:bg-surface-raised/20'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Left Panel Body (Allow text selection) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
            {/* TAB: Brief */}
            {leftTab === 'brief' && (
              <div className="space-y-3 animate-fadeIn">
                <MarkdownRenderer content={problem.statement} />
              </div>
            )}

            {/* TAB: Endpoints */}
            {leftTab === 'endpoints' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="divide-y divide-border/20">
                  {endpointCards.map((ep, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <MethodBadge method={ep.method} size="sm" />
                        <span className="font-mono text-xs font-semibold text-text tracking-tight">
                          {ep.path}
                        </span>
                      </div>

                      {/* Sample Request Payload */}
                      {ep.sampleRequest?.body && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider select-none">Request Body</span>
                          <pre className="p-2.5 rounded bg-surface-raised/40 text-[11px] font-mono text-text overflow-x-auto border-0">
                            <code>{JSON.stringify(ep.sampleRequest.body, null, 2)}</code>
                          </pre>
                        </div>
                      )}

                      {/* Expected Status & Body */}
                      {ep.sampleExpect && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider select-none">
                            Expected ({ep.sampleExpect.status || 200})
                          </span>
                          {ep.sampleExpect.bodyContains && (
                            <pre className="p-2.5 rounded bg-surface-raised/40 text-[11px] font-mono text-emerald-400 overflow-x-auto border-0">
                              <code>{JSON.stringify(ep.sampleExpect.bodyContains, null, 2)}</code>
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Contract / Rules */}
            {leftTab === 'contract' && (
              <div className="space-y-3 animate-fadeIn text-xs">
                <div className="divide-y divide-border/20 font-mono text-[11px]">
                  <div className="py-2.5 first:pt-0 space-y-1">
                    <span className="text-accent-build font-bold block">1. Main File</span>
                    <p className="text-text-muted font-sans text-xs">
                      Write your main server in <code className="text-text font-mono">server.js</code>.
                    </p>
                  </div>

                  <div className="py-2.5 space-y-1">
                    <span className="text-accent-build font-bold block">2. Port 3000</span>
                    <p className="text-text-muted font-sans text-xs">
                      Server must listen on port 3000:
                    </p>
                    <code className="block p-2 rounded bg-surface-raised/40 text-text border-0">
                      app.listen(3000, '0.0.0.0');
                    </code>
                  </div>

                  <div className="py-2.5 space-y-1">
                    <span className="text-accent-build font-bold block">3. Multi-File</span>
                    <p className="text-text-muted font-sans text-xs">
                      Create extra files and link them with <code className="text-text font-mono">require('./path')</code>.
                    </p>
                  </div>

                  <div className="py-2.5 space-y-1">
                    <span className="text-accent-build font-bold block">4. In-Memory State</span>
                    <p className="text-text-muted font-sans text-xs">
                      Store items in JavaScript arrays/objects in memory.
                    </p>
                  </div>

                  <div className="py-2.5 space-y-1">
                    <span className="text-accent-build font-bold block">5. Pre-Installed</span>
                    <p className="text-text-muted font-sans text-xs">
                      <code className="text-text font-mono">express</code> and <code className="text-text font-mono">cors</code> are pre-installed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: History / Past Submissions */}
            {leftTab === 'history' && (
              <div className="space-y-3 animate-fadeIn">
                {selectedSubmission ? (
                  /* ─── Detailed Submission View in Left Panel ─── */
                  <div className="space-y-3 animate-fadeIn">
                    {/* Back to all submissions button */}
                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(null)}
                      className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors group cursor-pointer font-medium"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                      <span>All Submissions</span>
                    </button>

                    {/* Verdict & Timestamp Header */}
                    <div className="space-y-1 pb-3 border-b border-border/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedSubmission.status === 'Accepted' ? (
                            <span className="text-sm font-bold text-success flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 shrink-0" /> Accepted
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-danger flex items-center gap-1.5">
                              <XCircle className="h-4 w-4 shrink-0" />
                              <span>{selectedSubmission.status || 'Wrong Answer'}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-accent-build">
                          {selectedSubmission.score ?? 0}%
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(selectedSubmission.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Compact Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-surface-raised/30 border border-border/30 space-y-0.5">
                        <span className="text-[10px] text-text-muted uppercase font-mono block">Score</span>
                        <span className="text-sm font-bold font-mono text-text">
                          {selectedSubmission.score ?? 0}%
                        </span>
                      </div>
                      <div className="p-2 rounded bg-surface-raised/30 border border-border/30 space-y-0.5">
                        <span className="text-[10px] text-text-muted uppercase font-mono block">Tests Passed</span>
                        <span className="text-sm font-bold font-mono text-text">
                          {selectedSubmission.passed ?? 0} / {selectedSubmission.total ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Loaded notice */}
                    {subCodeLoadedNotice && (
                      <div className="p-2 rounded bg-success/15 border border-success/30 text-success text-[11px] font-medium flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" /> Code files loaded into editor!
                      </div>
                    )}

                    {/* Test Results Checklist */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-text">
                        <span>Test Results</span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {selectedSubmission.passed ?? 0}/{selectedSubmission.total ?? 0}
                        </span>
                      </div>

                      {subDetailLoading ? (
                        <div className="py-6 text-center space-y-1.5">
                          <Loader2 className="w-4 h-4 animate-spin text-accent-build mx-auto" />
                          <span className="text-[10px] font-mono text-text-muted">Loading test details...</span>
                        </div>
                      ) : (selectedSubmission.testResults || []).length === 0 ? (
                        <p className="text-xs text-text-muted py-2">No detailed test results recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedSubmission.testResults.map((tr, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded border text-xs font-mono transition-colors ${
                                tr.passed
                                  ? 'bg-success/5 border-success/30 text-text'
                                  : 'bg-danger/5 border-danger/30 text-text'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {tr.passed ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 text-danger shrink-0" />
                                  )}
                                  <span className="font-medium text-text truncate text-[11px]">{tr.name}</span>
                                </div>
                                <span
                                  className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                    tr.passed ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                                  }`}
                                >
                                  {tr.passed ? 'Passed' : 'Failed'}
                                </span>
                              </div>

                              {!tr.passed && tr.got && (
                                <div className="mt-1.5 pt-1.5 border-t border-danger/20">
                                  <pre className="p-1.5 rounded bg-black/60 text-danger-text text-[10px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                    {typeof tr.got === 'object' ? JSON.stringify(tr.got, null, 2) : String(tr.got)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submitted Files Viewer */}
                    {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-text">Submitted Files</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopySubCode(selectedSubmission.files[selectedSubFileIdx]?.content)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-raised border border-border/40 hover:bg-surface-raised/80 text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer"
                              title="Copy file content"
                            >
                              {subCodeCopied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                              <span>{subCodeCopied ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoadSubmissionFiles(selectedSubmission)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-accent-build text-black font-semibold text-[10px] hover:bg-accent-build-hover transition-colors cursor-pointer"
                              title="Load this submission's files into the editor"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Edit in Workspace</span>
                            </button>
                          </div>
                        </div>

                        {/* File tab switcher */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {selectedSubmission.files.map((file, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedSubFileIdx(idx)}
                              className={`px-2 py-0.5 font-mono text-[10px] rounded transition-colors whitespace-nowrap cursor-pointer ${
                                selectedSubFileIdx === idx
                                  ? 'bg-accent-build/15 text-accent-build font-bold border border-accent-build/30'
                                  : 'text-text-muted hover:text-text hover:bg-surface-raised/40'
                              }`}
                            >
                              {file.path}
                            </button>
                          ))}
                        </div>

                        {/* Code view */}
                        <pre className="p-2.5 rounded bg-[#0d0d0d] border border-border/40 text-[11px] font-mono text-text overflow-x-auto max-h-48 leading-relaxed select-text">
                          <code>{selectedSubmission.files[selectedSubFileIdx]?.content || '// Empty file'}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ─── List of Submissions ─── */
                  <>
                    {historyLoading ? (
                      <div className="py-8 text-center space-y-2">
                        <Loader2 className="w-5 h-5 text-accent-build animate-spin mx-auto" />
                        <span className="text-xs font-mono text-text-muted">Loading submissions...</span>
                      </div>
                    ) : historyList.length === 0 ? (
                      <div className="py-8 text-center space-y-2 select-none">
                        <History className="w-6 h-6 text-text-muted mx-auto" />
                        <p className="text-xs text-text-muted">No submissions yet. Click "Submit" to test your project.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/20">
                        {historyList.map((sub) => {
                          const isAc = sub.status === 'Accepted';
                          return (
                            <div
                              key={sub._id}
                              onClick={() => handleSelectSubmission(sub)}
                              className="py-2.5 px-2 rounded hover:bg-surface-raised/40 transition-colors cursor-pointer group space-y-1 text-xs"
                              title="Click to view full submission details & test checklist"
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-semibold font-mono text-[11px] px-2 py-0.5 rounded ${
                                    isAc
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-rose-500/10 text-rose-400'
                                  }`}
                                >
                                  {sub.status}
                                </span>
                                <span className="font-mono text-xs font-bold text-text group-hover:text-accent-build transition-colors">
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
                        })}
                      </div>
                    )}
                  </>
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
          className={`flex-1 min-w-0 flex flex-col min-h-0 bg-bg overflow-hidden ${
            mobileTab === 'code' ? 'flex w-full h-full' : 'hidden lg:flex'
          }`}
        >
          {/* File Tab Bar & Explorer Controls (Flat, Never-Cropped Toolbar) */}
          <div className="flex items-center justify-between border-b border-border/30 bg-bg px-2 select-none shrink-0 h-9">
            {/* Scrollable Tabs List */}
            <div className="flex items-center gap-1 py-1 overflow-x-auto flex-1 min-w-0 scrollbar-none">
              {/* Explorer toggle button */}
              <button
                type="button"
                onClick={() => setFileExplorerOpen(!fileExplorerOpen)}
                className={`p-1.5 rounded transition-colors shrink-0 ${
                  fileExplorerOpen ? 'bg-accent-build/15 text-accent-build font-semibold' : 'text-text-muted hover:text-text'
                }`}
                title="Show/Hide Files"
              >
                <FolderTree className="w-3.5 h-3.5" />
              </button>

              <div className="h-3.5 w-px bg-border/30 mx-1 shrink-0" />

              {/* Open File Tabs */}
              {openTabs.map((tabPath) => {
                const isActive = activeFilePath === tabPath;
                const isEntry = tabPath === 'server.js' || tabPath === 'index.js';
                return (
                  <div
                    key={tabPath}
                    onClick={() => setActiveFilePath(tabPath)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-surface-raised/70 text-text font-semibold'
                        : 'text-text-muted hover:text-text hover:bg-surface-raised/20'
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
                className="p-1 text-text-muted hover:text-accent-build rounded transition-colors ml-1 shrink-0"
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
                className="p-1 text-text-muted hover:text-accent-build rounded transition-colors shrink-0"
                title="New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pinned Right Controls */}
            <div className="flex items-center gap-2 shrink-0 pl-2">
              <span className="text-[10px] font-mono text-text-muted">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </span>
            </div>
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
          <div className="flex-1 min-w-0 min-h-[220px] flex relative overflow-hidden">
            {/* VS Code Style File Explorer Sidebar */}
            {fileExplorerOpen && (
              <div className="w-48 border-r border-border/30 bg-bg flex flex-col shrink-0 text-xs font-mono select-none">
                {/* Explorer Header */}
                <div className="p-2 border-b border-border/30 bg-bg flex items-center justify-between text-[10px] text-text-muted uppercase tracking-wider font-bold">
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
                    const isFolderRenaming = renamingFolder === folderName;
                    return (
                      <div key={folderName} className="space-y-0.5">
                        <div
                          onClick={() => toggleFolderCollapse(folderName)}
                          className="group flex items-center justify-between px-1.5 py-1 rounded text-text-muted hover:text-text hover:bg-surface-raised/40 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <ChevronRight className={`w-3 h-3 transition-transform shrink-0 ${!isCollapsed ? 'rotate-90' : ''}`} />
                            {isCollapsed ? (
                              <Folder className="w-3.5 h-3.5 text-accent-build/80 shrink-0" />
                            ) : (
                              <FolderOpen className="w-3.5 h-3.5 text-accent-build shrink-0" />
                            )}
                            {isFolderRenaming ? (
                              <input
                                type="text"
                                value={renameFolderValue}
                                onChange={(e) => setRenameFolderValue(e.target.value)}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') handleRenameFolder(folderName, renameFolderValue);
                                  if (e.key === 'Escape') setRenamingFolder(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => handleRenameFolder(folderName, renameFolderValue)}
                                className="bg-surface px-1 py-0.5 text-xs font-mono text-text rounded border border-accent-build focus:outline-none w-24"
                                autoFocus
                              />
                            ) : (
                              <span className="font-semibold text-xs truncate">{folderName}</span>
                            )}
                          </div>

                          {!isFolderRenaming && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowNewFileInput(true);
                                  setNewFileType('file');
                                  setNewFileName(`${folderName}/`);
                                }}
                                className="p-0.5 hover:text-accent-build rounded"
                                title="New File in this folder"
                              >
                                <FilePlus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingFolder(folderName);
                                  setRenameFolderValue(folderName);
                                }}
                                className="p-0.5 hover:text-amber-400 rounded"
                                title="Rename folder"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteFolder(folderName, e)}
                                className="p-0.5 hover:text-rose-400 rounded"
                                title="Delete folder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Indented folder files */}
                        {!isCollapsed && (
                          <div className="pl-4 space-y-0.5 border-l border-border/30 ml-2">
                            {folderFiles.map((file) => {
                              const isActive = activeFilePath === file.path;
                              const isRenaming = renamingPath === file.path;
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
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <FileIcon path={file.subPath} className="w-3.5 h-3.5 shrink-0" />
                                    {isRenaming ? (
                                      <input
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          e.stopPropagation();
                                          if (e.key === 'Enter') handleRenameFile(file.path, renameValue);
                                          if (e.key === 'Escape') setRenamingPath(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={() => handleRenameFile(file.path, renameValue)}
                                        className="bg-surface px-1 py-0.5 text-xs font-mono text-text rounded border border-accent-build focus:outline-none w-24"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="truncate text-xs">{file.subPath}</span>
                                    )}
                                  </div>

                                  {!isRenaming && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenamingPath(file.path);
                                          setRenameValue(file.subPath);
                                        }}
                                        className="hover:text-amber-400 p-0.5 rounded"
                                        title="Rename file"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteFile(file.path, e)}
                                        className="hover:text-rose-400 p-0.5 rounded"
                                        title="Delete file"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
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

                  {/* Root files */}
                  {fileTree.rootFiles.map((file) => {
                    const isActive = activeFilePath === file.path;
                    const isEntry = file.path === 'server.js' || file.path === 'index.js';
                    const isRenaming = renamingPath === file.path;
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
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <FileIcon path={file.path} className="w-3.5 h-3.5 shrink-0" />
                          {isRenaming ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleRenameFile(file.path, renameValue);
                                if (e.key === 'Escape') setRenamingPath(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => handleRenameFile(file.path, renameValue)}
                              className="bg-surface px-1 py-0.5 text-xs font-mono text-text rounded border border-accent-build focus:outline-none w-24"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="truncate text-xs">{file.path}</span>
                              {isEntry && (
                                <span className="text-[9px] font-mono px-1 rounded bg-accent-build/20 text-accent-build uppercase font-semibold">
                                  main
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {!isEntry && !isRenaming && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingPath(file.path);
                                setRenameValue(file.path);
                              }}
                              className="hover:text-amber-400 p-0.5 rounded"
                              title="Rename file"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteFile(file.path, e)}
                              className="hover:text-rose-400 p-0.5 rounded"
                              title="Delete file"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monaco Editor Container */}
            <div className="flex-1 min-w-0 h-full relative overflow-hidden">
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

          {/* ─── Bottom Console Area (Resizable & Flat) ─── */}
          <div
            style={{ height: consoleOpen ? `${consoleHeight}px` : 'auto' }}
            className="border-t border-border/30 bg-bg flex flex-col shrink-0 overflow-hidden transition-[height] duration-75"
          >
            {/* Console Toolbar */}
            <div
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="flex items-center justify-between px-3 py-1.5 bg-bg hover:bg-surface-raised/30 cursor-pointer border-b border-border/30 select-none text-xs shrink-0"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-accent-build" />
                <span className="font-mono font-semibold text-text">Console</span>
                {submissionResult?.isRun && (
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-accent-build/15 text-accent-build font-bold uppercase border border-accent-build/30">
                    Run
                  </span>
                )}
                {verdict && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      isAccepted
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : verdict === 'Execution Engine Offline' || verdict === 'Service Unavailable'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-2 bg-bg select-text">
                {runLoading ? (
                  <div className="flex items-center gap-2 text-accent-build text-xs py-2 select-none">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Running visible test cases against your server...</span>
                  </div>
                ) : submissionStatus === 'queued' || submissionStatus === 'running' ? (
                  <div className="flex items-center gap-2 text-accent-build text-xs py-2 select-none">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Evaluating submission against all test cases...</span>
                  </div>
                ) : submissionResult ? (
                  <div className="space-y-2">
                    {/* Verdict Banner */}
                    <div
                      className={`p-3 rounded border flex flex-col gap-2.5 ${
                        isAccepted
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : verdict === 'Execution Engine Offline' || verdict === 'Service Unavailable'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {isAccepted ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                        ) : (
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                            verdict === 'Start Timeout' || verdict === 'Execution Engine Offline' || verdict === 'Service Unavailable'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`} />
                        )}
                        <div className="space-y-1">
                          <span className="font-bold text-xs uppercase tracking-wide block">
                            {verdict === 'Execution Engine Offline' || verdict === 'Service Unavailable'
                              ? 'Execution Engine Offline'
                              : `${submissionResult.isRun ? 'Run: ' : ''}${isAccepted ? 'All Tests Passed' : verdict} (${passedCount}/${totalCount} Passed)`}
                          </span>
                          <p className="text-[11px] font-sans leading-relaxed text-text-muted">
                            {verdict === 'Execution Engine Offline' || verdict === 'Service Unavailable'
                              ? 'The execution engine is currently offline. Please try again later.'
                              : verdict === 'Start Timeout'
                              ? "Server did not respond on port 3000 in time. Verify app.listen(3000, '0.0.0.0') is in server.js."
                              : verdict === 'Internal Error'
                              ? 'The project execution sandbox is temporarily offline or initializing. Please try again shortly.'
                              : isAccepted
                              ? (submissionResult.isRun ? 'All visible requirements passed! Ready to submit solution.' : 'All requirements met!')
                              : submissionResult.message || 'Some test cases did not pass. Check the checklist for details.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Execution Time */}
                    {submissionResult.timeTakenMs != null && (
                      <div className="text-[11px] text-text-muted flex items-center gap-1.5 pt-0.5 select-none">
                        <Clock className="w-3 h-3 text-accent-build" />
                        <span>Completed in {submissionResult.timeTakenMs} ms</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-text-muted text-[11px] py-2 flex items-center gap-2 select-none">
                    <Info className="w-3.5 h-3.5" />
                    <span>Click "Run" to test visible endpoints, or "Submit" for full evaluation.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ════════ COLUMN 3 (RIGHT): Requirements Checklist (Clean, Fixed-Width, Toggleable) ════════ */}
        {checklistOpen && (
          <aside
            className={`w-full lg:w-80 xl:w-[320px] flex-col min-h-0 bg-bg shrink-0 border-l border-border/30 z-10 ${
              mobileTab === 'results' ? 'flex w-full h-full flex-1' : 'hidden lg:flex'
            }`}
          >
          {/* Header & Progress Bar */}
          <div className="px-3.5 py-2 border-b border-border/30 bg-bg space-y-1.5 shrink-0 select-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-build" />
                Checklist
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-accent-build">
                  {submissionStatus === 'finished' ? `${passedCount}/${totalCount} Passed` : `${totalCount} Tests`}
                </span>
                <button
                  type="button"
                  onClick={handleHideChecklist}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-text-muted hover:text-text hover:bg-surface-raised transition-colors text-[11px]"
                  title="Hide checklist"
                >
                  <span>Hide</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress Bar (Determinate or Indeterminate) */}
            <div className="h-1 w-full rounded-full bg-border/40 overflow-hidden relative">
              {runLoading || submissionStatus === 'queued' || submissionStatus === 'running' ? (
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

          {/* Test Groups Container - Seamless Flat List (No nested cards) */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/20 select-text">
            {runLoading || submissionStatus === 'queued' || submissionStatus === 'running' ? (
              <div className="py-8 text-center space-y-2 select-none px-4">
                <Loader2 className="w-5 h-5 text-accent-build animate-spin mx-auto" />
                <span className="text-xs font-mono text-text-muted block">
                  {runLoading ? 'Running visible tests...' : 'Evaluating submission...'}
                </span>
              </div>
            ) : (
              <>
                {/* 1. Visible Tests Grouped by Endpoint */}
                {groupedChecklist.endpointGroups.map((grp) => {
                  const isCollapsed = collapsedGroups[grp.key];
                  return (
                    <div key={grp.key} className="py-1">
                      {/* Group Header (Flat row, no boxed container) */}
                      <div
                        onClick={() => toggleGroupCollapse(grp.key)}
                        className="px-3.5 py-2 flex items-center justify-between gap-2 hover:bg-surface-raised/40 cursor-pointer transition-colors select-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-text-muted transition-transform shrink-0 ${
                              isCollapsed ? '-rotate-90' : ''
                            }`}
                          />
                          <MethodBadge method={grp.method} size="xs" />
                          <span className="font-mono text-xs font-semibold text-text truncate">
                            {grp.path}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Group score indicator */}
                          {submissionStatus === 'finished' && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                grp.passedCount === grp.totalCount
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {grp.passedCount}/{grp.totalCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Group Test Items - Flat, Direct on Surface */}
                      {!isCollapsed && (
                        <div className="pl-6 pr-3.5 space-y-0.5 pb-1">
                          {grp.tests.map((test) => {
                            const isFailed = test.passed === false;
                            const isPassed = test.passed === true;
                            const isExpanded = expandedTests[test.id];

                            return (
                              <div key={test.id} className="py-0.5">
                                <div
                                  onClick={() => isFailed && toggleTestExpand(test.id)}
                                  className={`py-1.5 px-2 rounded flex items-center justify-between gap-2 text-xs transition-colors ${
                                    isPassed
                                      ? 'hover:bg-surface-raised/30'
                                      : isFailed
                                      ? 'cursor-pointer hover:bg-rose-500/10'
                                      : 'hover:bg-surface-raised/20'
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
                                    <span className={`text-xs truncate ${isPassed ? 'text-text' : isFailed ? 'text-rose-300 font-medium' : 'text-text-muted'}`}>
                                      {test.name}
                                    </span>
                                  </div>

                                  {isFailed && (
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-rose-400 transition-transform shrink-0 ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                  )}
                                </div>

                                {/* Expanded Failure Details - Seamless Flat Accent */}
                                {isFailed && isExpanded && (
                                  <div className="my-1 ml-4 pl-3 py-2 border-l-2 border-rose-500/40 bg-surface-raised/20 space-y-2 text-[10px] font-mono animate-fadeIn select-text rounded-r">
                                    <div>
                                      <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider block mb-0.5">REQUEST</span>
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
                                      <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider block mb-0.5">EXPECTED</span>
                                      <div>Status: {test.expect?.status || 200}</div>
                                      {test.expect?.bodyContains && (
                                        <pre className="text-emerald-400/80 overflow-x-auto mt-0.5">
                                          <code>{JSON.stringify(test.expect.bodyContains, null, 2)}</code>
                                        </pre>
                                      )}
                                    </div>

                                    <div>
                                      <span className="text-[9px] text-rose-400 uppercase font-bold tracking-wider block mb-0.5">RETURNED</span>
                                      <div className="text-rose-300">Status: {test.got?.status ?? 'No response received'}</div>
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

                {/* 2. Hidden Verification Suite - Flat */}
                {groupedChecklist.hiddenTests.length > 0 && (
                  <div className="py-1">
                    <div className="px-3.5 py-2 flex items-center justify-between gap-2 select-none">
                      <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-text-muted">
                        <Lock className="w-3.5 h-3.5 text-accent-build" />
                        <span>Hidden Edge Cases</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        {groupedChecklist.hiddenTests.filter((t) => t.passed).length}/{groupedChecklist.hiddenTests.length} Passed
                      </span>
                    </div>

                    <div className="pl-6 pr-3.5 space-y-0.5 pb-1">
                      {groupedChecklist.hiddenTests.map((test) => (
                        <div
                          key={test.id}
                          className="py-1.5 px-2 rounded flex items-center justify-between gap-2 text-xs hover:bg-surface-raised/20"
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
        )}
      </div>

      {/* ─── Reset Confirmation Modal ─── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn select-none">
          <div className="bg-surface border border-border/80 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2 rounded-full bg-amber-500/10 border border-amber-500/25">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text">Reset Code to Starter Template?</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              This will restore the original starter template files and discard your current code changes.
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

      {/* ─── Persistent Mobile Bottom Action Bar (< 1024px) ─── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border/50 px-3 py-2 flex items-center justify-between shadow-2xl">
        <button
          type="button"
          onClick={() => {
            if (mobileTab === 'code') {
              setMobileTab('results');
              setChecklistOpen(true);
            } else {
              setMobileTab('code');
              setChecklistOpen(false);
            }
          }}
          className="px-2.5 py-1 rounded text-xs text-text-muted hover:text-text bg-surface-raised/40 border border-border/40 font-mono flex items-center gap-1 cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-accent-build" />
          <span>{mobileTab === 'code' ? 'Checklist' : 'Editor'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Mobile Run Button */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={runLoading || submissionStatus === 'queued' || submissionStatus === 'running'}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-surface-raised hover:bg-surface-raised/80 text-text transition-colors border border-border/50 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {runLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-build" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-accent-build" />
                <span>Run</span>
              </>
            )}
          </button>

          {/* Mobile Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={runLoading || submissionStatus === 'queued' || submissionStatus === 'running' || rateLimitWait > 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-accent-build hover:bg-accent-build-hover text-black transition-all shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {submissionStatus === 'queued' || submissionStatus === 'running' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : rateLimitWait > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-900" />
                <span>Wait {rateLimitWait}s</span>
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
