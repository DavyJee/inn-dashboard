'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CompareData {
  date: string;
  data: {
    innId: number;
    name: string;
    platform: string;
    location: string;
    totalRooms: number;
    availableRooms: number | null;
    bookedRooms: number | null;
    occupancyRate: number | null;
    lowestPrice: number | null;
  }[];
}

export default function ComparePage() {
  const [data, setData] = useState<CompareData | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [date]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/compare?date=${date}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const chartData = data?.data.map(d => ({
    name: d.name,
    预订率: d.occupancyRate ?? 0,
    最低价: d.lowestPrice ?? 0,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">竞品对比</h1>
          <p className="text-slate-500 text-sm mt-1">对比各民宿预订率与价格</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">预订率对比</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(v: number) => [`${v}%`, '预订率']} />
                <Bar dataKey="预订率" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">价格对比</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(v: number) => [`¥${v}`, '最低价']} />
                <Bar dataKey="最低价" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">对比明细</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-slate-500 font-medium">民宿</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">平台</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">位置</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">总房</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">剩余</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">已订</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">预订率</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">最低价</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map(row => (
                <tr key={row.innId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2 font-medium">{row.name}</td>
                  <td className="py-3 px-2">{row.platform}</td>
                  <td className="py-3 px-2 text-center">{row.location}</td>
                  <td className="py-3 px-2 text-center">{row.totalRooms}</td>
                  <td className="py-3 px-2 text-center">{row.availableRooms ?? '-'}</td>
                  <td className="py-3 px-2 text-center">{row.bookedRooms ?? '-'}</td>
                  <td className="py-3 px-2 text-center">
                    {row.occupancyRate !== null ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.occupancyRate >= 80 ? 'bg-red-100 text-red-700' :
                        row.occupancyRate >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {row.occupancyRate.toFixed(0)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-2 text-center">{row.lowestPrice !== null ? `¥${row.lowestPrice.toFixed(0)}` : '-'}</td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
