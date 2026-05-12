'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils';
import { TrendingUp, Home, Calendar, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';

interface DashboardSummary {
  totalInns: number;
  totalRooms: number;
  totalBooked: number;
  avgOccupancy: number;
  todayData: {
    innId: number;
    innName: string;
    platform: string;
    availableRooms: number;
    totalRooms: number;
    bookedRooms: number;
    occupancyRate: number;
    lowestPrice: number | null;
  }[];
  recentAlerts: any[];
}

interface TrendData {
  trend: { date: string; occupancyRate: number; totalBooked: number; totalRooms: number }[];
}

interface WeeklyDetailData {
  date: string;
  totalRooms: number;
  totalBooked: number;
  avgOccupancy: number;
  data: {
    innId: number;
    innName: string;
    platform: string;
    availableRooms: number;
    totalRooms: number;
    bookedRooms: number;
    occupancyRate: number;
    lowestPrice: number | null;
  }[];
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [weeklyDetail, setWeeklyDetail] = useState<WeeklyDetailData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Build this week's dates (Mon-Sun)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadSummaryAndTrend();
  }, []);

  useEffect(() => {
    loadWeeklyDetail(selectedDate);
  }, [selectedDate]);

  async function loadSummaryAndTrend() {
    try {
      const [sumRes, trendRes] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/dashboard/trend?days=14'),
      ]);
      setSummary(sumRes);
      setTrend(trendRes);
    } catch {
      setSummary(null);
      setTrend(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadWeeklyDetail(date: Date) {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await apiFetch(`/api/dashboard/weekly-detail?date=${dateStr}`);
      setWeeklyDetail(res);
    } catch {
      setWeeklyDetail(null);
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">区域民宿经营仪表盘</h1>
        <p className="text-slate-500 text-sm mt-1">实时监控周边民宿预订率与经营数据</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">监控民宿</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{summary?.totalInns ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">总房间数</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{summary?.totalRooms ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">今日已订</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{summary?.totalBooked ?? 0}</p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">平均预订率</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{summary?.avgOccupancy.toFixed(1) ?? 0}%</p>
            </div>
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">未来14天预订趋势</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => [`${value}%`, '预订率']}
                />
                <Area type="monotone" dataKey="occupancyRate" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">今日各民宿预订率</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.todayData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="innName" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => [`${value}%`, '预订率']}
                />
                <Bar dataKey="occupancyRate" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly Detail Table with Date Selector */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            本周房态明细
            <span className="ml-2 text-sm font-normal text-slate-500">
              {weeklyDetail ? `${weeklyDetail.date} | 已订 ${weeklyDetail.totalBooked} / ${weeklyDetail.totalRooms} 间 | 平均预订率 ${weeklyDetail.avgOccupancy}%` : ''}
            </span>
          </h2>
        </div>

        {/* Week Date Selector */}
        <div className="flex items-center gap-2 mb-4">
          {weekDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const dayLabel = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][date.getDay() === 0 ? 6 : date.getDay() - 1];
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex-1 py-2 px-1 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs opacity-80">{dayLabel}</div>
                <div className={`text-base ${isToday ? 'font-bold' : ''}`}>
                  {format(date, 'MM-dd')}
                  {isToday && <span className="ml-1 text-xs">今</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-slate-500 font-medium">民宿</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">平台</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">总房</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">剩余</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">已订</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">预订率</th>
                <th className="text-center py-3 px-2 text-slate-500 font-medium">最低价</th>
              </tr>
            </thead>
            <tbody>
              {(weeklyDetail?.data ?? []).map((row) => (
                <tr key={row.innId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2 font-medium text-slate-800">{row.innName}</td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      row.platform === 'booking' ? 'bg-blue-100 text-blue-700' :
                      row.platform === 'ctrip' ? 'bg-sky-100 text-sky-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {row.platform === 'booking' ? 'Booking' : row.platform === 'ctrip' ? '携程' : '途家'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center text-slate-600">{row.totalRooms}</td>
                  <td className="py-3 px-2 text-center text-slate-600">{row.availableRooms}</td>
                  <td className="py-3 px-2 text-center text-slate-600">{row.bookedRooms}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.occupancyRate >= 80 ? 'bg-red-100 text-red-700' :
                      row.occupancyRate >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {row.occupancyRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center text-slate-600">
                    {row.lowestPrice ? `¥${row.lowestPrice.toFixed(0)}` : '-'}
                  </td>
                </tr>
              ))}
              {(weeklyDetail?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    暂无数据，请先添加民宿并执行首次抓取
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Alerts */}
      {(summary?.recentAlerts?.length ?? 0) > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            最近告警
          </h2>
          <div className="space-y-2">
            {summary?.recentAlerts.map((alert: any) => (
              <div key={alert.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <span className={`w-2 h-2 rounded-full ${
                  alert.severity === 'high' ? 'bg-red-500' :
                  alert.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                <span className="text-sm text-slate-700">{alert.message}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {new Date(alert.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
