import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import Home from './pages/Home';
import { useAuthStore } from './store/useAuthStore';
import { useScrapbookStore } from './store/useScrapbookStore';
import PWAPrompt from './components/PWAPrompt';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import { rescueLocalCatsToPublic } from './lib/launchRescuePublicCats';

const Create = lazy(() => import('./pages/Create'));
const Catdex = lazy(() => import('./pages/Catdex'));
const Detail = lazy(() => import('./pages/Detail'));
const Map = lazy(() => import('./pages/Map'));
const ShareCatdex = lazy(() => import('./pages/ShareCatdex'));
const SingleCatShare = lazy(() => import('./pages/SingleCatShare'));
const SharedCatMap = lazy(() => import('./pages/SharedCatMap'));
const LocalRescue = lazy(() => import('./pages/LocalRescue'));

const APP_HEIGHT_CSS_VAR = '--found-cat-app-height';

function syncAppViewportHeight() {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty(APP_HEIGHT_CSS_VAR, `${viewportHeight}px`);
}

function RouteFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#fff7e8] text-[#221915]">
      <div className="rounded-full border-2 border-[#221915] bg-[#fffdf2] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] shadow-[4px_4px_0_rgba(47,95,179,0.18)]">
        FOUND CAT
      </div>
    </div>
  );
}

function buildLaunchRescueSignature(items: ReturnType<typeof useScrapbookStore.getState>['items']) {
  return items
    .map((item) => [
      item.id,
      item.imageData.trim().length > 0 ? 'photo' : 'no-photo',
      item.date,
      item.location ? item.location.lat.toFixed(6) : 'no-lat',
      item.location ? item.location.lng.toFixed(6) : 'no-lng',
    ].join(':'))
    .join('|');
}

function App() {
  const loadItems = useScrapbookStore((state) => state.loadItems);
  const items = useScrapbookStore((state) => state.items);
  const isLocalDataLoading = useScrapbookStore((state) => state.isLoading);
  const initAuth = useAuthStore((state) => state.initAuth);
  const launchRescueSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isLocalDataLoading || items.length === 0) return;

    const rescueSignature = buildLaunchRescueSignature(items);
    if (launchRescueSignatureRef.current === rescueSignature) return;
    launchRescueSignatureRef.current = rescueSignature;

    void rescueLocalCatsToPublic(items).then((result) => {
      if (!result.ok) {
        console.warn('Launch rescue public upload failed', result);
      }
    });
  }, [isLocalDataLoading, items]);

  useEffect(() => {
    syncAppViewportHeight();

    const viewport = window.visualViewport;
    const handleViewportResize = () => syncAppViewportHeight();

    window.addEventListener('resize', handleViewportResize);
    window.addEventListener('orientationchange', handleViewportResize);
    viewport?.addEventListener('resize', handleViewportResize);
    viewport?.addEventListener('scroll', handleViewportResize);

    return () => {
      window.removeEventListener('resize', handleViewportResize);
      window.removeEventListener('orientationchange', handleViewportResize);
      viewport?.removeEventListener('resize', handleViewportResize);
      viewport?.removeEventListener('scroll', handleViewportResize);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="h-[var(--found-cat-app-height,100dvh)] overflow-hidden bg-cat-surface text-cat-text-main font-sans selection:bg-cat-sand flex justify-center items-center">
        <div
          data-testid="app-frame"
          className="w-full h-full max-w-md relative sm:h-[850px] sm:max-h-[95dvh] sm:rounded-3xl sm:border-8 sm:border-cat-border-dark sm:shadow-2xl overflow-hidden bg-cat-bg shadow-cat-depth-3 flex flex-col"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(255,200,150,0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255,180,200,0.3) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(255,220,180,0.2) 0%, transparent 70%), #f5f4ed'
            }}
            aria-hidden="true"
          />
          
          <div className="relative flex-1 h-full w-full">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<Create />} />
                <Route path="/detail/:id" element={<Detail />} />
                <Route path="/map" element={<Map />} />
                <Route path="/catdex" element={<Catdex />} />
                <Route path="/share" element={<ShareCatdex />} />
                <Route path="/rescue" element={<LocalRescue />} />
                <Route path="/local-rescue.html" element={<LocalRescue />} />
                <Route path="/s/c" element={<SingleCatShare />} />
                <Route path="/s/map" element={<SharedCatMap />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <PWAPrompt />
            <PWAUpdatePrompt />
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
