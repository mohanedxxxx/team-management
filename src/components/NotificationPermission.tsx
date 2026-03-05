'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from 'sonner';

export function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isLoading, setIsLoading] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // Check if user dismissed notification prompt
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    // Show prompt if permission is default and not recently dismissed
    if (currentPermission === 'default' && (!dismissedTime || Date.now() - dismissedTime > sevenDays)) {
      // Show after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }
  }, []);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if push is supported
      if (!registration.pushManager) {
        console.warn('Push manager not available');
        return;
      }

      // Try to subscribe
      // Note: For production, you need VAPID keys
      // For now, we'll just save the permission state
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (response.ok) {
        console.log('Push subscription saved');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('المتصفح لا يدعم الإشعارات');
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('تم تفعيل الإشعارات بنجاح');
        
        // Subscribe to push notifications
        await subscribeToPush();
      } else if (result === 'denied') {
        toast.error('تم رفض الإشعارات. يمكنك تفعيلها من إعدادات المتصفح');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('حدث خطأ أثناء طلب الإذن');
    } finally {
      setIsLoading(false);
    }
    
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
  };

  const handleEnable = async () => {
    await requestPermission();
  };

  // Check support at render time
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (!isSupported || permission !== 'default' || !showPrompt) return null;

  const content = (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 text-slate-300">
          <Bell className="w-5 h-5 text-emerald-500" />
          <span>مهام جديدة مخصصة لك</span>
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          <Check className="w-5 h-5 text-emerald-500" />
          <span>تذكيرات المهام القادمة</span>
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          <Bell className="w-5 h-5 text-emerald-500" />
          <span>تحديثات الفريق</span>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={handleDismiss}
          disabled={isLoading}
        >
          لاحقاً
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleEnable}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جاري...
            </span>
          ) : (
            <>
              <Bell className="w-4 h-4 ml-2" />
              تفعيل
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={showPrompt} onOpenChange={setShowPrompt}>
        <DrawerContent className="bg-slate-900 border-slate-700">
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Bell className="w-6 h-6 text-emerald-500" />
              تفعيل الإشعارات
            </DrawerTitle>
            <DrawerDescription className="text-slate-400 mt-2">
              احصل على إشعارات للمهام الجديدة والتحديثات المهمة
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-500" />
            تفعيل الإشعارات
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            احصل على إشعارات للمهام الجديدة والتحديثات المهمة
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for sending notifications
export function useNotifications() {
  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        dir: 'rtl',
        lang: 'ar',
        ...options,
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            dir: 'rtl',
            lang: 'ar',
            ...options,
          });
        }
      });
    }
  };

  const getPermission = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied' as NotificationPermission;
    }
    return Notification.permission;
  };

  return { permission: getPermission(), sendNotification };
}

// Helper function for VAPID key conversion (if needed in future)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
