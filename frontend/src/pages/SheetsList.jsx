import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { BookOpen, ChevronRight, Loader2, Sparkles } from 'lucide-react';

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
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-6 py-10 text-muted font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3 pb-6 border-b border-base">
          <BookOpen className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-primary flex items-center gap-2">
              Curated Sheets
              <Sparkles className="h-4 w-4 text-accent/80 animate-pulse" />
            </h1>
            <p className="text-sm text-muted">Master specific topics with structured problem sets.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sheets.map((sheet, index) => {
            const colorThemes = ['cyan', 'emerald', 'indigo', 'rose', 'amber'];
            const colorTheme = colorThemes[index % colorThemes.length];
            return (
              <div key={sheet._id} className={`bg-gradient-to-r from-${colorTheme}-900/40 to-slate-900/40 border border-${colorTheme}-500/30 rounded-2xl p-6 shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[200px]`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {sheet.imageUrl ? (
                    <img src={sheet.imageUrl} alt={sheet.name} className="w-32 h-32 object-cover rounded opacity-40 mix-blend-overlay -translate-y-4 translate-x-4" />
                  ) : (
                    <BookOpen className={`w-32 h-32 text-${colorTheme}-400 -translate-y-4 translate-x-4`} />
                  )}
                </div>
                <div className="relative z-10">
                  <h2 className="text-xl font-bold text-white mb-2">{sheet.name}</h2>
                  <p className={`text-sm text-${colorTheme}-100/70 mb-4 line-clamp-3`}>{sheet.description || 'A curated collection of essential problems.'}</p>
                </div>
                <div className="relative z-10 mt-auto">
                  <Link to={`/sheets/${sheet.slug}`} className={`inline-flex items-center gap-2 bg-${colorTheme}-500/20 border border-${colorTheme}-500/50 hover:bg-${colorTheme}-500 text-${colorTheme}-400 hover:text-white font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-lg`}>
                    Start Solving <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
          
          {sheets.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-muted bg-secondary border border-base rounded-2xl">
              No sheets have been created yet. Check back later!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
