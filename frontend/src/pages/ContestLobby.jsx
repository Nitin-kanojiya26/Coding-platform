import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useContestSocket } from '../hooks/useContestSocket';
import { toast } from 'react-hot-toast';
import {
  Trophy,
  Clock,
  Users,
  Copy,
  Check,
  Mail,
  Shield,
  ArrowRight,
  Code2,
  Boxes,
  Loader2,
  Lock,
  Globe,
  LogOut,
  X,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { getAvatarSrc } from '../utils/avatar';

function ParticipantAvatar({ avatar, name, className = "h-6 w-6 rounded" }) {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = getAvatarSrc(avatar);
  const hasAvatar = Boolean(avatar && !imgError);

  if (!hasAvatar) {
    const initials = (name || 'U').trim().slice(0, 2).toUpperCase();
    return (
      <div className={`flex items-center justify-center bg-surface-raised border border-border/60 font-mono text-text font-medium select-none overflow-hidden shrink-0 ${className}`}>
        <span className="text-[10px]">{initials}</span>
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

export default function ContestLobby() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [joining, setJoining] = useState(false);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [calculatingRatings, setCalculatingRatings] = useState(false);

  const handleCalculateRatings = async () => {
    setCalculatingRatings(true);
    try {
      const res = await API.post(`/contests/${contest._id}/ratings/calculate`);
      toast.success('Ratings successfully calculated!');
      setContest((prev) => ({
        ...prev,
        ratingsCalculatedAt: res.data?.calculatedAt || new Date().toISOString(),
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error calculating ratings.');
    } finally {
      setCalculatingRatings(false);
    }
  };

  // Real-time socket
  const { contestStatus: socketContestStatus } = useContestSocket(id);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
  });

  const fetchContestDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/contests/${id}`);
      setContest(res.data?.contest);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load contest.');
      navigate('/contests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContestDetails();
  }, [id]);

  useEffect(() => {
    if (!contest?.startTime) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(contest.startTime).getTime();
      const diff = start - now;

      if (diff <= 0 || socketContestStatus === 'running' || contest.status === 'running') {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, totalSeconds: Math.floor(diff / 1000) });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest?.startTime, socketContestStatus, contest?.status]);

  const handleJoin = async () => {
    try {
      setJoining(true);
      await API.post(`/contests/${id}/join`);
      toast.success('Registered for contest.');
      fetchContestDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join contest.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Withdraw from this contest?')) return;
    try {
      setLeaving(true);
      await API.post(`/contests/${id}/leave`);
      toast.success('Withdrew from contest.');
      fetchContestDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw.');
    } finally {
      setLeaving(false);
    }
  };

  const handleCopyCode = () => {
    if (!contest?.joinCode) return;
    navigator.clipboard.writeText(contest.joinCode);
    setCopiedCode(true);
    toast.success('Code copied.');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendInvites = async (e) => {
    e.preventDefault();
    const emailsList = inviteEmails
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emailsList.length === 0) {
      toast.error('Enter at least one email address.');
      return;
    }

    try {
      setInviting(true);
      const res = await API.post(`/contests/${id}/invite`, { emails: emailsList });
      toast.success(res.data?.message || 'Invites sent.');
      setShowInviteModal(false);
      setInviteEmails('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending invites.');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center text-text-muted text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        <span>Loading lobby...</span>
      </div>
    );
  }

  if (!contest) return null;

  const isRunning = contest.status === 'running' || socketContestStatus === 'running' || timeLeft.totalSeconds <= 0;
  const isEnded = contest.status === 'ended' || socketContestStatus === 'ended';
  const isRegistered = contest.hasJoined;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-text select-none">
      
      {/* ─── Breadcrumb ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-text-muted pb-3 border-b border-border/30">
        <Link to="/contests" className="hover:text-text transition-colors flex items-center gap-1">
          &larr; Back to Contests
        </Link>
        <span className="text-[11px] text-text-muted">
          {contest.durationMinutes ? `${contest.durationMinutes} mins` : ''}
        </span>
      </div>

      {/* ─── Header Info (Seamless Flat LeetCode Style) ──────────────── */}
      <div className="space-y-3 pb-6 border-b border-border/30">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-raised border border-border text-text">
            {contest.type === 'dsa' ? 'Algorithms' : 'Backend APIs'}
          </span>

          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-raised border border-border text-text-muted">
            {contest.kind === 'public' ? 'Public' : 'Private'}
          </span>

          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-raised border border-border text-text-muted">
            {contest.scoring === 'icpc' ? 'Standard Rules' : 'Score per Test'}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
          {contest.title}
        </h1>

        {contest.description && (
          <p className="text-xs text-text-muted max-w-3xl leading-relaxed">
            {contest.description}
          </p>
        )}
      </div>

      {/* ─── Countdown / Live State Bar ─────────────────────────────── */}
      <div className="py-4 border-b border-border/30">
        {isRunning && !isEnded ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
              </span>
              <span className="font-semibold text-success">Contest is live!</span>
              <span className="text-text-muted">
                {isRegistered || user?.role === 'admin' || contest.createdBy === user?.id || contest.createdBy?._id === user?.id || contest.allowLateJoin
                  ? 'Challenges are unlocked.'
                  : 'Registration has closed. You can view problems and practice once the contest ends.'}
              </span>
            </div>

            {isRegistered || user?.role === 'admin' || contest.createdBy === user?.id || contest.createdBy?._id === user?.id || contest.allowLateJoin ? (
              <Link
                to={`/contests/${contest._id}/arena`}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#2cbb5d] hover:bg-[#2cbb5d]/90 text-white font-semibold text-xs transition-colors self-start sm:self-center shadow-xs"
              >
                Enter Contest <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-raised border border-border text-text-muted text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Entry opens when contest ends</span>
              </div>
            )}
          </div>
        ) : isEnded ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Contest has concluded. Standings are finalized.</span>
              {contest.ratingsCalculatedAt ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-success/10 text-success border border-success/30">
                  Ratings Finalized
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Ratings Pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {(user?.role === 'admin' || contest.createdBy === user?.id || contest.createdBy?._id === user?.id) && (
                <button
                  type="button"
                  onClick={handleCalculateRatings}
                  disabled={calculatingRatings}
                  className="px-3 py-1 rounded bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 transition-colors text-xs font-semibold flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>
                    {calculatingRatings
                      ? 'Calculating...'
                      : contest.ratingsCalculatedAt
                      ? 'Recalculate Ratings'
                      : 'Calculate Ratings'}
                  </span>
                </button>
              )}
              <Link
                to={`/contests/${contest._id}/arena`}
                className="px-3 py-1 rounded bg-surface-raised border border-border text-text hover:bg-border/30 transition-colors"
              >
                View Standings
              </Link>
            </div>
          </div>
        ) : (
          /* Upcoming Countdown Ticker */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium block">
                Starting In
              </span>
              <div className="font-mono text-2xl font-bold text-text tracking-wider">
                {String(timeLeft.days).padStart(2, '0')}d :{' '}
                {String(timeLeft.hours).padStart(2, '0')}h :{' '}
                {String(timeLeft.minutes).padStart(2, '0')}m :{' '}
                {String(timeLeft.seconds).padStart(2, '0')}s
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {/* Creator Preview Button */}
              {(user?.role === 'admin' || contest.createdBy === user?.id || contest.createdBy?._id === user?.id) && (
                <Link
                  to={`/contests/${contest._id}/arena`}
                  className="px-3 py-1.5 rounded bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Preview Arena</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}

              {isRegistered ? (
                <>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-surface-raised text-success text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                  </span>
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="px-3 py-1.5 rounded bg-surface-raised border border-border hover:border-danger text-text-muted hover:text-danger text-xs transition-colors"
                  >
                    {leaving ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="px-4 py-1.5 rounded bg-[#2cbb5d] hover:bg-[#2cbb5d]/90 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  {joining ? 'Registering...' : 'Register'}
                </button>
              )}

              {contest.kind === 'private' && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-3 py-1.5 rounded bg-surface-raised border border-border text-text hover:bg-border/30 text-xs transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-text-muted" /> Invite
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Private Join Code Bar (Flat & Minimal) ──────────────────── */}
      {contest.kind === 'private' && contest.joinCode && (
        <div className="flex items-center justify-between py-3 px-3 rounded bg-surface-raised/40 border border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Invitation Code:</span>
            <span className="font-mono font-bold text-accent text-sm tracking-widest">
              {contest.joinCode}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-raised border border-border hover:bg-border/30 text-text transition-colors text-[11px]"
          >
            {copiedCode ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}

      {/* ─── Format Rules & Details ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">
            Format & Rules
          </h3>
          <div className="divide-y divide-border/20 text-xs">
            <div className="py-2 flex items-center justify-between">
              <span className="text-text-muted">Duration</span>
              <span className="font-mono text-text">{contest.durationMinutes} minutes</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-text-muted">Problem Selection</span>
              <span className="text-text">
                {contest.selection?.mode === 'manual'
                  ? `Custom Selected (${contest.problems?.length || 0} challenges)`
                  : `Random Selection (${contest.problems?.length || (contest.selection?.counts ? (Number(contest.selection.counts.easy || 0) + Number(contest.selection.counts.medium || 0) + Number(contest.selection.counts.hard || 0)) : 0)} challenges)`}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-text-muted">Scoring System</span>
              <span className="text-text">
                {contest.scoring === 'icpc' ? 'Standard Rules (+20m penalty per wrong answer)' : 'Score per Test Case'}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-text-muted">Late Join Allowed</span>
              <span className="text-text">{contest.allowLateJoin ? 'Yes' : 'No'}</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-text-muted">Leaderboard Updates</span>
              <span className="text-success">Live Updates</span>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider">
              Participants
            </h3>
            <span className="text-xs font-mono text-text-muted">
              {contest.participantsCount || 1} / {contest.maxParticipants || 100}
            </span>
          </div>

          <div className="py-4 text-center border-t border-border/20 space-y-1">
            <div className="text-xl font-bold font-mono text-text">
              {contest.participantsCount || 1}
            </div>
            <p className="text-[11px] text-text-muted">Developers registered</p>
          </div>
        </div>
      </div>

      {/* ─── Invite Friends Modal (Flat Minimalist) ──────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface border border-border rounded-md p-5 shadow-2xl relative space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Invite Participants
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-text-muted">
              Enter email addresses to send instant contest invitation links.
            </p>

            <form onSubmit={handleSendInvites} className="space-y-3">
              <div>
                <textarea
                  rows={3}
                  required
                  placeholder="user@example.com, developer@company.com"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surface-inset border border-border text-text font-mono text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <button
                type="submit"
                disabled={inviting || !inviteEmails.trim()}
                className="w-full py-2 rounded bg-surface-raised border border-border hover:border-accent text-text hover:text-accent font-medium text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                  </>
                ) : (
                  'Send Invites'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
