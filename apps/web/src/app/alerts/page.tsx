'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface AlertItem {
  id: number;
  type: string;
  innId: number | null;
  message: string;
  severity: string;
  isResolved: boolean;
  createdAt: string;
  inn?: { name: string } | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const query = filter === 'open' ? '?resolved=false' : filter === 'resolved' ? '?resolved=true' : '';
      const data = await apiFetch(`/api/alerts${query}`);
      setAlerts(data);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAlert(id: number) {
    await apiFetch(`/api/alerts/${id}/resolve`, { method: 'PUT' });
    loadAlerts();
  }

  async function deleteAlert(id: number) {
    if (!confirm('确定删除此告警？')) return;
    await apiFetch(`/api/alerts/${id}`, { method: 'DELETE' });
    loadAlerts();
  }

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">告警管理</h1>
          <p className="text-slate-500 text-sm mt-1">查看和处理系统告警</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'open', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? '全部' : f === 'open' ? '未处理' : '已处理'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className={`card flex items-start gap-4 ${alert.isResolved ? 'opacity-60' : ''}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              alert.severity === 'high' ? 'bg-red-100' :
              alert.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              {alert.severity === 'high' ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : alert.severity === 'medium' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{alert.type}</span>
                {alert.inn && <span className="text-xs text-slate-500">· {alert.inn.name}</span>}
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {alert.severity === 'high' ? '高' : alert.severity === 'medium' ? '中' : '低'}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
              <p className="text-xs text-slate-400 mt-2">
                {new Date(alert.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!alert.isResolved && (
                <button onClick={() => resolveAlert(alert.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
                  <CheckCircle className="w-3 h-3" />
                  处理
                </button>
              )}
              <button onClick={() => deleteAlert(alert.id)} className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                删除
              </button>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-slate-400">暂无告警</p>
          </div>
        )}
      </div>
    </div>
  );
}
