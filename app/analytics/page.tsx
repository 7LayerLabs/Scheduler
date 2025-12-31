'use client';

import { useCurrentUser } from '@/lib/instantdb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && !isLoading && !profile) {
    router.push('/');
    return null;
  }

  if (mounted && profile && profile.role !== 'manager') {
    router.push('/');
    return null;
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#e5a825] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6b6b75]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}
