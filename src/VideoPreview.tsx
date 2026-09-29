import { useEffect, useRef, useState } from 'react';
import type { Lang, Project } from './content';

const asset = (name: string, folder = 'images') => `/portfolio/assets/${folder}/${name}`;

export function VideoPreview({ project, lang, active, nearby, paused }: { project: Project; lang: Lang; active: boolean; nearby: boolean; paused: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const start = useRef<(() => void) | null>(null);
  const [load, setLoad] = useState(nearby);
  const [ready, setReady] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);

  useEffect(() => { if (nearby) setLoad(true); }, [nearby]);
  useEffect(() => {
    const video = ref.current;
    if (!video || !load) return;
    let visible = false;
    let disposed = false;
    let attempted = false;
    let pending = false;
    const eligible = () => !disposed && visible && active && !paused && !document.hidden;
    const showFallback = () => {
      if (!eligible()) return;
      setReady(false);
      setNeedsPlay(true);
    };
    const play = () => {
      if (!eligible() || attempted || pending) return;
      attempted = true;
      pending = true;
      video.muted = true;
      setNeedsPlay(false);
      void video.play().then(() => {
        if (!eligible()) video.pause();
      }).catch(showFallback).finally(() => { pending = false; });
    };
    const update = (recover = false) => {
      if (!eligible()) { attempted = false; video.pause(); return; }
      if (recover) attempted = false;
      play();
    };
    const observer = new IntersectionObserver(entries => {
      const wasVisible = visible;
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .45;
      update(visible && !wasVisible);
    }, { threshold: [0, .45] });
    const onReady = () => update();
    const onPlaying = () => {
      if (!eligible()) { video.pause(); return; }
      setReady(true);
      setNeedsPlay(false);
    };
    const onPause = () => { if (eligible() && !pending) showFallback(); };
    const recover = () => update(true);
    start.current = () => {
      if (!eligible()) return;
      if (video.error) video.load();
      attempted = false;
      play();
    };
    observer.observe(video);
    document.addEventListener('visibilitychange', recover);
    window.addEventListener('pageshow', recover);
    video.addEventListener('canplay', onReady);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', showFallback);
    return () => {
      disposed = true;
      start.current = null;
      observer.disconnect();
      document.removeEventListener('visibilitychange', recover);
      window.removeEventListener('pageshow', recover);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', showFallback);
      video.pause();
    };
  }, [active, paused, load]);

  return <>
    <video ref={ref} src={load ? asset(project.video, 'videos') : undefined} poster={asset(`${project.id}.webp`)} muted loop playsInline preload={load ? 'auto' : 'none'} aria-hidden="true" data-ready={ready} style={{ opacity: ready ? 1 : 0 }} />
    <img className="video-poster" src={asset(`${project.id}.webp`)} alt="" aria-hidden="true" style={{ opacity: ready ? 0 : 1, position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
    {needsPlay && active && !paused && <button type="button" className="video-start" data-testid={`preview-start-${project.id}`} onClick={event => { event.stopPropagation(); start.current?.(); }}>{lang === 'ru' ? 'Запустить превью' : 'Play preview'}</button>}
  </>;
}
