import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = { planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed', archived: 'Archived' };
const PRIORITY_MAP = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium', color: '#6366f1', start_date: '', due_date: '' });

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.search) params.search = filter.search;
      const { data } = await projectsAPI.list(params);
      setProjects(data.projects);
    } catch { toast.error('Failed to load projects'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await projectsAPI.create(form);
      toast.success('Project created');
      setShowModal(false);
      setForm({ name: '', description: '', priority: 'medium', color: '#6366f1', start_date: '', due_date: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create project'); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This will remove all tasks and data.`)) return;
    try {
      await projectsAPI.delete(id);
      toast.success('Project deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New project</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text" placeholder="Search projects..." className="search-input"
          value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
        />
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Project Grid */}
      <div className="project-grid">
        {projects.length === 0 && (
          <div className="empty-state">
            <p>No projects yet. Create your first project to get started.</p>
          </div>
        )}
        {projects.map(proj => {
          const progress = proj.task_count > 0 ? Math.round((proj.completed_tasks / proj.task_count) * 100) : 0;
          return (
            <div key={proj.id} className="project-card" onClick={() => navigate(`/projects/${proj.id}`)}>
              <div className="project-card-header">
                <div className="project-color" style={{ background: proj.color }} />
                <div className="project-card-actions">
                  <button className="btn-icon sm" title="Board view" onClick={e => { e.stopPropagation(); navigate(`/projects/${proj.id}/board`); }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                  </button>
                  <button className="btn-icon sm danger" title="Delete" onClick={e => { e.stopPropagation(); handleDelete(proj.id, proj.name); }}>×</button>
                </div>
              </div>
              <h3>{proj.name}</h3>
              <p className="project-desc">{proj.description || 'No description'}</p>
              <div className="project-meta">
                <span className={`status-badge ${proj.status}`}>{STATUS_MAP[proj.status]}</span>
                <span className={`priority-badge ${proj.priority}`}>{PRIORITY_MAP[proj.priority]}</span>
              </div>
              <div className="progress-section">
                <div className="progress-header">
                  <span>{proj.completed_tasks}/{proj.task_count} tasks</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%`, background: proj.color }} /></div>
              </div>
              <div className="project-footer">
                <span>{proj.member_count} member{proj.member_count !== 1 ? 's' : ''}</span>
                {proj.due_date && <span>Due {new Date(proj.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New project</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <div className="color-picker">
                      {COLORS.map(c => (
                        <button key={c} type="button" className={`color-dot ${form.color === c ? 'active' : ''}`}
                          style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Start date</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div className="form-group"><label>Due date</label><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
