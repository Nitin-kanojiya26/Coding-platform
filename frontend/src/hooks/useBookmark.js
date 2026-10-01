import { useState, useEffect } from 'react';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';

let bookmarksPromise = null;
let bookmarksCache = null;

export function useBookmark(problemId) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !problemId) return;

    const checkBookmark = async () => {
      try {
        if (!bookmarksPromise) {
          bookmarksPromise = API.get('/users/bookmarks').then(res => {
            bookmarksCache = res.data.bookmarks || res.data.data || [];
            return bookmarksCache;
          }).catch(err => {
            bookmarksPromise = null; // reset on error
            throw err;
          });
        }
        const bookmarks = bookmarksCache || await bookmarksPromise;
        const found = bookmarks.some((b) => b._id.toString() === problemId.toString());
        setIsBookmarked(found);
      } catch (err) {
        console.error('Failed to check bookmark status', err);
      }
    };
    checkBookmark();
  }, [user, problemId]);

  const toggleBookmark = async () => {
    if (!user || !problemId) return;
    setLoading(true);
    try {
      if (isBookmarked) {
        await API.delete(`/users/problems/${problemId}/bookmark`);
        setIsBookmarked(false);
        if (bookmarksCache) bookmarksCache = bookmarksCache.filter(b => b._id.toString() !== problemId.toString());
      } else {
        await API.post(`/users/problems/${problemId}/bookmark`);
        setIsBookmarked(true);
        if (bookmarksCache) bookmarksCache.push({ _id: problemId });
      }
    } catch (err) {
      console.error('Bookmark toggle failed:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return { isBookmarked, toggleBookmark, loading };
}