'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils';
import { Play, RefreshCw, Trash2 } from 'lucide-react';

interface CaptureLog {
  id: number;
  platform: string;
  status: string;
  recordCount: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export default function SettingsPage() {
  const [logs, setLogs] = useState<CaptureLog[]>([]);
  const [crawling, setCrawling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await apiFetch('/api/crawler/logs?limit=20');
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  async function triggerCrawl() {
    alert('静态演示模式：手动抓取功能需要连接后端服务');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-slate-500 text-sm mt-1">爬虫控制与系统信息</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">爬虫控制</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-700">定时抓取</p>
                <p className="text-xs text-slate-500 mt-0.5">每30分钟自动执行（06:00-23:00）</p>
              </div>
              <span className="inline-flex px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">运行中</span>
            </div>
            <button
              onClick={triggerCrawl}
              disabled={crawling}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              {crawling ? '抓取中...' : '立即手动抓取'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">系统信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">版本</span>
              <span className="font-medium">v0.1.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">数据库</span>
              <span className="font-medium">SQLite</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">抓取频率</span>
              <span className="font-medium">每30分钟</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">支持平台</span>
              <span className="font-medium">Booking / 携程 / 途家</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">抓取日志</h2>
          <button onClick={loadLogs} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
            <RefreshCw className="w-3 h-3" />
            刷新
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 text-slate-500 font-medium">平台</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">状态</th>
                <th className="text-center py-2 px-2 text-slate-500 font-medium">记录数</th>
                <th className="text-left py-2 px-2 text-slate-500 font-medium">时间</th>
                <th className="text-left py-2 px-2 text-slate-500 font-medium">错误</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-2">{log.platform}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status === 'success' ? '成功' : '失败'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">{log.recordCount}</td>
                  <td className="py-2 px-2 text-slate-500">{new Date(log.startedAt).toLocaleString('zh-CN')}</td>
                  <td className="py-2 px-2 text-red-500 text-xs max-w-xs truncate">{log.errorMessage || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">暂无日志</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
