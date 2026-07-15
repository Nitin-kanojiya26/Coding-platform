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
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

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

  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem?._id);

  useEffect(() => {
    async function loadProblemWorkspace() {
      try {
        const res = await API.get(`/problems/${slug}`);
        const p = res.data.problem || res.data;
        setProblem(p);

        setCode(
          p.language === 'java'
            ? `public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}`
            : `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`
        );

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

  if (loading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-7rem)] overflow-hidden">
      {/* Left Panel – Problem Description */}
      <div className="lg:col-span-5 flex flex-col h-full overflow-y-auto space-y-4 pr-1">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 uppercase tracking-wider">
                <Cpu className="h-3.5 w-3.5" />
                Problem
              </div>
              <h1 className="text-xl font-bold text-white mt-1">{problem?.title}</h1>
            </div>
            <button
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              className="p-2 rounded-lg hover:bg-slate-800 transition-all duration-200"
            >
              <Bookmark
                className={`h-6 w-6 transition-all duration-200 ${
                  isBookmarked ? 'fill-cyan-400 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={problem?.difficulty} />
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-400">
              ⏱ {problem?.timeLimit || 1000}ms
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-400">
              💾 {problem?.memoryLimit || 128}MB
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800 pt-4">
            {problem?.description}
          </p>

          {problem?.constraints && (
            <div className="rounded-xl bg-slate-800/30 border border-slate-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Constraints
              </p>
              <p className="text-sm text-slate-300 mt-1">{problem.constraints}</p>
            </div>
          )}
        </div>

        {/* Sample Test Cases */}
        {problem?.sampleTestCases?.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowSample(!showSample)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors duration-200"
            >
              <span className="font-medium text-slate-300">Sample Test Cases</span>
              {showSample ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
            </button>
            {showSample && (
              <div className="px-6 py-4 border-t border-slate-800 space-y-3">
                {problem.sampleTestCases.map((tc, i) => (
                  <div key={i} className="bg-slate-800/30 rounded-lg p-3 text-sm">
                    <div>
                      <span className="text-slate-500">Input:</span>
                      <code className="ml-2 text-cyan-300 font-mono">{tc.input}</code>
                    </div>
                    <div>
                      <span className="text-slate-500">Output:</span>
                      <code className="ml-2 text-emerald-300 font-mono">{tc.output}</code>
                    </div>
                    {tc.explanation && <p className="text-xs text-slate-400 mt-1">{tc.explanation}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-purple-400 uppercase tracking-wider">
            <MessageSquare className="h-3.5 w-3.5" />
            Discussion ({comments.length})
          </div>

          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-all duration-200"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            >
              Post
            </button>
          </form>

          <div className="space-y-3 max-h-40 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No comments yet.</p>
            ) : (
              comments.map((c, i) => (
                <div key={i} className="text-sm p-3 rounded-xl bg-slate-800/30 border border-slate-800/50">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-300">{c.user?.name || 'Unknown'}</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-300 mt-1">{c.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel – Code Editor */}
      <div className="lg:col-span-7 flex flex-col h-full bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex h-12 w-full items-center justify-between bg-slate-800/50 px-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-slate-400">
              Editor
            </span>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-mono text-slate-300 outline-none focus:border-cyan-500 cursor-pointer transition-all duration-200"
          >
            <option value="cpp">C++ (GCC 14)</option>
            <option value="java">Java (OpenJDK 21)</option>
          </select>
        </div>

        <div className="flex-1 w-full bg-[#0d1117]">
          <Editor
            height="100%"
            theme="vs-dark"
            language={language === 'cpp' ? 'cpp' : 'java'}
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
              padding: { top: 12 },
              lineNumbersMinChars: 3,
            }}
          />
        </div>

        <div className="border-t border-slate-800 bg-slate-900/50 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
              Workspace Status: Operational
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={triggerSandboxRun}
                disabled={running || submitting}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-2 text-slate-300 hover:text-white transition-all duration-200 disabled:opacity-40 hover:scale-[1.02]"
              >
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-cyan-400" />}
                Run
              </button>
              <button
                onClick={triggerProductionTransmit}
                disabled={running || submitting}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-5 py-2 text-white shadow-lg transition-all duration-200 hover:opacity-90 disabled:opacity-40 hover:scale-[1.02]"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Submit
              </button>
            </div>
          </div>

          {terminalLogs && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs max-h-36 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
              {terminalLogs.mode === 'error' && (
                <div className="text-rose-400 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{terminalLogs.out}</p>
                </div>
              )}

              {terminalLogs.mode === 'sandbox' && (
                <div className="space-y-2">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800 pb-1">
                    // Sandbox Results
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>Overall:</span>
                      <span
                        className={`font-bold ${
                          terminalLogs.data.overallStatus === 'accepted' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {terminalLogs.data.overallStatus}
                      </span>
                      <span className="text-slate-500">
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
                          <span className="text-slate-400">Test {idx + 1}:</span>
                          <span className={`ml-1 ${r.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.status}
                          </span>
                          {!r.passed && (
                            <div className="text-slate-500 text-[10px]">
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
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
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
                  <div className="grid grid-cols-3 gap-2 text-slate-500 text-[11px]">
                    <div>
                      Passed:{' '}
                      <span className="text-white font-bold">
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
          )}
        </div>
      </div>
    </div>
  );
}