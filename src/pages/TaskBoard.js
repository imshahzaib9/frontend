import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, dashboardAPI } from '../services/api';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: '#94a3b8' },
  { key: 'todo', label: 'To Do', color: '#60a5fa' },
  { key: 'in_progress', label: 'In Progress', color: '#fbbf24' },
  { key: 'in_review', label: 'In Review', color: '#a78bfa' },
  { key: 'done', label: 'Done', color: '#34d399' },
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function TaskBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(null); // column key
  const [showDetail, setShowDetail] = useState(null); // task object
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '' });
  const [newComment, setNewComment] = useState('');

  const load = useCallback(async () => {
    try {
      const [projRes, taskRes, userRes] = await Promise.all([
        projectsAPI.get(id),
        tasksAPI.list({ project_id: id, limit: 200 }),
        dashboardAPI.getUsers({ project_id: id }),
      ]);
      setProject(projRes.data.project);
      setTasks(taskRes.data.tasks);
      setUsers(userRes.data.users);
    } catch { toast.error('Failed to load board'); navigate('/projects'); }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  async function createTask(e, status) {
    e.preventDefault();
    try {
      await tasksAPI.create({ ...newTask, project_id: id, status });
      toast.success('Task created');
      setNewTask({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '' });
      setShowCreate(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function moveTask(taskId, newStatus) {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success('Task moved');
    } catch { toast.error('Failed to move task'); }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(taskId);
      toast.success('Task deleted');
      setShowDetail(null);
      load();
    } catch { toast.error('Failed'); }
  }

  async function openDetail(taskId) {
    try {
      const { data } = await tasksAPI.get(taskId);
      setShowDetail(data.task);
    } catch { toast.error('Failed to load task'); }
  }

  async function updateTask(taskId, updates) {
    try {
      const { data } = await tasksAPI.update(taskId, updates);
      setShowDetail(prev => ({ ...prev, ...data.task }));
      load();
      toast.success('Updated');
    } catch { toast.error('Failed to update'); }
  }

  async function addComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await tasksAPI.addComment(showDetail.id, { content: newComment });
      setNewComment('');
      openDetail(showDetail.id); // reload
      toast.success('Comment added');
    } catch { toast.error('Failed'); }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!project) return null;

  return (
    <div className="page board-page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <span onClick={() => navigate('/projects')} className="breadcrumb-link">Projects</span>
            <span className="breadcrumb-sep">/</span>
            <span onClick={() => navigate(`/projects/${id}`)} className="breadcrumb-link">{project.name}</span>
            <span className="breadcrumb-sep">/</span>
            <span>Board</span>
          </div>
          <h1>Board</h1>
        </div>
      </div>

      <div className="board">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className="board-column">
              <div className="column-header">
                <span className="column-dot" style={{ background: col.color }} />
                <span className="column-title">{col.label}</span>
                <span className="column-count">{colTasks.length}</span>
                <button className="btn-icon xs" onClick={() => setShowCreate(showCreate === col.key ? null : col.key)}>+</button>
              </div>

              {showCreate === col.key && (
                <form className="create-task-form" onSubmit={e => createTask(e, col.key)}>
                  <input type="text" placeholder="Task title..." value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })} autoFocus required />
                  <textarea rows={2} placeholder="Description (optional)" value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                  <div className="form-row compact">
                    <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={newTask.assignee_id} onChange={e => setNewTask({ ...newTask, assignee_id: e.target.value })}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                    </select>
                  </div>
                  <input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} />
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary sm">Add</button>
                    <button type="button" className="btn btn-ghost sm" onClick={() => setShowCreate(null)}>Cancel</button>
                  </div>
                </form>
              )}

              <div className="column-body">
                {colTasks.map(task => (
                  <div key={task.id} className="task-card" onClick={() => openDetail(task.id)}>
                    <div className="task-card-header">
                      <span className={`priority-badge sm ${task.priority}`}>{task.priority}</span>
                      {/* Move buttons */}
                      <div className="move-btns">
                        {col.key !== 'backlog' && (
                          <button className="btn-icon xs" title="Move left"
                            onClick={e => { e.stopPropagation(); moveTask(task.id, COLUMNS[COLUMNS.findIndex(c => c.key === col.key) - 1].key); }}>←</button>
                        )}
                        {col.key !== 'done' && (
                          <button className="btn-icon xs" title="Move right"
                            onClick={e => { e.stopPropagation(); moveTask(task.id, COLUMNS[COLUMNS.findIndex(c => c.key === col.key) + 1].key); }}>→</button>
                        )}
                      </div>
                    </div>
                    <h4 className="task-card-title">{task.title}</h4>
                    {task.labels?.length > 0 && (
                      <div className="task-card-labels">
                        {task.labels.map(l => <span key={l.id} className="label-chip sm" style={{ background: l.color + '22', color: l.color }}>{l.name}</span>)}
                      </div>
                    )}
                    <div className="task-card-footer">
                      {task.assignee_first_name && (
                        <div className="avatar xs" title={`${task.assignee_first_name} ${task.assignee_last_name}`}>
                          {task.assignee_first_name[0]}{task.assignee_last_name?.[0]}
                        </div>
                      )}
                      <div className="task-card-meta">
                        {task.due_date && <span className={`due-chip ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'overdue' : ''}`}>
                          {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>}
                        {task.comment_count > 0 && <span className="meta-count">💬 {task.comment_count}</span>}
                        {task.subtask_count > 0 && <span className="meta-count">☑ {task.completed_subtasks}/{task.subtask_count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Sidebar */}
      {showDetail && (
        <div className="task-detail-overlay" onClick={() => setShowDetail(null)}>
          <div className="task-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="task-detail-header">
              <h2>{showDetail.title}</h2>
              <button className="btn-close" onClick={() => setShowDetail(null)}>×</button>
            </div>

            <div className="task-detail-body">
              {/* Editable fields */}
              <div className="detail-field">
                <label>Status</label>
                <select value={showDetail.status} onChange={e => updateTask(showDetail.id, { status: e.target.value })}>
                  {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div className="detail-field">
                <label>Priority</label>
                <select value={showDetail.priority} onChange={e => updateTask(showDetail.id, { priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="detail-field">
                <label>Assignee</label>
                <select value={showDetail.assignee_id || ''} onChange={e => updateTask(showDetail.id, { assignee_id: e.target.value || null })}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                </select>
              </div>
              <div className="detail-field">
                <label>Due date</label>
                <input type="date" value={showDetail.due_date?.split('T')[0] || ''} onChange={e => updateTask(showDetail.id, { due_date: e.target.value || null })} />
              </div>
              <div className="detail-field">
                <label>Estimated hours</label>
                <input type="number" step="0.5" value={showDetail.estimated_hours || ''} onChange={e => updateTask(showDetail.id, { estimated_hours: e.target.value || null })} />
              </div>

              {showDetail.description && (
                <div className="detail-section">
                  <label>Description</label>
                  <p>{showDetail.description}</p>
                </div>
              )}

              {/* Subtasks */}
              {showDetail.subtasks?.length > 0 && (
                <div className="detail-section">
                  <label>Subtasks</label>
                  {showDetail.subtasks.map(st => (
                    <div key={st.id} className="subtask-item">
                      <span className={`status-dot ${st.status}`} />
                      <span>{st.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Comments */}
              <div className="detail-section">
                <label>Comments ({showDetail.comments?.length || 0})</label>
                <div className="comments-list">
                  {(showDetail.comments || []).map(c => (
                    <div key={c.id} className="comment-item">
                      <div className="avatar xs">{(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}</div>
                      <div className="comment-body">
                        <div className="comment-meta">
                          <strong>{c.first_name} {c.last_name}</strong>
                          <span>{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p>{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={addComment} className="comment-form">
                  <textarea rows={2} value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." />
                  <button type="submit" className="btn btn-primary sm" disabled={!newComment.trim()}>Send</button>
                </form>
              </div>

              <button className="btn btn-danger" style={{ marginTop: '24px' }} onClick={() => deleteTask(showDetail.id)}>
                Delete task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
