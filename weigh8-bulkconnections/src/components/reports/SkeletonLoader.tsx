'use client';

import { useState, useEffect, type ReactNode } from 'react';

interface SkeletonLoaderProps {
  children: ReactNode;
  className?: string;
}

export default function SkeletonLoader({ children, className = '' }: SkeletonLoaderProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!loaded) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-100 rounded-xl h-full min-h-[100px]" />
      </div>
    );
  }

  return <>{children}</>;
}
