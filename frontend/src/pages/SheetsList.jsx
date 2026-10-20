import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { BookOpen, ChevronRight, ArrowUpRight } from 'lucide-react';

export default function SheetsList() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSheets() {
      try {
        const res = await API.get('/sheets');
        setSheets(res.data || []);
      } catch (err) {
        console.error('Failed to fetch sheets', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSheets();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-4 pt-2 animate-pulse">
        <div className="h-6 w-44 bg-surface-raised rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-surface-raised/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pt-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" /> Curated Problem Sheets
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Master fundamental data structures and algorithmic patterns through structured study plans.
          </p>
        </div>

        <div className="text-[11px] font-mono text-text-muted">
          Available: <strong className="text-text font-mono">{sheets.length}</strong>
        </div>
      </div>

      {sheets.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <BookOpen className="h-6 w-6 mx-auto text-text-muted" />
          <p className="text-xs text-text-muted">No study sheets available yet.</p>
          <Link
            to="/problems"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Explore all problems <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        /* Flat Grid of Sheets (No heavy gradients, no separate box backgrounds) */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sheets.map((sheet) => (
            <Link
              key={sheet._id}
              to={`/sheets/${sheet.slug || sheet._id}`}
              className="p-3.5 border border-border/40 hover:border-border hover:bg-surface-raised/30 rounded transition-colors flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium text-text group-hover:text-accent transition-colors truncate">
                    {sheet.name}
                  </h2>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors shrink-0" />
                </div>
                <p className="text-xs text-text-muted mt-1 line-clamp-2">
                  {sheet.description || 'A curated collection of essential coding interview questions.'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono pt-1 border-t border-border/20">
                <span>Start plan</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
