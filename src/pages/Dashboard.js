import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const STATUS_COLORS = { backlog: '#94a3b8', todo: '#60a5fa', in_progress: '#fbbf24', in_review: '#a78bfa', done: '#34d399' };
const PRIORITY_COLORS = { low: '#94a3b8', medium: '#60a5fa', high: '#f59e0b', urgent: '#ef4444', critical: '#ef4444' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await dashboardAPI.getStats();
        setStats(data);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const t = stats?.tasks || {};
  const m = stats?.my_tasks || {};
  const p = stats?.projects || {};

  const pieData = [
    { name: 'Backlog', value: Number(t.backlog) || 0, color: STATUS_COLORS.backlog },
    { name: 'To do', value: Number(t.todo) || 0, color: STATUS_COLORS.todo },
    { name: 'In progress', value: Number(t.in_progress) || 0, color: STATUS_COLORS.in_progress },
    { name: 'In review', value: Number(t.in_review) || 0, color: STATUS_COLORS.in_review },
    { name: 'Done', value: Number(t.completed) || 0, color: STATUS_COLORS.done },
  ].filter(d => d.value > 0);

  const productivityData = (stats?.productivity || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    completed: d.count,
  }));

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.first_name}</h1>
          <p className="subtitle">Here's what's happening across your projects</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg></div>
          <div className="stat-body"><span className="stat-number">{t.total_tasks || 0}</span><span className="stat-label">Total tasks</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg></div>
          <div className="stat-body"><span className="stat-number">{t.completed || 0}</span><span className="stat-label">Completed</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg></div>
          <div className="stat-body"><span className="stat-number">{m.overdue || 0}</span><span className="stat-label">Overdue</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg></div>
          <div className="stat-body"><span className="stat-number">{p.total_projects || 0}</span><span className="stat-label">Projects</span></div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Task Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="empty-msg">No task data yet</p>}
          <div className="legend">
            {pieData.map(d => (
              <span key={d.name} className="legend-item"><span className="legend-dot" style={{ background: d.color }} />{d.name} ({d.value})</span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>Completed tasks (14 days)</h3>
          {productivityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productivityData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="empty-msg">No completions in the last 14 days</p>}
        </div>
      </div>

      {/* Due Soon & Activity */}
      <div className="bottom-grid">
        <div className="card">
          <h3>Due soon</h3>
          <div className="task-list-compact">
            {(stats?.due_soon || []).length === 0 && <p className="empty-msg">Nothing due in the next 7 days</p>}
            {(stats?.due_soon || []).map(task => (
              <div key={task.id} className="task-item-compact" onClick={() => navigate(`/projects/${task.project_id || ''}/board`)}>
                <span className={`priority-dot ${task.priority}`} />
                <div className="task-item-body">
                  <span className="task-title">{task.title}</span>
                  <span className="task-meta">
                    <span className="project-badge" style={{ background: task.project_color + '22', color: task.project_color }}>{task.project_name}</span>
                    <span className="due-date">{new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Recent activity</h3>
          <div className="activity-list">
            {(stats?.activity || []).length === 0 && <p className="empty-msg">No recent activity</p>}
            {(stats?.activity || []).map(a => (
              <div key={a.id} className="activity-item">
                <div className="avatar xs">{(a.first_name?.[0] || '') + (a.last_name?.[0] || '')}</div>
                <div className="activity-body">
                  <p><strong>{a.first_name} {a.last_name}</strong> {a.action} a {a.entity_type}</p>
                  <span className="activity-time">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
