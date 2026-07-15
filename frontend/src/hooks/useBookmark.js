import { useState, useEffect } from 'react';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useBookmark(problemId) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !problemId) return;

    const checkBookmark = async () => {
      try {
        const res = await API.get('/users/bookmarks');
        const bookmarks = res.data.bookmarks || [];
        const found = bookmarks.some((b) => b._id === problemId);
        setIsBookmarked(found);
      } catch (err) {
        console.error('Failed to check bookmark status', err);
      }
    };
    checkBookmark();
  }, [user, problemId]);

  const toggleBookmark = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isBookmarked) {
        await API.delete(`/problems/${problemId}/bookmark`);
        setIsBookmarked(false);
      } else {
        await API.post(`/problems/${problemId}/bookmark`);
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error('Bookmark toggle failed', err);
    } finally {
      setLoading(false);
    }
  };

  return { isBookmarked, toggleBookmark, loading };
}