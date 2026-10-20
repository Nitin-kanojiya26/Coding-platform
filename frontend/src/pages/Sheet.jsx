import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BookOpen, CheckCircle, Circle, ChevronLeft } from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

export default function Sheet() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState(new Set());
  const [attemptedIds, setAttemptedIds] = useState(new Set());

  useEffect(() => {
    async function fetchSheetData() {
      try {
        const [problemsRes, subsRes] = await Promise.all([
          API.get('/problems?limit=100'),
          API.get('/submissions/my?limit=1000')
        ]);
        const rawProblems = problemsRes.data?.problems || problemsRes.data?.data?.problems || [];
        const allProblems = rawProblems.map(p => ({
          ...p,
          tags: (p.tags || []).map(t => String(t).toLowerCase())
        }));
        const sheetProblems = allProblems.filter(p => p.sheetName?.toLowerCase() === sheetId?.toLowerCase());
        setProblems(sheetProblems);

        const history = subsRes.data?.submissions || subsRes.data?.data?.submissions || [];
        const solved = new Set();
        const attempted = new Set();

        history.forEach(sub => {
          const id = String(sub.problemId || sub.problem?._id || sub.problem);
          if (sub.status === 'Accepted' || sub.status === 'accepted' || sub.status === 'AC') {
            solved.add(id);
          } else {
            attempted.add(id);
          }
        });

        user?.solvedProblems?.forEach(p => {
          solved.add(String(p._id || p));
        });

        setSolvedIds(solved);
        setAttemptedIds(attempted);
      } catch (err) {
        console.error('Failed to load sheet data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSheetData();
  }, [sheetId, user]);

  // Group problems by topic
  const groupedProblems = useMemo(() => {
    return problems.reduce((acc, problem) => {
      const topic = problem.topic || 'General Practice';
      if (!acc[topic]) acc[topic] = [];
      acc[topic].push(problem);
      return acc;
    }, {});
  }, [problems]);

  const easyTotal = problems.filter(p => (p.difficulty || '').toLowerCase() === 'easy').length;
  const easySolved = problems.filter(p => (p.difficulty || '').toLowerCase() === 'easy' && solvedIds.has(String(p._id))).length;

  const medTotal = problems.filter(p => (p.difficulty || '').toLowerCase() === 'medium').length;
  const medSolved = problems.filter(p => (p.difficulty || '').toLowerCase() === 'medium' && solvedIds.has(String(p._id))).length;

  const hardTotal = problems.filter(p => (p.difficulty || '').toLowerCase() === 'hard').length;
  const hardSolved = problems.filter(p => (p.difficulty || '').toLowerCase() === 'hard' && solvedIds.has(String(p._id))).length;

  const totalProblems = problems.length;
  const totalSolved = problems.filter(p => solvedIds.has(String(p._id))).length;
  const progressPercent = totalProblems === 0 ? 0 : Math.round((totalSolved / totalProblems) * 100);

  if (loading) {
    return (
      <div className="w-full space-y-4 pt-2 animate-pulse">
        <div className="h-6 w-44 bg-surface-raised rounded" />
        <div className="h-10 w-full bg-surface-raised/40 rounded" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-surface-raised/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pt-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/sheets')}
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-raised/50 transition-colors"
            title="Back to sheets"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text capitalize">
              {(sheetId || 'Curated').replace('-', ' ')} Sheet
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Structured study plan organized by algorithmic topic.
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-text-muted">
          Progress: <strong className="text-success font-mono">{totalSolved}</strong> / {totalProblems} ({progressPercent}%)
        </div>
      </div>

      {/* Flat Inline Stat Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2.5 border-y border-border/40 text-xs">
        <div>
          <span className="text-[11px] text-text-muted block">Total Solved</span>
          <span className="font-mono text-sm font-medium text-text mt-0.5 block">
            {totalSolved} / {totalProblems} ({progressPercent}%)
          </span>
        </div>
        <div className="sm:border-l sm:border-border/30 sm:pl-3">
          <span className="text-[11px] text-text-muted block">Easy</span>
          <span className="font-mono text-sm font-medium text-success mt-0.5 block">
            {easySolved} / {easyTotal}
          </span>
        </div>
        <div className="sm:border-l sm:border-border/30 sm:pl-3">
          <span className="text-[11px] text-text-muted block">Medium</span>
          <span className="font-mono text-sm font-medium text-warning mt-0.5 block">
            {medSolved} / {medTotal}
          </span>
        </div>
        <div className="sm:border-l sm:border-border/30 sm:pl-3">
          <span className="text-[11px] text-text-muted block">Hard</span>
          <span className="font-mono text-sm font-medium text-danger mt-0.5 block">
            {hardSolved} / {hardTotal}
          </span>
        </div>
      </div>

      {/* Topic-by-Topic Flat Problem Tables */}
      {Object.keys(groupedProblems).length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <BookOpen className="h-6 w-6 mx-auto text-text-muted" />
          <p className="text-xs text-text-muted">No problems found for this sheet.</p>
        </div>
      ) : (
        <div className="space-y-6 pt-1">
          {Object.entries(groupedProblems).map(([topic, topicProblems]) => (
            <div key={topic} className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
                <span className="font-medium text-text uppercase tracking-wider text-[11px]">
                  {topic}
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  {topicProblems.filter(p => solvedIds.has(String(p._id))).length} / {topicProblems.length} solved
                </span>
              </div>

              <div className="border-t border-border/40">
                {topicProblems.map((problem) => {
                  const currentId = String(problem._id);
                  const isSolved = solvedIds.has(currentId);
                  const isAttempted = !isSolved && attemptedIds.has(currentId);

                  return (
                    <div
                      key={problem._id}
                      onClick={() => navigate(`/problems/${problem.slug || problem._id}`)}
                      className="group flex items-center justify-between py-2.5 px-2 border-b border-border/30 hover:bg-surface-raised/35 transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-4 flex justify-center">
                          {isSolved ? (
                            <CheckCircle className="w-3.5 h-3.5 text-success fill-success/10" />
                          ) : isAttempted ? (
                            <Circle className="w-2.5 h-2.5 fill-warning text-warning" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-border/60" />
                          )}
                        </div>

                        <span className="text-xs sm:text-sm font-normal text-text group-hover:text-accent transition-colors truncate">
                          {problem.title}
                        </span>
                      </div>

                      <div className="w-16 flex justify-end shrink-0 ml-3">
                        <DifficultyBadge difficulty={problem.difficulty} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
