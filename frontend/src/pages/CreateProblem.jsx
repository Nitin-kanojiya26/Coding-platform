import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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
      const payload = {
        ...form,
        tags: form.tags,
        sampleTestCases: form.sampleTestCases,
        hiddenTestCases: form.hiddenTestCases,
      };
      const res = await API.post('/problems', payload);
      setMessage('Problem created successfully!');
      setTimeout(() => navigate('/problems'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create problem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Create New Problem</h1>

      {message && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
          <CheckCircle className="h-5 w-5" /> {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            placeholder="e.g., Two Sum"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows="4"
            required
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            placeholder="Describe the problem..."
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Difficulty</label>
          <select
            name="difficulty"
            value={form.difficulty}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white outline-none focus:border-cyan-500"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma separated)</label>
          <input
            value={form.tags.join(', ')}
            onChange={handleTags}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            placeholder="array, hashmap, math"
          />
        </div>

        {/* Constraints */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Constraints</label>
          <textarea
            name="constraints"
            value={form.constraints}
            onChange={handleChange}
            rows="2"
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            placeholder="e.g., 1 <= nums.length <= 10^4"
          />
        </div>

        {/* Time & Memory */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Time Limit (ms)</label>
            <input
              type="number"
              name="timeLimit"
              value={form.timeLimit}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Memory Limit (MB)</label>
            <input
              type="number"
              name="memoryLimit"
              value={form.memoryLimit}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Sample Test Cases */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">Sample Test Cases</label>
            <button
              type="button"
              onClick={() => addTestCase('sample')}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {form.sampleTestCases.map((tc, idx) => (
            <div key={idx} className="flex gap-2 items-start mb-2 bg-slate-800/30 p-3 rounded-xl">
              <div className="flex-1 space-y-1">
                <input
                  placeholder="Input"
                  value={tc.input}
                  onChange={(e) => handleTestCaseChange('sample', idx, 'input', e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
                <input
                  placeholder="Output"
                  value={tc.output}
                  onChange={(e) => handleTestCaseChange('sample', idx, 'output', e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
                <input
                  placeholder="Explanation (optional)"
                  value={tc.explanation}
                  onChange={(e) => handleTestCaseChange('sample', idx, 'explanation', e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={() => removeTestCase('sample', idx)}
                className="p-1 text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Hidden Test Cases */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">Hidden Test Cases</label>
            <button
              type="button"
              onClick={() => addTestCase('hidden')}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {form.hiddenTestCases.map((tc, idx) => (
            <div key={idx} className="flex gap-2 items-start mb-2 bg-slate-800/30 p-3 rounded-xl">
              <div className="flex-1 space-y-1">
                <input
                  placeholder="Input"
                  value={tc.input}
                  onChange={(e) => handleTestCaseChange('hidden', idx, 'input', e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
                <input
                  placeholder="Output"
                  value={tc.output}
                  onChange={(e) => handleTestCaseChange('hidden', idx, 'output', e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={() => removeTestCase('hidden', idx)}
                className="p-1 text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Problem'}
        </button>
      </form>
    </div>
  );
}