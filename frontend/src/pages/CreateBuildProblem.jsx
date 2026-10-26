import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import API from '../api/client';
import toast from 'react-hot-toast';
import {
  Boxes,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Server,
  Zap,
  Lock,
  Clock,
  Code2,
  Eye,
  FileCode
} from 'lucide-react';
import MethodBadge from '../components/build/MethodBadge';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const DEFAULT_STARTER_CODE = `const express = require('express');
const app = express();

app.use(express.json());

// In-memory data store
let items = [];

// TODO: Implement your REST API endpoints here

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server listening on 0.0.0.0:\${PORT}\`);
});
`;

export default function CreateBuildProblem() {
  const navigate = useNavigate();
  const { slug: editSlug } = useParams();
  const isEditing = Boolean(editSlug);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    difficulty: 'Medium',
    statement: `### Problem Description\nBuild a RESTful API using Node.js and Express listening on \`0.0.0.0:3000\`.\n\n#### Endpoints:\n1. \`GET /items\` - List all items (200 OK)\n2. \`POST /items\` - Create new item (201 Created)\n`,
    runtime: 'node-express',
    starterCode: DEFAULT_STARTER_CODE,
    startTimeoutMs: 3000,
    totalTimeoutMs: 20000,
  });

  const [visibleTests, setVisibleTests] = useState([
    {
      name: 'list items returns empty array',
      method: 'GET',
      path: '/items',
      body: '',
      expectStatus: 200,
      expectBodyContains: '',
      saveKey: '',
      saveField: '',
    },
  ]);

  const [hiddenTests, setHiddenTests] = useState([
    {
      name: 'returns 404 for unknown endpoint',
      method: 'GET',
      path: '/non-existent-route',
      body: '',
      expectStatus: 404,
      expectBodyContains: '',
      saveKey: '',
      saveField: '',
    },
  ]);

  // Load problem details if editing
  useEffect(() => {
    if (!isEditing) return;

    async function loadProblem() {
      try {
        setFetchLoading(true);
        const res = await API.get(`/build/admin/problems/${editSlug}`).catch(() => API.get(`/build/problems/${editSlug}`));
        const p = res.data?.problem;
        if (!p) throw new Error('Problem not found');

        const starter = p.starterFiles?.find((f) => f.path === 'server.js' || f.path === 'index.js');

        setForm({
          title: p.title || '',
          slug: p.slug || '',
          difficulty: p.difficulty || 'Medium',
          statement: p.statement || '',
          runtime: p.runtime || 'node-express',
          starterCode: starter ? starter.content : DEFAULT_STARTER_CODE,
          startTimeoutMs: p.limits?.startTimeoutMs || 3000,
          totalTimeoutMs: p.limits?.totalTimeoutMs || 20000,
        });

        if (Array.isArray(p.visibleTests) && p.visibleTests.length > 0) {
          setVisibleTests(
            p.visibleTests.map((t) => ({
              name: t.name || '',
              method: t.request?.method || 'GET',
              path: t.request?.path || '/',
              body: t.request?.body ? JSON.stringify(t.request.body, null, 2) : '',
              expectStatus: t.expect?.status || 200,
              expectBodyContains: t.expect?.bodyContains ? JSON.stringify(t.expect.bodyContains, null, 2) : '',
              saveKey: t.save ? Object.keys(t.save)[0] || '' : '',
              saveField: t.save ? Object.values(t.save)[0] || '' : '',
            }))
          );
        }

        if (Array.isArray(p.hiddenTests) && p.hiddenTests.length > 0) {
          setHiddenTests(
            p.hiddenTests.map((t) => ({
              name: t.name || '',
              method: t.request?.method || 'GET',
              path: t.request?.path || '/',
              body: t.request?.body ? JSON.stringify(t.request.body, null, 2) : '',
              expectStatus: t.expect?.status || 200,
              expectBodyContains: t.expect?.bodyContains ? JSON.stringify(t.expect.bodyContains, null, 2) : '',
              saveKey: t.save ? Object.keys(t.save)[0] || '' : '',
              saveField: t.save ? Object.values(t.save)[0] || '' : '',
            }))
          );
        }
      } catch (err) {
        toast.error('Failed to load challenge for editing');
        navigate('/admin');
      } finally {
        setFetchLoading(false);
      }
    }

    loadProblem();
  }, [editSlug, isEditing, navigate]);

  const handleTitleChange = (e) => {
    const title = e.target.value;
    if (!isEditing) {
      const autoSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setForm((prev) => ({ ...prev, title, slug: autoSlug }));
    } else {
      setForm((prev) => ({ ...prev, title }));
    }
  };

  const addTest = (type) => {
    const empty = {
      name: '',
      method: 'GET',
      path: '/',
      body: '',
      expectStatus: 200,
      expectBodyContains: '',
      saveKey: '',
      saveField: '',
    };
    if (type === 'visible') setVisibleTests((prev) => [...prev, empty]);
    else setHiddenTests((prev) => [...prev, empty]);
  };

  const removeTest = (type, index) => {
    if (type === 'visible') setVisibleTests((prev) => prev.filter((_, i) => i !== index));
    else setHiddenTests((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTest = (type, index, field, value) => {
    const updater = (prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    if (type === 'visible') setVisibleTests(updater);
    else setHiddenTests(updater);
  };

  const formatTestCasesForApi = (testsList, listName) => {
    return testsList.map((t, idx) => {
      if (!t.name.trim()) {
        throw new Error(`${listName} #${idx + 1}: Name is required.`);
      }
      if (!t.path.trim()) {
        throw new Error(`${listName} #${idx + 1}: Path is required.`);
      }

      let parsedBody = undefined;
      if (t.body && t.body.trim()) {
        try {
          parsedBody = JSON.parse(t.body.trim());
        } catch (e) {
          throw new Error(`${listName} #${idx + 1}: Request body must be valid JSON.`);
        }
      }

      let parsedBodyContains = undefined;
      if (t.expectBodyContains && t.expectBodyContains.trim()) {
        try {
          parsedBodyContains = JSON.parse(t.expectBodyContains.trim());
        } catch (e) {
          throw new Error(`${listName} #${idx + 1}: Expected body must be valid JSON.`);
        }
      }

      const item = {
        name: t.name.trim(),
        request: {
          method: t.method,
          path: t.path.trim().startsWith('/') ? t.path.trim() : `/${t.path.trim()}`,
          ...(parsedBody !== undefined ? { body: parsedBody } : {}),
        },
        expect: {
          status: parseInt(t.expectStatus, 10) || 200,
          ...(parsedBodyContains !== undefined ? { bodyContains: parsedBodyContains } : {}),
        },
      };

      if (t.saveKey && t.saveField) {
        item.save = { [t.saveKey.trim()]: t.saveField.trim() };
      }

      return item;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!form.slug.trim()) throw new Error('Slug is required.');
      if (!form.title.trim()) throw new Error('Title is required.');
      if (!form.statement.trim()) throw new Error('Statement is required.');

      const parsedVisible = formatTestCasesForApi(visibleTests, 'Visible Test');
      const parsedHidden = formatTestCasesForApi(hiddenTests, 'Hidden Test');

      const payload = {
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        difficulty: form.difficulty,
        statement: form.statement.trim(),
        runtime: form.runtime,
        starterFiles: [
          {
            path: 'server.js',
            content: form.starterCode,
          },
        ],
        visibleTests: parsedVisible,
        hiddenTests: parsedHidden,
        limits: {
          startTimeoutMs: parseInt(form.startTimeoutMs, 10) || 3000,
          totalTimeoutMs: parseInt(form.totalTimeoutMs, 10) || 20000,
        },
      };

      if (isEditing) {
        await API.put(`/build/problems/${editSlug}`, payload);
        toast.success(`Updated REST challenge: ${form.title}`);
      } else {
        await API.post('/build/problems', payload);
        toast.success(`Created REST challenge: ${form.title}`);
      }

      setTimeout(() => navigate('/admin'), 1000);
    } catch (err) {
      console.error('Failed to save build challenge:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save challenge.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-text-muted">
        <Loader2 className="w-6 h-6 animate-spin text-accent-build" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pt-1 pb-16 text-text select-text">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 select-none">
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin"
            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-text flex items-center gap-2">
              <Boxes className="h-4 w-4 text-accent-build" />
              {isEditing ? `Edit Project: ${form.title}` : 'Create New Project Challenge'}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Configure starter code files, problem instructions, and automated test cases.
            </p>
          </div>
        </div>

        <Link
          to="/build"
          className="text-xs text-text-muted hover:text-accent-build transition-colors hidden sm:block font-mono"
        >
          View Build Mode →
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2 select-none border-b border-border/30 pb-1.5">
            <Server className="w-3.5 h-3.5 text-accent-build" />
            <span>1. Project Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-medium text-text-muted">Challenge Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={handleTitleChange}
                placeholder="e.g. Products Inventory API"
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-3 py-2 text-text placeholder-text-muted outline-none focus:border-accent-build"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted">Difficulty *</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full text-xs rounded border border-border/40 bg-surface-raised px-3 py-2 text-text outline-none focus:border-accent-build cursor-pointer"
              >
                <option value="Easy">Easy (1-2 Endpoints)</option>
                <option value="Medium">Medium (Full CRUD State)</option>
                <option value="Hard">Hard (Complex Logic / Auth)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted">Slug (URL Identifier) *</label>
              <input
                type="text"
                required
                value={form.slug}
                disabled={isEditing}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().trim() })}
                placeholder="e.g. products-api"
                className="w-full text-xs font-mono rounded border border-border/40 bg-surface-raised/40 px-3 py-2 text-text placeholder-text-muted outline-none focus:border-accent-build disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted">Server Start Timeout (ms)</label>
              <input
                type="number"
                value={form.startTimeoutMs}
                onChange={(e) => setForm({ ...form, startTimeoutMs: e.target.value })}
                className="w-full text-xs font-mono rounded border border-border/40 bg-surface-raised/40 px-3 py-2 text-text outline-none focus:border-accent-build"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted">Total Run Timeout (ms)</label>
              <input
                type="number"
                value={form.totalTimeoutMs}
                onChange={(e) => setForm({ ...form, totalTimeoutMs: e.target.value })}
                className="w-full text-xs font-mono rounded border border-border/40 bg-surface-raised/40 px-3 py-2 text-text outline-none focus:border-accent-build"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Statement & Instructions */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2 select-none border-b border-border/30 pb-1.5">
            <Code2 className="w-3.5 h-3.5 text-accent-build" />
            <span>2. Problem Instructions & Requirements</span>
          </h2>
          <textarea
            required
            rows={8}
            value={form.statement}
            onChange={(e) => setForm({ ...form, statement: e.target.value })}
            placeholder="Write clear instructions, requirements, and sample requests in Markdown..."
            className="w-full text-xs font-mono rounded border border-border/40 bg-surface-raised/40 p-3 text-text placeholder-text-muted outline-none focus:border-accent-build leading-relaxed"
          />
        </div>

        {/* Section 3: Starter Code (server.js) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between select-none border-b border-border/30 pb-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-accent-build" />
              <span>3. Starter Template (server.js)</span>
            </h2>
            <button
              type="button"
              onClick={() => setForm({ ...form, starterCode: DEFAULT_STARTER_CODE })}
              className="text-[11px] text-text-muted hover:text-accent-build transition-colors"
            >
              Reset to boilerplate
            </button>
          </div>
          <textarea
            required
            rows={9}
            value={form.starterCode}
            onChange={(e) => setForm({ ...form, starterCode: e.target.value })}
            className="w-full text-xs font-mono rounded border border-border/40 bg-surface-raised/40 p-3 text-text outline-none focus:border-accent-build leading-relaxed"
          />
        </div>

        {/* Section 4: Visible Tests */}
        <div className="space-y-3">
          <div className="flex items-center justify-between select-none border-b border-border/30 pb-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-accent-build" />
              <span>4. Requirements Checklist (Visible Tests) ({visibleTests.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => addTest('visible')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-raised text-text font-medium text-xs rounded hover:bg-surface-raised/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Test Case</span>
            </button>
          </div>

          <div className="space-y-3">
            {visibleTests.map((t, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-border/40 bg-surface-raised/20 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-accent-build font-bold">
                    Test #{idx + 1}
                  </span>
                  {visibleTests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTest('visible', idx)}
                      className="text-text-muted hover:text-rose-400 p-1 rounded transition-colors"
                      title="Remove test"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Test Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. list items returns empty array"
                      value={t.name}
                      onChange={(e) => updateTest('visible', idx, 'name', e.target.value)}
                      className="w-full text-xs rounded border border-border/40 bg-surface px-2.5 py-1.5 text-text outline-none focus:border-accent-build"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Method</label>
                    <select
                      value={t.method}
                      onChange={(e) => updateTest('visible', idx, 'method', e.target.value)}
                      className="w-full text-xs font-mono font-bold rounded border border-border/40 bg-surface px-2.5 py-1.5 text-text outline-none focus:border-accent-build"
                    >
                      {HTTP_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Path *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. /items"
                      value={t.path}
                      onChange={(e) => updateTest('visible', idx, 'path', e.target.value)}
                      className="w-full text-xs font-mono rounded border border-border/40 bg-surface px-2.5 py-1.5 text-text outline-none focus:border-accent-build"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Request Body (JSON)</label>
                    <textarea
                      rows={3}
                      placeholder='{ "title": "Buy milk" }'
                      value={t.body}
                      onChange={(e) => updateTest('visible', idx, 'body', e.target.value)}
                      className="w-full text-xs font-mono rounded border border-border/40 bg-surface p-2 text-text outline-none focus:border-accent-build"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Expected Status</label>
                    <input
                      type="number"
                      value={t.expectStatus}
                      onChange={(e) => updateTest('visible', idx, 'expectStatus', e.target.value)}
                      className="w-full text-xs font-mono rounded border border-border/40 bg-surface px-2.5 py-1.5 text-text outline-none focus:border-accent-build"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Expected Body (JSON)</label>
                    <textarea
                      rows={3}
                      placeholder='{ "id": 1, "completed": false }'
                      value={t.expectBodyContains}
                      onChange={(e) => updateTest('visible', idx, 'expectBodyContains', e.target.value)}
                      className="w-full text-xs font-mono rounded border border-border/40 bg-surface p-2 text-emerald-400 outline-none focus:border-accent-build"
                    />
                  </div>
                </div>

                {/* Save variable option */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/20 text-[11px]">
                  <span className="text-text-muted font-medium">Save variable from response:</span>
                  <input
                    type="text"
                    placeholder="Variable name (e.g. itemId)"
                    value={t.saveKey}
                    onChange={(e) => updateTest('visible', idx, 'saveKey', e.target.value)}
                    className="w-36 text-xs font-mono rounded border border-border/40 bg-surface px-2 py-1 text-text outline-none focus:border-accent-build"
                  />
                  <span className="text-text-muted">= response field</span>
                  <input
                    type="text"
                    placeholder="Field name (e.g. id)"
                    value={t.saveField}
                    onChange={(e) => updateTest('visible', idx, 'saveField', e.target.value)}
                    className="w-36 text-xs font-mono rounded border border-border/40 bg-surface px-2 py-1 text-text outline-none focus:border-accent-build"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Hidden Tests */}
        <div className="space-y-3">
          <div className="flex items-center justify-between select-none border-b border-border/30 pb-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-accent-build" />
              <span>5. Additional Test Cases (Private) ({hiddenTests.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => addTest('hidden')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-raised text-text font-medium text-xs rounded hover:bg-surface-raised/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Additional Test</span>
            </button>
          </div>

          <div className="space-y-3">
            {hiddenTests.map((t, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-border/40 bg-surface-raised/20 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-amber-400 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Hidden Test #{idx + 1}
                  </span>
                  {hiddenTests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTest('hidden', idx)}
                      className="text-text-muted hover:text-rose-400 p-1 rounded transition-colors"
                      title="Remove test"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Test Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 400 validation on missing title"
                      value={t.name}
                      onChange={(e) => updateTest('hidden', idx, 'name', e.target.value)}
                      className="w-full text-xs rounded border border-border/40 bg-surface px-2.5 py-1.5 text-text outline-none focus:border-accent-build"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Method</label>
                    <select
                      value={t.method}
                      onChange={(e) => updateTest('hidden', idx, 'method', e.target.value)}
                      className="w-full text-xs font-mono font-bold rounded border border-border/40 bg-surface px-2.5 py-1.5 text-text outline-none focus:border-accent-build"
                    >
                      {HTTP_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Path *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. /items"
                      value={t.path}
                      onChange={(e) => updateTest('hidden', idx, 'path', e.target.value)}
                      className="w-full text-xs font-mono rounded border border-border/40 bg-surface px-2.5 py-1.5 text-text outline-none focus:border-accent-build"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Request Body (JSON)</label>
                    <textarea
                      rows={3}
                      placeholder='{ "invalidField": true }'
                      value={t.body}
                      onChange={(e) => updateTest('hidden', idx, 'body', e.target.value)}
                      className="w-full text-xs font-mono rounded border border-border/40 bg-surface p-2 text-text outline-none focus:border-accent-build"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Expected Status</label>
                    <input
                      type="number"
                      value={t.expectStatus}
                      onChange={(e) => updateTest('hidden', idx, 'expectStatus', e.target.value)}
                      className="w-full text-xs font-mono rounded border border-border/40 bg-surface px-2.5 py-1.5 text-text outline-none focus:border-accent-build"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Expected Body (JSON)</label>
                    <textarea
                      rows={3}
                      placeholder='{ "error": "Bad request" }'
                      value={t.expectBodyContains}
                      onChange={(e) => updateTest('hidden', idx, 'expectBodyContains', e.target.value)}
                      className="w-full text-xs font-mono rounded border border-border/40 bg-surface p-2 text-emerald-400 outline-none focus:border-accent-build"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="px-4 py-2 rounded text-xs text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded bg-accent-build text-black font-semibold text-xs hover:bg-accent-build-hover transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Boxes className="w-4 h-4" />}
            <span>{isEditing ? 'Save Project' : 'Create Project'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
