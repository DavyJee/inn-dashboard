'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils';
import { Plus, ExternalLink, Edit2, Trash2 } from 'lucide-react';

interface Inn {
  id: number;
  name: string;
  platform: string;
  platformId: string;
  url: string;
  totalRooms: number;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export default function InnsPage() {
  const [inns, setInns] = useState<Inn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', platform: 'booking', platformId: '', url: '', totalRooms: '', location: '' });

  useEffect(() => {
    loadInns();
  }, []);

  async function loadInns() {
    setLoading(true);
    try {
      const data = await apiFetch('/api/inns');
      setInns(data);
    } catch {
      setInns([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert('静态演示模式：添加功能需要连接后端服务');
    setShowForm(false);
  }

  async function deleteInn(id: number) {
    if (!confirm('确定删除此民宿？')) return;
    alert('静态演示模式：删除功能需要连接后端服务');
  }

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">民宿管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理监控的民宿样本集</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          <Plus className="w-4 h-4" />
          添加民宿
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">添加民宿</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">民宿名称</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">平台</label>
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="booking">Booking.com</option>
                <option value="ctrip">携程</option>
                <option value="tujia">途家</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">平台ID</label>
              <input value={form.platformId} onChange={e => setForm({ ...form, platformId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">预订链接</label>
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">总房间数</label>
              <input type="number" value={form.totalRooms} onChange={e => setForm({ ...form, totalRooms: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">位置</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">保存</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm">取消</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inns.map(inn => (
          <div key={inn.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{inn.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{inn.location}</p>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                inn.platform === 'booking' ? 'bg-blue-100 text-blue-700' :
                inn.platform === 'ctrip' ? 'bg-sky-100 text-sky-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {inn.platform === 'booking' ? 'Booking' : inn.platform === 'ctrip' ? '携程' : '途家'}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
              <span>总房间: <b>{inn.totalRooms}</b></span>
              <span>状态: <b className={inn.isActive ? 'text-emerald-600' : 'text-slate-400'}>{inn.isActive ? '监控中' : '已暂停'}</b></span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <a href={inn.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                <ExternalLink className="w-3 h-3" />
                查看
              </a>
              <a href={`./inns/detail?id=${inn.id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200">
                <Edit2 className="w-3 h-3" />
                详情
              </a>
              <button onClick={() => deleteInn(inn.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                <Trash2 className="w-3 h-3" />
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {inns.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-slate-400">暂无民宿，点击右上角添加</p>
        </div>
      )}
    </div>
  );
}
