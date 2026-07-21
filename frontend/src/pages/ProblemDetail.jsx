import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  Bookmark,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  X,
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

// Language configuration
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

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState(null);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showSample, setShowSample] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);

  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem?._id);

  useEffect(() => {
    async function loadProblemWorkspace() {
      try {
        const res = await API.get(`/problems/${slug}`);
        const p = res.data.problem || res.data;
        setProblem(p);

        const lang = p.language || 'cpp';
        setLanguage(lang);
        setCode(defaultTemplates[lang] || defaultTemplates.cpp);

        const cRes = await API.get(`/problems/${p._id}/comments`);
        setComments(cRes.data.comments || cRes.data || []);
      } catch (err) {
        console.error('Workspace stream broken.', err);
        navigate('/problems');
      } finally {
        setLoading(false);
      }
    }
    loadProblemWorkspace();
  }, [slug, navigate]);

  const triggerSandboxRun = async () => {
    setRunning(true);
    setTerminalLogs(null);
    try {
      const res = await API.post(`/problems/${problem._id}/run`, { language, code });
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
      const res = await API.post('/submissions', { problemId: problem._id, language, code });
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
    navigator.clipboard.writeText(code);
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
        {/* Header */}
        <div className="p-5 border-b border-base/80 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
              <Cpu className="h-3.5 w-3.5" />
              Problem
            </div>
            <h1 className="text-lg font-medium text-primary mt-0.5 truncate">{problem?.title}</h1>
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
                showComments ? 'text-cyan-400 bg-cyan-500/10' : 'text-muted hover:text-secondary hover:bg-hover/40'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs font-mono">{comments.length}</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 flex-1">
          {/* Description */}
          <div className="text-sm leading-relaxed text-secondary whitespace-pre-wrap font-sans">
            {problem?.description}
          </div>

          {/* Constraints */}
          {problem?.constraints && (
            <div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1.5">
                Constraints
              </div>
              <ul className="text-sm space-y-1 text-muted font-mono">
                {problem.constraints.split('\n').filter(Boolean).map((c, i) => (
                  <li key={i} className="before:content-['▹'] before:text-cyan-700 before:mr-2">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ─── SAMPLE TEST CASES ─── */}
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
                        {tc.displayInput || tc.input}
                      </div>
                      <div>
                        <span className="text-emerald-400">Output:</span> {tc.output}
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

          {/* Comments Panel (toggleable) */}
          {showComments && (
            <div className="border-t border-base/80 pt-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted">
                  💬 {comments.length} comments
                </span>
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
        {/* Editor Toolbar */}
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
              onChange={(e) => {
                const newLang = e.target.value;
                setLanguage(newLang);
                setCode(defaultTemplates[newLang] || defaultTemplates.cpp);
              }}
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
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-[200px] bg-input">
          <Editor
            height="100%"
            theme="vs-dark"
            language={LANGUAGES.find(l => l.id === language)?.monaco || 'cpp'}
            value={code}
            onChange={(val) => setCode(val || '')}
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

        {/* Actions */}
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
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-cyan-400" />}
              Run
            </button>
            <button
              onClick={triggerProductionTransmit}
              disabled={running || submitting}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 px-5 py-2 text-white shadow-lg shadow-cyan-500/20 transition-all hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-primary/90 border-t border-base/80 p-4 flex-shrink-0 min-h-[140px] max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-light">
          {terminalLogs ? (
            <div className="font-mono text-xs">
              {terminalLogs.mode === 'error' && (
                <div className="text-rose-400 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{terminalLogs.out}</p>
                </div>
              )}

              {terminalLogs.mode === 'sandbox' && (
                <div className="space-y-2">
                  <div className="text-muted text-[10px] font-bold uppercase tracking-wider border-b border-base/60 pb-1">
                    // Sandbox Results
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted">
                      <span>Overall:</span>
                      <span
                        className={`font-bold ${
                          terminalLogs.data.overallStatus === 'accepted' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {terminalLogs.data.overallStatus}
                      </span>
                      <span className="text-muted/60">
                        ({terminalLogs.data.passed}/{terminalLogs.data.total})
                      </span>
                    </div>
                    {terminalLogs.data.results?.map((r, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        {r.passed ? (
                          <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5" />
                        ) : (
                          <XCircle className="h-3 w-3 text-rose-400 mt-0.5" />
                        )}
                        <div>
                          <span className="text-muted">Test {idx + 1}:</span>
                          <span className={`ml-1 ${r.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.status}
                          </span>
                          {!r.passed && (
                            <div className="text-muted/60 text-[10px]">
                              Expected: {r.expectedOutput} | Actual: {r.actualOutput || '(empty)'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {terminalLogs.mode === 'production' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-base/60 pb-1.5">
                    <span
                      className={`font-bold uppercase tracking-widest ${
                        terminalLogs.data.status?.toLowerCase() === 'accepted'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      Status: {terminalLogs.data.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-muted/70 text-[11px]">
                    <div>
                      Passed:{' '}
                      <span className="text-primary font-bold">
                        {terminalLogs.data.passedTestCases || 0}/{terminalLogs.data.totalTestCases || 0}
                      </span>
                    </div>
                    <div>
                      Runtime:{' '}
                      <span className="text-cyan-400 font-bold">{terminalLogs.data.runtime ?? 0} ms</span>
                    </div>
                    <div>
                      Memory:{' '}
                      <span className="text-purple-400 font-bold">{terminalLogs.data.memory ?? 0} MB</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted text-sm font-mono">
              <Terminal className="h-4 w-4 mr-2" />
              Run your code to see output here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}