'use client';

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-700 font-medium">Redirecting...</p>
      </div>
    </div>
  );
}
