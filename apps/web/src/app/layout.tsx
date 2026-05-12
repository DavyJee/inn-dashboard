import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '区域民宿经营数据看板',
  description: '动态监控周边民宿预订率与经营数据',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-800">民宿看板</span>
                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">Beta</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <a href="/" className="text-slate-600 hover:text-primary-600">仪表盘</a>
                <a href="/inns" className="text-slate-600 hover:text-primary-600">民宿</a>
                <a href="/compare" className="text-slate-600 hover:text-primary-600">竞品</a>
                <a href="/history" className="text-slate-600 hover:text-primary-600">历史</a>
                <a href="/alerts" className="text-slate-600 hover:text-primary-600">告警</a>
                <a href="/settings" className="text-slate-600 hover:text-primary-600">设置</a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
