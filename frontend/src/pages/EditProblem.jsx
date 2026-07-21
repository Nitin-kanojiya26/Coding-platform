import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/client';
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, LayoutGrid, Sliders, Terminal } from 'lucide-react';

export default function EditProblem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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
    sampleTestCases: [{ input: '', output: '', explanation: '', displayInput: '' }],
    hiddenTestCases: [{ input: '', output: '', displayInput: '' }],
  });

  // Fetch problem data
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await API.get(`/problems/id/${id}`);
        const p = res.data.problem || res.data;
        setForm({
          title: p.title || '',
          description: p.description || '',
          difficulty: p.difficulty || 'easy',
          tags: p.tags || [],
          constraints: p.constraints || '',
          timeLimit: p.timeLimit || 1000,
          memoryLimit: p.memoryLimit || 128,
          sampleTestCases: p.sampleTestCases || [{ input: '', output: '', explanation: '', displayInput: '' }],
          hiddenTestCases: p.hiddenTestCases || [{ input: '', output: '', displayInput: '' }],
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load problem.');
      } finally {
        setFetching(false);
      }
    };
    fetchProblem();
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTags = (e) => {
    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
    setForm({ ...form, tags });
  };

  const addTestCase = (type) => {
    if (type === 'sample') {
      setForm({ ...form, sampleTestCases: [...form.sampleTestCases, { input: '', output: '', explanation: '', displayInput: '' }] });
    } else {
      setForm({ ...form, hiddenTestCases: [...form.hiddenTestCases, { input: '', output: '', displayInput: '' }] });
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
      await API.put(`/problems/id/${id}`, payload);
      setMessage('Problem updated successfully!');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update problem.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <Loader2 className="h-5 w-5 border-2 border-base border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-8 py-12 text-secondary font-sans antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-base">
          <div>
            <h1 className="text-xl font-semibold text-primary tracking-tight">
              Edit Problem
            </h1>
            <p className="text-sm text-muted mt-1">
              Update the challenge details, test cases, and limits.
            </p>
          </div>
        </div>

        {message && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-base bg-card rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-base/50">
                <LayoutGrid className="h-4 w-4 text-muted" />
                <h2 className="text-sm font-medium text-primary">Problem Details</h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="w-full text-sm rounded-lg border border-base bg-input px-3.5 py-2 text-primary placeholder-muted outline-none focus:border-light transition-colors"
                  placeholder="e.g., Two Sum"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="6"
                  required
                  className="w-full text-sm font-sans rounded-lg border border-base bg-input px-3.5 py-2 text-primary placeholder-muted outline-none focus:border-light transition-colors resize-none leading-relaxed"
                  placeholder="Describe the problem..."
                />
              </div>
            </div>

            <div className="border border-base bg-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-base/50">
                <Terminal className="h-4 w-4 text-muted" />
                <h2 className="text-sm font-medium text-primary">Test Cases</h2>
              </div>

              {/* Sample Test Cases */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-secondary">Sample Test Cases</h3>
                    <p className="text-[11px] text-muted">Visible to users.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTestCase('sample')}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                {form.sampleTestCases.map((tc, idx) => (
                  <div key={idx} className="bg-secondary border border-base rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted font-mono">
                      <span>Case #{idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted font-mono block">Display Input (Optional)</span>
                        <input
                          placeholder="e.g., s = 'abc'"
                          value={tc.displayInput || ''}
                          onChange={(e) => handleTestCaseChange('sample', idx, 'displayInput', e.target.value)}
                          className="w-full text-xs rounded border border-base bg-primary px-3 py-2 text-secondary placeholder-muted outline-none focus:border-light"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted font-mono block">Raw Input</span>
                        <input
                          placeholder="abc"
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange('sample', idx, 'input', e.target.value)}
                          className="w-full text-xs rounded border border-base bg-primary px-3 py-2 text-secondary placeholder-muted outline-none focus:border-light"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted font-mono block">Output</span>
                        <input
                          placeholder="3"
                          value={tc.output}
                          onChange={(e) => handleTestCaseChange('sample', idx, 'output', e.target.value)}
                          className="w-full text-xs rounded border border-base bg-primary px-3 py-2 text-secondary placeholder-muted outline-none focus:border-light"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted block">Explanation (Optional)</span>
                        <input
                          placeholder="Why this output..."
                          value={tc.explanation}
                          onChange={(e) => handleTestCaseChange('sample', idx, 'explanation', e.target.value)}
                          className="w-full text-xs rounded border border-base bg-primary px-3 py-2 text-muted placeholder-muted outline-none focus:border-light"
                        />
                      </div>
                    </div>
                    {form.sampleTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase('sample', idx)}
                        className="inline-flex items-center gap-1 text-xs text-rose-500/80 hover:text-rose-400 transition-colors pt-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Hidden Test Cases */}
              <div className="space-y-4 pt-4 border-t border-base/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-secondary">Hidden Test Cases</h3>
                    <p className="text-[11px] text-muted">Used for evaluation.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTestCase('hidden')}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                {form.hiddenTestCases.map((tc, idx) => (
                  <div key={idx} className="bg-secondary border border-base rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted font-mono">
                      <span>Hidden #{idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted font-mono block">Display Input</span>
                        <input
                          placeholder="e.g., s = 'xyz'"
                          value={tc.displayInput || ''}
                          onChange={(e) => handleTestCaseChange('hidden', idx, 'displayInput', e.target.value)}
                          className="w-full text-xs rounded border border-base bg-primary px-3 py-2 text-secondary placeholder-muted outline-none focus:border-light"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted font-mono block">Raw Input</span>
                        <input
                          placeholder="xyz"
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange('hidden', idx, 'input', e.target.value)}
                          className="w-full text-xs rounded border border-base bg-primary px-3 py-2 text-secondary placeholder-muted outline-none focus:border-light"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted font-mono block">Output</span>
                      <input
                        placeholder="3"
                        value={tc.output}
                        onChange={(e) => handleTestCaseChange('hidden', idx, 'output', e.target.value)}
                        className="w-full text-xs rounded border border-base bg-primary px-3 py-2 text-secondary placeholder-muted outline-none focus:border-light"
                      />
                    </div>
                    {form.hiddenTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase('hidden', idx)}
                        className="inline-flex items-center gap-1 text-xs text-rose-500/80 hover:text-rose-400 transition-colors pt-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="border border-base bg-card rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-base/50">
                <Sliders className="h-4 w-4 text-muted" />
                <h2 className="text-sm font-medium text-primary">Settings</h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Difficulty</label>
                <select
                  name="difficulty"
                  value={form.difficulty}
                  onChange={handleChange}
                  className="w-full text-sm rounded-lg border border-base bg-input px-3.5 py-2 text-primary outline-none focus:border-light cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Tags</label>
                <input
                  value={form.tags.join(', ')}
                  onChange={handleTags}
                  className="w-full text-sm rounded-lg border border-base bg-input px-3.5 py-2 text-secondary placeholder-muted outline-none focus:border-light transition-colors"
                  placeholder="e.g., arrays, hash-map"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Constraints</label>
                <textarea
                  name="constraints"
                  value={form.constraints}
                  onChange={handleChange}
                  rows="2"
                  className="w-full text-sm rounded-lg border border-base bg-input px-3.5 py-2 text-secondary placeholder-muted outline-none focus:border-light transition-colors resize-none"
                  placeholder="e.g., 1 <= nums.length <= 10^5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Time Limit (ms)</label>
                  <input
                    type="number"
                    name="timeLimit"
                    value={form.timeLimit}
                    onChange={handleChange}
                    className="w-full text-sm rounded-lg border border-base bg-input px-3 py-2 text-primary outline-none focus:border-light"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">Memory (MB)</label>
                  <input
                    type="number"
                    name="memoryLimit"
                    value={form.memoryLimit}
                    onChange={handleChange}
                    className="w-full text-sm rounded-lg border border-base bg-input px-3 py-2 text-primary outline-none focus:border-light"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent/90 text-primary text-sm font-medium rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-accent/10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}