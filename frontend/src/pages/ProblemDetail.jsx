import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/client';
import Editor from '@monaco-editor/react';
import { useBookmark } from '../hooks/useBookmark';
import {
  Terminal,
  Cpu,
  Play,
  Send,
  Loader2,
  MessageSquare,
  Bookmark,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  X,
  ShieldAlert,
  Clock,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

const LANGUAGES = [
  { id: 'cpp', label: 'C++ (GCC 14)', monaco: 'cpp' },
  { id: 'java', label: 'Java (OpenJDK 21)', monaco: 'java' },
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'javascript', label: 'JavaScript (Node.js)', monaco: 'javascript' },
  { id: 'c', label: 'C (GCC 14)', monaco: 'c' },
];

const defaultTemplates = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}`,
  python: `# Your code here\n`,
  javascript: `// Your code here\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}`,
};

export default function ProblemDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const terminalRef = useRef(null);

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('cpp');
  const [codeByLang, setCodeByLang] = useState(defaultTemplates);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState(null);
  const [activeTestTab, setActiveTestTab] = useState(0);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showSample, setShowSample] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);

  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem?._id);

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

        const cRes = await API.get(`/problems/${p._id}/comments`);
        if (!isMounted) return;

        setComments(cRes.data.comments || cRes.data || []);
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
    try {
      const res = await API.post(`/problems/${problem._id}/run`, {
        language,
        code: activeCode,
      });
      setTerminalLogs({ mode: 'sandbox', data: res.data });
    } catch (e) {
      setTerminalLogs({
        mode: 'error',
        out: e.response?.data?.message || 'Compilation sequence core failure.',
      });
    } finally {
      setRunning(false);
    }
  };

  const triggerProductionTransmit = async () => {
    setSubmitting(true);
    setTerminalLogs(null);
    try {
      const res = await API.post('/submissions', {
        problemId: problem._id,
        language,
        code: activeCode,
      });
      setTerminalLogs({ mode: 'production', data: res.data.submission || res.data });
    } catch (e) {
      setTerminalLogs({
        mode: 'error',
        out: e.response?.data?.message || 'Remote runtime aggregate processing fault.',
      });
    } finally {
      setSubmitting(false);
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
      console.error('Comment write cycle dropped.', err);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col lg:flex-row gap-0 bg-primary text-secondary">
      {/* ─── LEFT PANEL – Problem Description ─── */}
      <div className="lg:w-[38%] flex flex-col overflow-y-auto border-r border-base/80 bg-primary/95">
        <div className="p-5 border-b border-base/80 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
              <Cpu className="h-3.5 w-3.5" />
              Problem
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-medium text-primary truncate">{problem?.title}</h1>
              {problem?.difficulty && <DifficultyBadge difficulty={problem.difficulty} />}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              className="p-1.5 rounded-lg hover:bg-hover/60 transition-colors"
            >
              <Bookmark
                className={`h-5 w-5 transition-all ${
                  isBookmarked ? 'fill-cyan-400 text-cyan-400' : 'text-muted hover:text-secondary'
                }`}
              />
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                showComments
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-muted hover:text-secondary hover:bg-hover/40'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs font-mono">{comments.length}</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          <div className="text-sm leading-relaxed text-secondary whitespace-pre-wrap font-sans">
            {problem?.description}
          </div>

          {problem?.constraints && (
            <div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1.5">
                Constraints
              </div>
              <ul className="text-sm space-y-1 text-muted font-mono">
                {problem.constraints
                  .split('\n')
                  .filter(Boolean)
                  .map((c, i) => (
                    <li key={i} className="before:content-['▹'] before:text-cyan-700 before:mr-2">
                      {c}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {problem?.sampleTestCases?.length > 0 && (
            <div className="border border-base/80 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSample(!showSample)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-hover/30 hover:bg-hover/50 transition-colors text-sm font-mono"
              >
                <span className="flex items-center gap-2 text-secondary">
                  {showSample ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Sample Test Cases
                </span>
                <span className="text-[10px] text-muted uppercase tracking-wider">▸</span>
              </button>
              {showSample && (
                <div className="px-4 py-3 space-y-3 border-t border-base/80">
                  {problem.sampleTestCases.map((tc, i) => (
                    <div key={i} className="bg-hover/20 rounded-lg p-3 text-sm font-mono">
                      <div>
                        <span className="text-cyan-400">Input:</span>{' '}
                        <span className="whitespace-pre-wrap">{tc.displayInput || tc.input}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400">Output:</span>{' '}
                        <span className="whitespace-pre-wrap">{tc.output}</span>
                      </div>
                      {tc.explanation && (
                        <div className="mt-1 text-xs text-muted border-t border-base/60 pt-1.5">
                          {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showComments && (
            <div className="border-t border-base/80 pt-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted">💬 {comments.length} comments</span>
                <button
                  onClick={() => setShowComments(false)}
                  className="text-muted hover:text-secondary p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-light">
                {comments.map((c, i) => (
                  <div key={i} className="bg-hover/30 border border-base/60 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-[10px] text-muted font-mono mb-0.5">
                      <span className="text-cyan-400">{c.user?.name || 'Anonymous'}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-secondary">{c.text}</p>
                  </div>
                ))}
                <form onSubmit={handlePostComment} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write your solution approach..."
                    className="flex-1 bg-hover/60 border border-base/80 px-3 py-2 text-sm text-primary placeholder-muted rounded-lg focus:border-cyan-500 outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL – Editor & Terminal ─── */}
      <div className="lg:w-[62%] flex flex-col h-full bg-primary">
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/80 border-b border-base/80 flex-shrink-0">
          <div className="flex items-center gap-3 text-xs text-muted font-mono">
            <span className="text-cyan-400">●</span>
            <span className="uppercase tracking-wider">Workspace</span>
            <span className="text-muted/50">|</span>
            <span className="text-muted">Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-input border border-base rounded-lg px-2.5 py-1 text-xs font-mono text-secondary outline-none focus:border-cyan-500 cursor-pointer transition-colors"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg hover:bg-hover transition-colors text-muted hover:text-primary"
              title="Copy code"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-[200px] bg-input">
          <Editor
            height="100%"
            theme="vs-dark"
            language={LANGUAGES.find((l) => l.id === language)?.monaco || 'cpp'}
            value={activeCode}
            onChange={handleCodeChange}
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
              padding: { top: 12 },
              lineNumbersMinChars: 3,
              automaticLayout: true,
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-base/80 bg-secondary/60 flex-shrink-0">
          <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
            ● Online
          </span>
          <div className="flex gap-2">
            <button
              onClick={triggerSandboxRun}
              disabled={running || submitting}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-base bg-hover/50 px-4 py-2 text-secondary hover:text-primary transition-all disabled:opacity-40 hover:bg-hover/80"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 text-cyan-400" />
              )}
              Run
            </button>
            <button
              onClick={triggerProductionTransmit}
              disabled={running || submitting}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 px-5 py-2 text-white shadow-lg shadow-cyan-500/20 transition-all hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Submit
            </button>
          </div>
        </div>

        {/* ─── LEETCODE-STYLE TERMINAL OUTPUT ─── */}
        <div
          ref={terminalRef}
          className="bg-[#1e1e1e] border-t border-base/80 p-4 flex-shrink-0 min-h-[170px] max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-light"
        >
          {terminalLogs ? (
            <div className="font-mono text-xs">
              {/* Error Mode */}
              {terminalLogs.mode === 'error' && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="space-y-1">
                    <span className="font-bold text-rose-300">Compilation / Execution Error</span>
                    <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-rose-200/90">
                      {terminalLogs.out}
                    </p>
                  </div>
                </div>
              )}

              {/* Sandbox Run Mode */}
              {terminalLogs.mode === 'sandbox' && (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      {terminalLogs.data.overallStatus?.toLowerCase() === 'accepted' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-emerald-400 tracking-wide flex items-center gap-1.5">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            Accepted
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-rose-400 tracking-wide flex items-center gap-1.5">
                            <XCircle className="h-5 w-5 text-rose-400" />
                            {terminalLogs.data.overallStatus || 'Wrong Answer'}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-sans">
                      {terminalLogs.data.passed} / {terminalLogs.data.total} Testcases Passed
                    </span>
                  </div>

                  {/* Test Case Tabs */}
                  {terminalLogs.data.results?.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {terminalLogs.data.results.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveTestTab(idx)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition-all ${
                              activeTestTab === idx
                                ? 'bg-white/10 text-white font-medium border border-white/20'
                                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                r.passed ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>

                      {/* Active Test Case Detail Card */}
                      {terminalLogs.data.results[activeTestTab] && (
                        <div className="space-y-2 font-mono text-[11px]">
                          {/* Input */}
                          <div>
                            <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                              Input
                            </div>
                            <div className="bg-zinc-900/90 border border-white/5 rounded-lg p-2.5 text-zinc-200 whitespace-pre-wrap">
                              {terminalLogs.data.results[activeTestTab].displayInput ||
                                terminalLogs.data.results[activeTestTab].input ||
                                'N/A'}
                            </div>
                          </div>

                          {/* Output vs Expected */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                                Output
                              </div>
                              <div
                                className={`border rounded-lg p-2.5 whitespace-pre-wrap ${
                                  terminalLogs.data.results[activeTestTab].passed
                                    ? 'bg-zinc-900/90 border-emerald-500/20 text-emerald-300'
                                    : 'bg-zinc-900/90 border-rose-500/20 text-rose-300'
                                }`}
                              >
                                {terminalLogs.data.results[activeTestTab].actualOutput || '(empty)'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                                Expected Output
                              </div>
                              <div className="bg-zinc-900/90 border border-white/5 rounded-lg p-2.5 text-emerald-400 whitespace-pre-wrap">
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

              {/* Production Submission Transmit Mode */}
              {terminalLogs.mode === 'production' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      {terminalLogs.data.status?.toLowerCase() === 'accepted' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-extrabold text-emerald-400 tracking-wide flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                            Accepted
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-extrabold text-rose-400 tracking-wide flex items-center gap-2">
                            <XCircle className="h-6 w-6 text-rose-400" />
                            {terminalLogs.data.status || 'Wrong Answer'}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-zinc-400 mt-1 font-sans">
                        {terminalLogs.data.passedTestCases ?? 0} /{' '}
                        {terminalLogs.data.totalTestCases ?? 0} test cases passed.
                      </div>
                    </div>
                  </div>

                  {/* Metrics Row (LeetCode-style runtime/memory boxes) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-emerald-300/70 font-sans uppercase tracking-wider">
                            Runtime
                          </div>
                          <div className="text-sm font-bold text-emerald-400 font-mono">
                            {terminalLogs.data.runtime ?? 0} ms
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <HardDrive className="h-4 w-4 text-purple-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-purple-300/70 font-sans uppercase tracking-wider">
                            Memory
                          </div>
                          <div className="text-sm font-bold text-purple-400 font-mono">
                            {terminalLogs.data.memory ?? 0} MB
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center text-zinc-500 text-xs font-mono">
              <Terminal className="h-4 w-4 mr-2 text-zinc-500" />
              Run your code to test against sample test cases...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}