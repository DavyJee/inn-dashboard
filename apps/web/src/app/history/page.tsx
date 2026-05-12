'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ReportData {
  period: string;
  label: string;
  start: string;
  end: string;
  innStats: {
    innId: number;
    name: string;
    platform: string;
    avgOccupancy: number;
    avgPrice: number;
    recordCount: number;
  }[];
  dailyTrend: { date: string; occupancyRate: number }[];
}

export default function HistoryPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reports/${period}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">历史回顾</h1>
          <p className="text-slate-500 text-sm mt-1">{data?.label}经营数据汇总</p>
        </div>
        <div className="flex gap-2">
          {(['weekly', 'monthly', 'yearly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                period === p
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p === 'weekly' ? '周报' : p === 'monthly' ? '月报' : '年报'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">每日预订率趋势</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.dailyTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(v: number) => [`${v}%`, '预订率']} />
              <Area type="monotone" dataKey="occupancyRate" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">各民宿平均表现</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-slate-500 font-medium">民宿</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">平台</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">平均预订率</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">平均价格</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">数据点数</th>
              </tr>
            </thead>
            <tbody>
              {(data?.innStats ?? []).map(row => (
                <tr key={row.innId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2 font-medium">{row.name}</td>
                  <td className="py-3 px-2">{row.platform}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.avgOccupancy >= 80 ? 'bg-red-100 text-red-700' :
                      row.avgOccupancy >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {row.avgOccupancy}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">¥{row.avgPrice}</td>
                  <td className="py-3 px-2 text-center">{row.recordCount}</td>
                </tr>
              ))}
              {(data?.innStats ?? []).length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">暂无历史数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">平均预订率对比</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.innStats ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(v: number) => [`${v}%`, '平均预订率']} />
                <Bar dataKey="avgOccupancy" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">平均价格对比</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.innStats ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(v: number) => [`¥${v}`, '平均价格']} />
                <Bar dataKey="avgPrice" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
