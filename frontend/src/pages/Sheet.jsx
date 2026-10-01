import React, { useState, useEffect } from 'react';
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
  const [solvedIds, setSolvedIds] = useState([]);
  const [attemptedIds, setAttemptedIds] = useState([]);

  useEffect(() => {
    async function fetchSheetData() {
      try {
        const [problemsRes, subsRes] = await Promise.all([
          API.get('/problems?limit=100'),
          API.get('/submissions/my?limit=1000')
        ]);
        const allProblems = problemsRes.data?.problems || problemsRes.data?.data?.problems || [];
        const sheetProblems = allProblems.filter(p => p.sheetName?.toLowerCase() === sheetId?.toLowerCase());
        setProblems(sheetProblems);

        const history = subsRes.data?.submissions || subsRes.data?.data?.submissions || [];
        const acceptedProblemIds = history
          .filter(sub => sub.status === 'Accepted' || sub.status === 'AC')
          .map(sub => String(sub.problemId || sub.problem?._id || sub.problem));
        const allAttemptedIds = history.map(sub => String(sub.problemId || sub.problem?._id || sub.problem));
        const userContextSolved = user?.solvedProblems?.map(p => String(p._id || p)) || [];
        
        const finalSolved = [...new Set([...userContextSolved, ...acceptedProblemIds])];
        const finalAttempted = [...new Set(allAttemptedIds)];

        setSolvedIds(finalSolved);
        setAttemptedIds(finalAttempted);
      } catch (err) {
        console.error('Failed to load sheet', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSheetData();
  }, [sheetId]);

  // Group problems by topic
  const groupedProblems = problems.reduce((acc, problem) => {
    const topic = problem.topic || 'Uncategorized';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(problem);
    return acc;
  }, {});

  const getStatsByDifficulty = (diff) => {
    const total = problems.filter(p => p.difficulty === diff).length;
    const solved = problems.filter(p => p.difficulty === diff && solvedIds.includes(p._id)).length;
    return { total, solved };
  };

  const easyStats = getStatsByDifficulty('easy');
  const mediumStats = getStatsByDifficulty('medium');
  const hardStats = getStatsByDifficulty('hard');

  const totalProblems = problems.length;
  const solvedCount = problems.filter(p => solvedIds.includes(p._id)).length;
  const progressPercent = totalProblems === 0 ? 0 : Math.round((solvedCount / totalProblems) * 100);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary">
        <div className="w-8 h-8 border-4 border-base border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-6 py-10 text-muted font-sans antialiased">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-base">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-hover rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary capitalize">{sheetId.replace('-', ' ')} Sheet</h1>
            <p className="text-sm text-muted">Master the most important problems organized by topic.</p>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-secondary border border-light/80 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center gap-8">
          
          {(() => {
            const C = 251.2;
            const easyLen = totalProblems ? (easyStats.solved / totalProblems) * C : 0;
            const medLen = totalProblems ? (mediumStats.solved / totalProblems) * C : 0;
            const hardLen = totalProblems ? (hardStats.solved / totalProblems) * C : 0;

            const easyAngle = -90;
            const medAngle = -90 + (totalProblems ? (easyStats.solved / totalProblems) * 360 : 0);
            const hardAngle = medAngle + (totalProblems ? (mediumStats.solved / totalProblems) * 360 : 0);

            return (
              <div className="flex-shrink-0 relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-input fill-none stroke-[6]" />
                  {easyLen > 0 && <circle cx="50" cy="50" r="40" className="stroke-emerald-400 fill-none stroke-[6] transition-all duration-1000 ease-out" strokeDasharray={`${easyLen} ${C}`} transform={`rotate(${easyAngle} 50 50)`} strokeLinecap="round" />}
                  {medLen > 0 && <circle cx="50" cy="50" r="40" className="stroke-amber-400 fill-none stroke-[6] transition-all duration-1000 ease-out" strokeDasharray={`${medLen} ${C}`} transform={`rotate(${medAngle} 50 50)`} strokeLinecap="round" />}
                  {hardLen > 0 && <circle cx="50" cy="50" r="40" className="stroke-rose-400 fill-none stroke-[6] transition-all duration-1000 ease-out" strokeDasharray={`${hardLen} ${C}`} transform={`rotate(${hardAngle} 50 50)`} strokeLinecap="round" />}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-primary">{progressPercent}%</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted font-bold">Solved</span>
                </div>
              </div>
            );
          })()}

          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-secondary">Overall Progress</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Easy</span>
                  <span className="text-sm font-bold text-primary">{easyStats.solved}<span className="text-muted text-[10px] ml-0.5">/{easyStats.total}</span></span>
                </div>
                <div className="w-full h-1 bg-emerald-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${easyStats.total ? (easyStats.solved/easyStats.total)*100 : 0}%` }} />
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Medium</span>
                  <span className="text-sm font-bold text-primary">{mediumStats.solved}<span className="text-muted text-[10px] ml-0.5">/{mediumStats.total}</span></span>
                </div>
                <div className="w-full h-1 bg-amber-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${mediumStats.total ? (mediumStats.solved/mediumStats.total)*100 : 0}%` }} />
                </div>
              </div>

              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">Hard</span>
                  <span className="text-sm font-bold text-primary">{hardStats.solved}<span className="text-muted text-[10px] ml-0.5">/{hardStats.total}</span></span>
                </div>
                <div className="w-full h-1 bg-rose-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${hardStats.total ? (hardStats.solved/hardStats.total)*100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Topics List */}
        <div className="space-y-6">
          {Object.entries(groupedProblems).length === 0 ? (
            <div className="text-center py-10 text-muted bg-secondary rounded-2xl border border-base">
              No problems found for this sheet yet! 
            </div>
          ) : (
            Object.entries(groupedProblems).map(([topic, topicProblems]) => {
              const topicSolved = topicProblems.filter(p => solvedIds.includes(p._id)).length;
              return (
                <div key={topic} className="bg-secondary border border-light/80 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-hover/30 px-5 py-4 border-b border-base flex justify-between items-center">
                    <h2 className="font-bold text-primary">{topic}</h2>
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-bold text-muted">
                        <span className="text-primary">{topicSolved}</span> / {topicProblems.length} Solved
                      </div>
                      <div className="w-16 h-1.5 bg-input rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className="h-full bg-cyan-400 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${(topicSolved / topicProblems.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-base/60">
                    {topicProblems.map(problem => {
                      const currentId = String(problem._id);
                      const isSolved = solvedIds.includes(currentId);
                      const isAttempted = !isSolved && attemptedIds.includes(currentId);

                      return (
                        <Link 
                          key={problem._id} 
                          to={`/problems/${problem.slug}`}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-hover/50 transition-colors group"
                        >
                          {isSolved ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          ) : isAttempted ? (
                            <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                            </div>
                          ) : (
                            <Circle className="w-5 h-5 text-muted group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <h3 className={`text-sm font-medium transition-colors ${isSolved ? 'text-primary' : 'text-secondary group-hover:text-primary'}`}>
                              {problem.title}
                            </h3>
                          </div>
                          <DifficultyBadge difficulty={problem.difficulty} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
