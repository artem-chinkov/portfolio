import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';

export const sectionIds = ['about', 'experience', 'services', 'projects', 'recommendations', 'contacts'] as const;
export type SectionId = typeof sectionIds[number];
const duration = 1.2;
const gestureCooldown = duration * 1000;
const validSection = (value: string): SectionId => sectionIds.includes(value as SectionId) ? value as SectionId : 'about';

export function useScreens(blocked: boolean, { desktopHeight = 1117, mobileHeight = 789 }: { desktopHeight?: number; mobileHeight?: number } = {}) {
  const [mobile, setMobile] = useState(false);
  const [section, setSection] = useState<SectionId>('about');
  const [transitioning, setTransitioning] = useState(false);
  const [intro, setIntro] = useState(true);
  const [showNeighbors, setShowNeighbors] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(1117);
  const [sceneScale, setSceneScale] = useState(1);
  const [ready, setReady] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const lockedUntil = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wheelGesture = useRef({ last: 0, delta: 0, total: 0, used: false });
  const screenIds = mobile ? sectionIds.slice(0, -1) : [...sectionIds];
  const active = mobile && section === 'contacts' ? 'recommendations' : section;
  const activeIndex = screenIds.indexOf(active);

  const navigate = useCallback((target: string, history: 'push' | 'none' = 'push', focus = true, instant = false) => {
    if (blocked) return;
    setIntro(false);
    setShowNeighbors(true);
    const id = validSection(target);
    const next = mobile && id === 'contacts' ? 'recommendations' : id;
    if (history === 'push' && location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
    setSection(id);
    const changesScreen = next !== active;
    if (changesScreen || instant) {
      clearTimeout(timer.current);
      const ms = instant ? 0 : duration * 1000;
      lockedUntil.current = performance.now() + (instant ? 0 : gestureCooldown);
      setTransitioning(ms > 0);
      if (ms) timer.current = setTimeout(() => setTransitioning(false), ms);
    }
    if (focus) requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(`#${id} h1, #${id} h2`);
      heading?.focus({ preventScroll: true });
    });
  }, [active, blocked, mobile]);

  useEffect(() => {
    const query = matchMedia('(max-width: 767px)');
    const resize = () => {
      setMobile(query.matches);
      const viewport = window.visualViewport;
      // Pin to the actual visible viewport, including changing mobile browser chrome.
      const height = viewport && viewport.scale === 1 ? viewport.height : window.innerHeight;
      const width = viewport && viewport.scale === 1 ? viewport.width : window.innerWidth;
      setViewportHeight(height);
      setSceneScale(Math.min(1, width / (query.matches ? 402 : 1728), height / (query.matches ? mobileHeight : desktopHeight)));
      document.documentElement.style.setProperty('--viewport-height', `${height}px`);
    };
    resize();
    setSection(validSection(location.hash.slice(1)));
    const firstFrame = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    window.history.scrollRestoration = 'manual';
    query.addEventListener('change', resize);
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(firstFrame); query.removeEventListener('change', resize); window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); clearTimeout(timer.current); };
  }, [desktopHeight, mobileHeight]);

  useEffect(() => {
    if (validSection(location.hash.slice(1)) !== 'about') {
      setIntro(false);
      setShowNeighbors(true);
      return;
    }
    const reveal = setTimeout(() => setShowNeighbors(true), 1200);
    const finish = setTimeout(() => setIntro(false), 2000);
    return () => { clearTimeout(reveal); clearTimeout(finish); };
  }, []);

  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    const step = (direction: number) => {
      if (blocked || performance.now() < lockedUntil.current) return false;
      const target = screenIds[Math.max(0, Math.min(screenIds.length - 1, activeIndex + direction))];
      if (target === active) return false;
      navigate(target);
      return true;
    };
    const wheel = (e: WheelEvent) => {
      if (blocked || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      const gesture = wheelGesture.current;
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewportHeight : 1);
      const reversed = delta * gesture.total < 0 && now >= lockedUntil.current;
      const gap = now - gesture.last;
      // Slow rendering can space out a decaying trackpad tail beyond the quiet gap.
      // A fresh gesture after a pause or a direction change can move again once unlocked.
      const decayingTail = gesture.used && delta * gesture.delta > 0 && Math.abs(delta) < Math.abs(gesture.delta) && gap < 900;
      const freshAfterPause = gap > 160 && !decayingTail;
      if (freshAfterPause || reversed) { gesture.total = 0; gesture.used = false; }
      gesture.last = now;
      gesture.delta = delta;
      // Drop blocked gestures, including any tail that continues after the cooldown.
      if (now < lockedUntil.current) { gesture.total = delta; gesture.used = true; return; }
      if (gesture.used) return;
      gesture.total += delta;
      if (Math.abs(gesture.total) >= 12) gesture.used = step(Math.sign(gesture.total));
    };
    let pointer: { x: number; y: number; id: number } | null = null;
    let suppressClickUntil = 0;
    const down = (e: PointerEvent) => { if (!blocked && performance.now() >= lockedUntil.current && e.isPrimary && e.button === 0) pointer = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
    const up = (e: PointerEvent) => {
      const start = pointer; pointer = null;
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        suppressClickUntil = performance.now() + 500;
        step(dy < 0 ? 1 : -1);
      }
    };
    const cancel = () => { pointer = null; };
    const click = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); return; }
      const anchor = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (anchor && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); navigate(anchor.hash.slice(1)); }
    };
    const key = (e: KeyboardEvent) => {
      if (blocked || e.ctrlKey || e.metaKey || e.altKey || (e.target as Element).closest('input,textarea,select,[contenteditable="true"],dialog')) return;
      const target = e.target as Element;
      if (e.key === ' ' && target.closest('button,a')) return;
      if (['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'Home' || e.key === 'End') navigate(e.key === 'Home' ? 'about' : 'contacts');
        else step(['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : -1);
      }
    };
    const hash = () => { navigate(location.hash.slice(1), 'none'); window.scrollTo(0, 0); };
    root.addEventListener('wheel', wheel, { passive: false });
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', cancel);
    root.addEventListener('click', click, true);
    document.addEventListener('keydown', key);
    window.addEventListener('popstate', hash);
    window.addEventListener('hashchange', hash);
    return () => {
      root.removeEventListener('wheel', wheel); root.removeEventListener('pointerdown', down); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', cancel); root.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key); window.removeEventListener('popstate', hash); window.removeEventListener('hashchange', hash);
    };
  }, [active, activeIndex, blocked, mobile, navigate, viewportHeight]);

  return { mobile, section, active, activeIndex, screenIds, transitioning, stage, navigate, intro, showNeighbors, sceneScale, viewportHeight, ready };
}

