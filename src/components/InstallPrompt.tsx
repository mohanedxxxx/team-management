'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Share, Plus, Smartphone } from 'lucide-react';
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [userAccepted, setUserAccepted] = useState(false);
  const hasSetupRef = useRef(false);

  // Check installation status only on client
  const isInstalled = typeof window !== 'undefined' && 
    window.matchMedia('(display-mode: standalone)').matches;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (hasSetupRef.current || isInstalled) return;
    hasSetupRef.current = true;

    // Check if user dismissed install prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    
    if (dismissedTime && Date.now() - dismissedTime < threeDays) {
      return;
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show prompt after a delay
    if (isIOS && !dismissed) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setUserAccepted(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, isIOS]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setUserAccepted(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled || userAccepted || !showPrompt) return null;

  // iOS Instructions
  if (isIOS) {
    if (isMobile) {
      return (
        <Drawer open={showPrompt} onOpenChange={setShowPrompt}>
          <DrawerContent className="bg-slate-900 border-slate-700">
            <DrawerHeader className="text-center pb-4">
              <DrawerTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <Smartphone className="w-6 h-6 text-emerald-500" />
                تثبيت التطبيق
              </DrawerTitle>
              <DrawerDescription className="text-slate-400 mt-2">
                أضف التطبيق للشاشة الرئيسية للوصول السريع
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 pb-6 space-y-4">
              <div className="bg-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-500 font-bold">1</span>
                  </div>
                  <span>اضغط على زر المشاركة</span>
                  <Share className="w-5 h-5 text-emerald-500 mr-auto" />
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-500 font-bold">2</span>
                  </div>
                  <span>اختر &quot;إضافة إلى الشاشة الرئيسية&quot;</span>
                  <Plus className="w-5 h-5 text-emerald-500 mr-auto" />
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-500 font-bold">3</span>
                  </div>
                  <span>اضغط &quot;إضافة&quot; في الأعلى</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={handleDismiss}
              >
                لاحقاً
              </Button>
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
              <Smartphone className="w-6 h-6 text-emerald-500" />
              تثبيت التطبيق
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              أضف التطبيق للشاشة الرئيسية للوصول السريع
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-500 font-bold">1</span>
                </div>
                <span>اضغط على زر المشاركة</span>
                <Share className="w-5 h-5 text-emerald-500 mr-auto" />
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-500 font-bold">2</span>
                </div>
                <span>اختر &quot;إضافة إلى الشاشة الرئيسية&quot;</span>
                <Plus className="w-5 h-5 text-emerald-500 mr-auto" />
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-500 font-bold">3</span>
                </div>
                <span>اضغط &quot;إضافة&quot; في الأعلى</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={handleDismiss}
              >
                لاحقاً
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Android/Chrome Install
  if (isMobile) {
    return (
      <Drawer open={showPrompt} onOpenChange={setShowPrompt}>
        <DrawerContent className="bg-slate-900 border-slate-700">
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Download className="w-6 h-6 text-emerald-500" />
              تثبيت التطبيق
            </DrawerTitle>
            <DrawerDescription className="text-slate-400 mt-2">
              أضف التطبيق لشاشتك الرئيسية للوصول السريع
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6 space-y-3">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <img 
                  src="/icons/icon-192.png" 
                  alt="App Icon" 
                  className="w-16 h-16 rounded-xl"
                />
                <div>
                  <h3 className="font-bold text-white">منصة إدارة الفريق</h3>
                  <p className="text-sm text-slate-400">تطبيق إدارة الفرق والمهام</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={handleDismiss}
              >
                لاحقاً
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleInstallClick}
              >
                <Download className="w-4 h-4 ml-2" />
                تثبيت
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop
  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="w-6 h-6 text-emerald-500" />
            تثبيت التطبيق
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            ثبِّت التطبيق على جهازك للوصول السريع
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <img 
                src="/icons/icon-192.png" 
                alt="App Icon" 
                className="w-16 h-16 rounded-xl"
              />
              <div>
                <h3 className="font-bold text-white">منصة إدارة الفريق</h3>
                <p className="text-sm text-slate-400">تطبيق إدارة الفرق والمهام</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
              onClick={handleDismiss}
            >
              لاحقاً
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleInstallClick}
            >
              <Download className="w-4 h-4 ml-2" />
              تثبيت
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
