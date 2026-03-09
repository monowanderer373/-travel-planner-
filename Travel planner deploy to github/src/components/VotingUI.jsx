import { useState } from 'react';
import './VotingUI.css';

export default function VotingUI({ itemId, initialVotes = 0, votes: controlledVotes, isMostVoted, onVote }) {
  const [localVotes, setLocalVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);
  const votes = controlledVotes !== undefined ? controlledVotes : localVotes;

  const handleUpvote = () => {
    if (voted) return;
    const next = votes + 1;
    setLocalVotes(next);
    setVoted(true);
    onVote?.(itemId, next);
  };

  return (
    <div className="voting-ui">
      {isMostVoted && <span className="voting-badge">Most voted</span>}
      <button
        type="button"
        className="voting-btn"
        onClick={handleUpvote}
        disabled={voted}
        aria-label="Upvote"
      >
        👍 {votes}
      </button>
    </div>
  );
}
