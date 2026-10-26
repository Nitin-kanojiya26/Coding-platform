/**
 * Compute the dynamic contest status from timestamps and flags.
 * Status is NEVER stored statically in the database.
 * 
 * @param {Object} contest - Contest document or plain object
 * @param {Date|number} now - Server clock timestamp (defaults to current Date)
 * @returns {'cancelled'|'scheduled'|'running'|'ended'}
 */
function computeContestStatus(contest, now = new Date()) {
  if (!contest) return 'cancelled';

  if (contest.cancelledAt) {
    return 'cancelled';
  }

  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const startTime = new Date(contest.startTime).getTime();
  const endTime = new Date(contest.endTime).getTime();

  if (currentTime < startTime) {
    return 'scheduled';
  }

  if (currentTime >= startTime && currentTime < endTime) {
    return 'running';
  }

  return 'ended';
}

module.exports = {
  computeContestStatus,
};
