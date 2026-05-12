'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Availability {
  id: number;
  date: string;
  availableRooms: number;
  totalRooms: number;
  bookedRooms: number;
  occupancyRate: number;
  lowestPrice: number | null;
}

interface Price {
  id: number;
  date: string;
  price: number;
  roomType: string | null;
}

interface Inn {
  id: number;
  name: string;
  platform: string;
  totalRooms: number;
  location: string;
}

function InnDetailContent() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get('id')) || 1;
  const [inn, setInn] = useState<Inn | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [innData, avData, priceData] = await Promise.all([
        apiFetch(`/api/inns/${id}`),
        apiFetch(`/api/inns/${id}/availability?days=30`),
        apiFetch(`/api/inns/${id}/prices?days=30`),
      ]);
      setInn(innData);
      setAvailabilities(avData);
      setPrices(priceData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>;
  if (!inn) return <div className="text-center py-20 text-slate-400">民宿不存在</div>;

  const chartData = availabilities.map(av => ({
    date: av.date.split('T')[0].slice(5),
    occupancyRate: av.occupancyRate,
    availableRooms: av.availableRooms,
    bookedRooms: av.bookedRooms,
    lowestPrice: av.lowestPrice,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{inn.name}</h1>
        <p className="text-slate-500 text-sm mt-1">{inn.location} · {inn.platform} · {inn.totalRooms}间房</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">未来30天预订率</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">未来30天价格走势</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(v: number) => [`¥${v}`, '最低价']} />
                <Area type="monotone" dataKey="lowestPrice" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">房态日历（未来30天）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 text-slate-500 font-medium">日期</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">总房</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">剩余</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">已订</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">预订率</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">最低价</th>
              </tr>
            </thead>
            <tbody>
              {availabilities.map(av => (
                <tr key={av.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-2">{av.date.split('T')[0]}</td>
                  <td className="py-2 px-2 text-center">{av.totalRooms}</td>
                  <td className="py-2 px-2 text-center">{av.availableRooms}</td>
                  <td className="py-2 px-2 text-center">{av.bookedRooms}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      av.occupancyRate >= 80 ? 'bg-red-100 text-red-700' :
                      av.occupancyRate >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {av.occupancyRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">{av.lowestPrice ? `¥${av.lowestPrice.toFixed(0)}` : '-'}</td>
                </tr>
              ))}
              {availabilities.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function InnDetailPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">加载中...</div>}>
      <InnDetailContent />
    </Suspense>
  );
}
