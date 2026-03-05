'use client';

import { useRef, useSyncExternalStore } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // Assume online on server
}

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function OfflineIndicator() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const wasOfflineRef = useRef(false);
  const reconnectedAtRef = useRef<number | null>(null);

  // Track if we were offline
  if (!isOnline) {
    wasOfflineRef.current = true;
  } else if (wasOfflineRef.current && reconnectedAtRef.current === null) {
    reconnectedAtRef.current = Date.now();
    wasOfflineRef.current = false;
  }

  // Check if we should show reconnected message (for 3 seconds)
  const showReconnected = reconnectedAtRef.current !== null && Date.now() - reconnectedAtRef.current < 3000;
  
  // Clear reconnected after 3 seconds
  if (reconnectedAtRef.current && Date.now() - reconnectedAtRef.current >= 3000) {
    reconnectedAtRef.current = null;
  }

  // Don't show anything if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <div className="fixed bottom-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 animate-in slide-in-from-bottom-2">
        <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4" />
          <span>أنت غير متصل بالإنترنت - البيانات المحفوظة</span>
        </div>
      </div>
    );
  }

  // Show reconnected message
  if (showReconnected) {
    return (
      <div className="fixed bottom-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 animate-in slide-in-from-bottom-2">
        <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <Wifi className="w-4 h-4" />
          <span>تم استعادة الاتصال</span>
        </div>
      </div>
    );
  }

  return null;
}
