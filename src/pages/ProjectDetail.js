import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = { planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed', archived: 'Archived' };
const PRIORITY_MAP = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical', urgent: 'Urgent' };
const TASK_STATUS = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [taskFilter, setTaskFilter] = useState({ status: '', priority: '' });

  const load = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        projectsAPI.get(id),
        tasksAPI.list({ project_id: id, ...taskFilter }),
      ]);
      setProject(projRes.data.project);
      setTasks(taskRes.data.tasks);
    } catch { toast.error('Failed to load project'); navigate('/projects'); }
    setLoading(false);
  }, [id, taskFilter, navigate]);

  useEffect(() => { load(); }, [load]);

  async function addMember(e) {
    e.preventDefault();
    try {
      await projectsAPI.addMember(id, { email: memberEmail, role: 'editor' });
      toast.success('Member added');
      setMemberEmail('');
      setShowAddMember(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add member'); }
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsAPI.removeMember(id, userId);
      toast.success('Member removed');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function updateStatus(newStatus) {
    try {
      await projectsAPI.update(id, { status: newStatus });
      toast.success('Status updated');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!project) return null;

  const progress = project.task_count > 0 ? Math.round((project.completed_tasks / project.task_count) * 100) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <span onClick={() => navigate('/projects')} className="breadcrumb-link">Projects</span>
            <span className="breadcrumb-sep">/</span>
            <span>{project.name}</span>
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="project-color lg" style={{ background: project.color }} />
            {project.name}
          </h1>
          <p className="subtitle">{project.description || 'No description'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select className="btn btn-ghost" value={project.status} onChange={e => updateStatus(e.target.value)}>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => navigate(`/projects/${id}/board`)}>Board view</button>
        </div>
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="progress-header"><span>{project.completed_tasks} of {project.task_count} tasks complete</span><span>{progress}%</span></div>
        <div className="progress-bar lg"><div className="progress-fill" style={{ width: `${progress}%`, background: project.color }} /></div>
        <div className="project-dates">
          {project.start_date && <span>Started {new Date(project.start_date).toLocaleDateString()}</span>}
          {project.due_date && <span>Due {new Date(project.due_date).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="detail-grid">
        {/* Tasks */}
        <div className="card">
          <div className="card-header">
            <h3>Tasks ({tasks.length})</h3>
            <div className="filter-bar compact">
              <select value={taskFilter.status} onChange={e => setTaskFilter({ ...taskFilter, status: e.target.value })}>
                <option value="">All statuses</option>
                {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={taskFilter.priority} onChange={e => setTaskFilter({ ...taskFilter, priority: e.target.value })}>
                <option value="">All priorities</option>
                {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="task-list">
            {tasks.length === 0 && <p className="empty-msg">No tasks yet. Go to Board view to create tasks.</p>}
            {tasks.map(task => (
              <div key={task.id} className="task-row">
                <span className={`priority-dot ${task.priority}`} />
                <div className="task-row-body">
                  <span className="task-title">{task.title}</span>
                  <div className="task-row-meta">
                    <span className={`status-chip ${task.status}`}>{TASK_STATUS[task.status]}</span>
                    {task.assignee_first_name && <span className="assignee-chip">{task.assignee_first_name} {task.assignee_last_name?.[0]}.</span>}
                    {task.due_date && <span className="due-chip">{new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
                    {task.labels?.map(l => <span key={l.id} className="label-chip" style={{ background: l.color + '22', color: l.color }}>{l.name}</span>)}
                  </div>
                </div>
                {task.comment_count > 0 && <span className="comment-count">{task.comment_count} 💬</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Members + Labels */}
        <div className="sidebar-panel">
          <div className="card">
            <div className="card-header">
              <h3>Members ({project.members?.length || 0})</h3>
              <button className="btn btn-ghost sm" onClick={() => setShowAddMember(true)}>+ Add</button>
            </div>
            {showAddMember && (
              <form onSubmit={addMember} className="inline-form">
                <input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="Email address" required />
                <button type="submit" className="btn btn-primary sm">Add</button>
              </form>
            )}
            <div className="member-list">
              {(project.members || []).map(m => (
                <div key={m.id} className="member-item">
                  <div className="avatar xs">{(m.first_name?.[0] || '') + (m.last_name?.[0] || '')}</div>
                  <div className="member-info">
                    <span>{m.first_name} {m.last_name}</span>
                    <span className="member-role">{m.role}</span>
                  </div>
                  {m.role !== 'owner' && (
                    <button className="btn-icon xs danger" onClick={() => removeMember(m.id)}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Labels</h3>
            <div className="label-list">
              {(project.labels || []).length === 0 && <p className="empty-msg">No labels</p>}
              {(project.labels || []).map(l => (
                <span key={l.id} className="label-chip" style={{ background: l.color + '22', color: l.color }}>{l.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
