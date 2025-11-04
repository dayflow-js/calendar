'use client';

import React, { useEffect, useState } from 'react';
import { InteractiveCalendar } from './InteractiveCalendar';

export function ClientOnlyCalendar() {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      setMounted(true);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  if (error) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center border border-red-500 rounded-lg bg-red-50">
        <div className="text-center p-4">
          <p className="text-red-700 font-bold mb-2">Error loading calendar:</p>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-gray-500">Loading calendar...</p>
      </div>
    );
  }

  return <InteractiveCalendar />;
}

export default ClientOnlyCalendar;
