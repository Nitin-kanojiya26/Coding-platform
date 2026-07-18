import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, LayoutGrid, Sliders, Terminal } from 'lucide-react';

export default function CreateProblem() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'easy',
    tags: [],
    constraints: '',
    timeLimit: 1000,
    memoryLimit: 128,
    sampleTestCases: [{ input: '', output: '', explanation: '' }],
    hiddenTestCases: [{ input: '', output: '' }],
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTags = (e) => {
    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
    setForm({ ...form, tags });
  };

  const addTestCase = (type) => {
    if (type === 'sample') {
      setForm({ ...form, sampleTestCases: [...form.sampleTestCases, { input: '', output: '', explanation: '' }] });
    } else {
      setForm({ ...form, hiddenTestCases: [...form.hiddenTestCases, { input: '', output: '' }] });
    }
  };

  const removeTestCase = (type, index) => {
    if (type === 'sample') {
      const updated = form.sampleTestCases.filter((_, i) => i !== index);
      setForm({ ...form, sampleTestCases: updated });
    } else {
      const updated = form.hiddenTestCases.filter((_, i) => i !== index);
      setForm({ ...form, hiddenTestCases: updated });
    }
  };

  const handleTestCaseChange = (type, index, field, value) => {
    if (type === 'sample') {
      const updated = form.sampleTestCases.map((tc, i) =>
        i === index ? { ...tc, [field]: value } : tc
      );
      setForm({ ...form, sampleTestCases: updated });
    } else {
      const updated = form.hiddenTestCases.map((tc, i) =>
        i === index ? { ...tc, [field]: value } : tc
      );
      setForm({ ...form, hiddenTestCases: updated });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = { ...form };
      await API.post('/problems', payload);
      setMessage('Problem created successfully!');
      setTimeout(() => navigate('/problems'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create problem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-8 py-12 text-zinc-300 font-sans antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Simple, Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-900">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Create Problem
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Add a new coding challenge with test cases and runtime limits.
            </p>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 transition-all">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 transition-all">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Form Grid Layout */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left / Main Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Core Details */}
            <div className="border border-zinc-900 bg-[#050507] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-900/50">
                <LayoutGrid className="h-4 w-4 text-zinc-500" />
                <h2 className="text-sm font-medium text-white">Problem Details</h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="w-full text-sm rounded-lg border border-zinc-900 bg-zinc-950 px-3.5 py-2 text-white placeholder-zinc-700 outline-none focus:border-zinc-700 transition-colors"
                  placeholder="e.g., Two Sum"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="6"
                  required
                  className="w-full text-sm font-sans rounded-lg border border-zinc-900 bg-zinc-950 px-3.5 py-2 text-white placeholder-zinc-700 outline-none focus:border-zinc-700 transition-colors resize-none leading-relaxed"
                  placeholder="Describe the problem objective, inputs, and expected outcomes..."
                />
              </div>
            </div>

            {/* Test Cases */}
            <div className="border border-zinc-900 bg-[#050507] rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-900/50">
                <Terminal className="h-4 w-4 text-zinc-500" />
                <h2 className="text-sm font-medium text-white">Test Cases</h2>
              </div>

              {/* Sample Test Cases */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-zinc-300">Sample Test Cases</h3>
                    <p className="text-[11px] text-zinc-500">Visible to users in the description.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTestCase('sample')}
                    className="inline-flex items-center gap-1 text-xs text-space-blue hover:text-white transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Sample
                  </button>
                </div>
                
                {form.sampleTestCases.map((tc, idx) => (
                  <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                      <span>Case #{idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-mono block">Input</span>
                        <textarea
                          placeholder="Input data"
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange('sample', idx, 'input', e.target.value)}
                          rows="2"
                          className="w-full text-xs font-mono rounded border border-zinc-900 bg-[#050507] px-3 py-2 text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-700 resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-mono block">Output</span>
                        <textarea
                          placeholder="Expected output"
                          value={tc.output}
                          onChange={(e) => handleTestCaseChange('sample', idx, 'output', e.target.value)}
                          rows="2"
                          className="w-full text-xs font-mono rounded border border-zinc-900 bg-[#050507] px-3 py-2 text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-700 resize-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 block">Explanation (Optional)</span>
                      <input
                        placeholder="Why this output is correct..."
                        value={tc.explanation}
                        onChange={(e) => handleTestCaseChange('sample', idx, 'explanation', e.target.value)}
                        className="w-full text-xs rounded border border-zinc-900 bg-[#050507] px-3 py-2 text-zinc-400 placeholder-zinc-700 outline-none focus:border-zinc-700"
                      />
                    </div>
                    {form.sampleTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase('sample', idx)}
                        className="inline-flex items-center gap-1 text-xs text-rose-500/80 hover:text-rose-400 transition-colors pt-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove case
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Hidden Test Cases */}
              <div className="space-y-4 pt-4 border-t border-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-zinc-300">Hidden Test Cases</h3>
                    <p className="text-[11px] text-zinc-500">Used for evaluation behind the scenes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTestCase('hidden')}
                    className="inline-flex items-center gap-1 text-xs text-space-blue hover:text-white transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Hidden Case
                  </button>
                </div>
                
                {form.hiddenTestCases.map((tc, idx) => (
                  <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                      <span>Hidden #{idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-mono block">Input</span>
                        <textarea
                          placeholder="Input data"
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange('hidden', idx, 'input', e.target.value)}
                          rows="2"
                          className="w-full text-xs font-mono rounded border border-zinc-900 bg-[#050507] px-3 py-2 text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-700 resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-mono block">Output</span>
                        <textarea
                          placeholder="Expected output"
                          value={tc.output}
                          onChange={(e) => handleTestCaseChange('hidden', idx, 'output', e.target.value)}
                          rows="2"
                          className="w-full text-xs font-mono rounded border border-zinc-900 bg-[#050507] px-3 py-2 text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-700 resize-none"
                        />
                      </div>
                    </div>
                    {form.hiddenTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase('hidden', idx)}
                        className="inline-flex items-center gap-1 text-xs text-rose-500/80 hover:text-rose-400 transition-colors pt-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove case
                      </button>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Right Sidebar Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="border border-zinc-900 bg-[#050507] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-900/50">
                <Sliders className="h-4 w-4 text-zinc-500" />
                <h2 className="text-sm font-medium text-white">Settings</h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Difficulty</label>
                <div className="relative">
                  <select
                    name="difficulty"
                    value={form.difficulty}
                    onChange={handleChange}
                    className="w-full text-sm rounded-lg border border-zinc-900 bg-zinc-950 px-3.5 py-2 text-white outline-none focus:border-zinc-750 cursor-pointer appearance-none"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Tags</label>
                <input
                  value={form.tags.join(', ')}
                  onChange={handleTags}
                  className="w-full text-sm rounded-lg border border-zinc-900 bg-zinc-950 px-3.5 py-2 text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-700 transition-colors"
                  placeholder="e.g., arrays, hash-map"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Constraints</label>
                <textarea
                  name="constraints"
                  value={form.constraints}
                  onChange={handleChange}
                  rows="2"
                  className="w-full text-sm rounded-lg border border-zinc-900 bg-zinc-950 px-3.5 py-2 text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-700 transition-colors resize-none"
                  placeholder="e.g., 1 <= nums.length <= 10^5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Time Limit (ms)</label>
                  <input
                    type="number"
                    name="timeLimit"
                    value={form.timeLimit}
                    onChange={handleChange}
                    className="w-full text-sm rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Memory (MB)</label>
                  <input
                    type="number"
                    name="memoryLimit"
                    value={form.memoryLimit}
                    onChange={handleChange}
                    className="w-full text-sm rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-space-blue hover:bg-space-blue/90 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-space-blue/10"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Problem'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}