export function Screen({ id, index, activeIndex, children, sceneScale = 1, viewportHeight = 1117, showNeighbors = true, intro = false, ready = false }: { id: SectionId; index: number; activeIndex: number; children: ReactNode; sceneScale?: number; viewportHeight?: number; showNeighbors?: boolean; intro?: boolean; ready?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [activeHeight, setActiveHeight] = useState(0);
  const active = index === activeIndex;
  useEffect(() => {
    const fit = () => {
      if (!box.current || !content.current) return;
      setContentHeight(content.current.offsetHeight);
      const activeContent = box.current.parentElement?.parentElement?.querySelector<HTMLElement>('[data-active="true"] .screen-content');
      setActiveHeight(activeContent?.offsetHeight ?? content.current.offsetHeight);
    };
    const observer = new ResizeObserver(fit);
    if (box.current) observer.observe(box.current);
    if (content.current) observer.observe(content.current);
    const activeContent = box.current?.parentElement?.parentElement?.querySelector<HTMLElement>('[data-active="true"] .screen-content');
    if (activeContent) observer.observe(activeContent);
    void document.fonts.ready.then(fit);
    fit();
    return () => observer.disconnect();
  }, [activeIndex, sceneScale]);
  const distance = Math.max(-2, Math.min(2, index - activeIndex));
  const peek = Math.min(80, viewportHeight * .14, Math.max(0, (viewportHeight - activeHeight * sceneScale) / 2 - 20));
  const offset = viewportHeight / 2 + contentHeight * sceneScale * .75 / 2 - peek;
  const y = active ? 0 : Math.sign(distance) * (offset + (Math.abs(distance) - 1) * viewportHeight);
  const visibleNeighbor = showNeighbors && Math.abs(distance) === 1;
  return <motion.div className="screen-page" data-screen={id} data-active={active} aria-hidden={!active} inert={!active}
    initial={false} animate={{ y, opacity: active ? 1 : visibleNeighbor ? .2 : 0, scale: active ? 1 : .75 }}
    transition={!ready ? { duration: 0 } : { type: 'spring', duration, bounce: .08, opacity: { duration: intro ? .8 : duration } }}>
    <div className="screen-fit" ref={box}><div className="screen-content" ref={content} style={{ '--screen-scale': sceneScale } as CSSProperties}>{children}</div></div>
  </motion.div>;
}
