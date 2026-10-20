import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/client';
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle, LayoutGrid, Sliders, Terminal, ArrowLeft } from 'lucide-react';

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
    sheetName: '',
    topic: '',
    constraints: '',
    timeLimit: 1000,
    memoryLimit: 128,
    sampleTestCases: [{ input: '', output: '', explanation: '', displayInput: '' }],
    hiddenTestCases: [{ input: '', output: '', displayInput: '' }],
  });

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
          sheetName: p.sheetName || '',
          topic: p.topic || '',
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
      setTimeout(() => navigate('/admin'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update problem.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-xs">
        <Loader2 className="h-4 w-4 animate-spin text-text-muted mr-2" />
        Loading challenge data...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text transition-colors mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Admin
          </button>
          <h1 className="text-sm font-semibold tracking-tight text-text">
            Edit Problem
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Update problem description, constraints, and test cases.
          </p>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 text-xs text-success bg-success/10 p-2.5 rounded border border-success/30">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 p-2.5 rounded border border-danger/30">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-xs">
        {/* Left Column: Details & Cases */}
        <div className="lg:col-span-2 space-y-5">
          <div className="border border-border/40 bg-surface/40 rounded p-4 space-y-3.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text block flex items-center gap-1.5 pb-2 border-b border-border/30">
              <LayoutGrid className="h-3.5 w-3.5 text-accent" /> Problem Details
            </span>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-3 py-1.5 text-text placeholder-text-muted focus:outline-none focus:border-border"
                placeholder="e.g., Two Sum"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="6"
                required
                className="w-full text-xs font-sans rounded border border-border/40 bg-surface-raised/40 px-3 py-1.5 text-text placeholder-text-muted focus:outline-none focus:border-border resize-none leading-relaxed"
                placeholder="Describe problem objective, constraints, and requirements..."
              />
            </div>
          </div>

          {/* Test cases */}
          <div className="border border-border/40 bg-surface/40 rounded p-4 space-y-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text block flex items-center gap-1.5 pb-2 border-b border-border/30">
              <Terminal className="h-3.5 w-3.5 text-accent" /> Test Cases
            </span>

            {/* Sample Cases */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-text">Sample Test Cases (Visible)</span>
                <button
                  type="button"
                  onClick={() => addTestCase('sample')}
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add Case
                </button>
              </div>

              {form.sampleTestCases.map((tc, idx) => (
                <div key={idx} className="border border-border/30 bg-surface-raised/20 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                    <span>Sample #{idx + 1}</span>
                    {form.sampleTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase('sample', idx)}
                        className="text-danger hover:underline inline-flex items-center gap-0.5"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">Display Input (Optional)</span>
                      <input
                        placeholder="e.g., s = 'abc'"
                        value={tc.displayInput || ''}
                        onChange={(e) => handleTestCaseChange('sample', idx, 'displayInput', e.target.value)}
                        className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text placeholder-text-muted focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">Raw Input</span>
                      <input
                        placeholder="abc"
                        value={tc.input}
                        onChange={(e) => handleTestCaseChange('sample', idx, 'input', e.target.value)}
                        className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text placeholder-text-muted focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">Output</span>
                      <input
                        placeholder="3"
                        value={tc.output}
                        onChange={(e) => handleTestCaseChange('sample', idx, 'output', e.target.value)}
                        className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text placeholder-text-muted focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">Explanation (Optional)</span>
                      <input
                        placeholder="Explanation..."
                        value={tc.explanation || ''}
                        onChange={(e) => handleTestCaseChange('sample', idx, 'explanation', e.target.value)}
                        className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text placeholder-text-muted focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hidden Cases */}
            <div className="space-y-3 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-text">Hidden Evaluation Cases</span>
                <button
                  type="button"
                  onClick={() => addTestCase('hidden')}
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add Case
                </button>
              </div>

              {form.hiddenTestCases.map((tc, idx) => (
                <div key={idx} className="border border-border/30 bg-surface-raised/20 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                    <span>Hidden #{idx + 1}</span>
                    {form.hiddenTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTestCase('hidden', idx)}
                        className="text-danger hover:underline inline-flex items-center gap-0.5"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">Display Input (Optional)</span>
                      <input
                        placeholder="e.g., s = 'xyz'"
                        value={tc.displayInput || ''}
                        onChange={(e) => handleTestCaseChange('hidden', idx, 'displayInput', e.target.value)}
                        className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text placeholder-text-muted focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">Raw Input</span>
                      <input
                        placeholder="xyz"
                        value={tc.input}
                        onChange={(e) => handleTestCaseChange('hidden', idx, 'input', e.target.value)}
                        className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text placeholder-text-muted focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block mb-0.5">Output</span>
                    <input
                      placeholder="3"
                      value={tc.output}
                      onChange={(e) => handleTestCaseChange('hidden', idx, 'output', e.target.value)}
                      className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text placeholder-text-muted focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border border-border/40 bg-surface/40 rounded p-4 space-y-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text block flex items-center gap-1.5 pb-2 border-b border-border/30">
              <Sliders className="h-3.5 w-3.5 text-accent" /> Attributes & Limits
            </span>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Difficulty</label>
              <select
                name="difficulty"
                value={form.difficulty}
                onChange={handleChange}
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1.5 text-text focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Sheet Name (Optional)</label>
              <input
                name="sheetName"
                value={form.sheetName}
                onChange={handleChange}
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1.5 text-text placeholder-text-muted focus:outline-none"
                placeholder="e.g., striver"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Topic (Optional)</label>
              <input
                name="topic"
                value={form.topic}
                onChange={handleChange}
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1.5 text-text placeholder-text-muted focus:outline-none"
                placeholder="e.g., Arrays"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Tags (Comma-separated)</label>
              <input
                value={form.tags.join(', ')}
                onChange={handleTags}
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1.5 text-text placeholder-text-muted focus:outline-none"
                placeholder="e.g., arrays, hash-map"
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Constraints</label>
              <textarea
                name="constraints"
                value={form.constraints}
                onChange={handleChange}
                rows="2"
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1.5 text-text placeholder-text-muted focus:outline-none resize-none"
                placeholder="1 <= nums.length <= 10^5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-text-muted block mb-0.5">Time Limit (ms)</label>
                <input
                  type="number"
                  name="timeLimit"
                  value={form.timeLimit}
                  onChange={handleChange}
                  className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-0.5">Memory Limit (MB)</label>
                <input
                  type="number"
                  name="memoryLimit"
                  value={form.memoryLimit}
                  onChange={handleChange}
                  className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2 py-1 text-text focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-text text-bg hover:opacity-90 font-medium text-xs rounded transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}