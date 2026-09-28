import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { content, projects, type Lang, type Project } from './content';

const asset = (name: string, folder = 'images') => `/portfolio/assets/${folder}/${name}`;
const duration = 766;
const offsetFor = (card: number, selected: number) => ((card - selected + projects.length + 3) % projects.length) - 3;

function VideoPreview({ project, active, nearby, paused }: { project: Project; active: boolean; nearby: boolean; paused: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(nearby);
  const [ready, setReady] = useState(false);
  useEffect(() => { if (nearby) setLoad(true); }, [nearby]);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let visible = false;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (visible && active && !paused && !document.hidden && !motion.matches) void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .45; update(); }, { threshold: [0, .45] });
    observer.observe(video);
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    video.addEventListener('loadeddata', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      motion.removeEventListener('change', update);
      video.removeEventListener('loadeddata', update);
      video.pause();
    };
  }, [active, paused, load]);
  return <>
    <video ref={ref} src={load ? asset(project.video, 'videos') : undefined} poster={asset(`${project.id}.webp`)} muted loop playsInline preload={load ? 'auto' : 'none'} aria-hidden="true" data-ready={ready} onLoadedData={() => setReady(true)} onError={() => setReady(false)} style={{ opacity: ready ? 1 : 0 }} />
    <img className="video-poster" src={asset(`${project.id}.webp`)} alt="" aria-hidden="true" style={{ opacity: ready ? 0 : 1, position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
  </>;
}

export function ProjectCarousel({ lang, onPlay, paused }: { lang: Lang; onPlay: (project: Project) => void; paused: boolean }) {
  const [selection, setSelection] = useState({ index: 0, previous: 0, jump: false });
  const [moving, setMoving] = useState(false);
  const selected = useRef(0);
  const locked = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gesture = useRef<{ x: number; y: number; pointer: number; direction: 'horizontal' | 'vertical' | null } | null>(null);
  const ignoreClickUntil = useRef(0);
  const t = content[lang];
  useEffect(() => () => clearTimeout(timer.current), []);

  function select(next: number) {
    if (locked.current || paused) return;
    const index = (next + projects.length) % projects.length;
    const previous = selected.current;
    if (index === previous) return;
    const distance = Math.min(Math.abs(index - previous), projects.length - Math.abs(index - previous));
    const instant = matchMedia('(prefers-reduced-motion: reduce)').matches || distance > 1;
    const focusWasInCard = root.current?.querySelector('.project-card.active')?.contains(document.activeElement);
    selected.current = index;
    locked.current = !instant;
    setMoving(!instant);
    setSelection({ index, previous, jump: instant });
    clearTimeout(timer.current);
    if (!instant) timer.current = setTimeout(() => { locked.current = false; setMoving(false); }, duration);
    if (focusWasInCard) requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('.project-card.active [tabindex="0"]')?.focus({ preventScroll: true }));
  }

  return <div ref={root} className="carousel" data-testid="carousel" data-moving={moving} role="region" aria-roledescription={lang === 'ru' ? 'карусель' : 'carousel'} aria-label={t.projectsTitle}
    onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); event.stopPropagation(); select(selected.current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    }}>
    <div className="carousel-viewport" onClickCapture={event => { if (performance.now() < ignoreClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}
      onPointerDown={event => { if (event.isPrimary && event.button === 0) gesture.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId, direction: null }; }}
      onPointerMove={event => {
        const start = gesture.current;
        if (!start || start.pointer !== event.pointerId) return;
        const x = Math.abs(event.clientX - start.x), y = Math.abs(event.clientY - start.y);
        if (!start.direction && Math.max(x, y) > 12) start.direction = x > y * 1.2 ? 'horizontal' : 'vertical';
        if (start.direction === 'horizontal') {
          event.stopPropagation(); event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          ignoreClickUntil.current = performance.now() + 350;
        }
      }}
      onPointerCancel={() => { gesture.current = null; }}
      onPointerUp={event => {
        const start = gesture.current;
        gesture.current = null;
        if (!start || start.pointer !== event.pointerId) return;
        const delta = event.clientX - start.x;
        if (start.direction === 'horizontal' || (Math.abs(delta) > 45 && Math.abs(delta) > Math.abs(event.clientY - start.y) * 1.2)) {
          event.stopPropagation(); event.preventDefault();
          ignoreClickUntil.current = performance.now() + 350;
          if (Math.abs(delta) > 45) select(selected.current + (delta < 0 ? 1 : -1));
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}>
      {projects.map((project, i) => {
        const offset = offsetFor(i, selection.index);
        const previousOffset = offsetFor(i, selection.previous);
        const rebase = selection.jump || Math.abs(offset - previousOffset) > 1 || Math.abs(offset) > 2 || Math.abs(previousOffset) > 2;
        const active = i === selection.index;
        return <article key={project.id} className={`project-card ${active ? 'active' : ''}`} data-testid="project-card" data-offset={offset} data-rebased={rebase} aria-current={active ? 'true' : 'false'} aria-hidden={!active || undefined} style={{ '--offset': offset, transition: rebase ? 'none' : undefined, visibility: Math.abs(offset) > 2 ? 'hidden' : undefined } as CSSProperties}>
          <div className="project-preview">
            <VideoPreview project={project} active={active} nearby={Math.abs(offset) <= 1} paused={paused} />
            {(project.game || !active) && <button className="play-overlay" tabIndex={active ? 0 : -1} data-testid={`play-${project.id}`} aria-label={`${active ? t.play : t.projectLabel}: ${project.title[lang]}`} onClick={() => {
              if (performance.now() < ignoreClickUntil.current || locked.current || paused) return;
              if (!active) select(i); else if (project.game) onPlay(project);
            }}>
              {project.game && <><span className="play-label">{lang === 'ru' ? 'Нажать' : 'Click'}</span><span className="play-circle"><img src={asset('play.svg')} alt="" /></span><span className="play-label">{lang === 'ru' ? 'для игры' : 'to play'}</span></>}
            </button>}
          </div>
          <h3>{project.title[lang]} <img className="company-logo" src={asset(`icon_${project.company}.png`)} alt={project.company.toUpperCase()} /></h3>
          <p>{project.description[lang]}</p>
          <a className="button project-link" tabIndex={active ? 0 : -1} href={project.href} target="_blank" rel="noopener noreferrer">{i < 2 ? t.designLink : t.websiteLink}</a>
        </article>;
      })}
    </div>
    <div className="carousel-controls">
      <button className="arrow-button" data-testid="previous-project" aria-disabled={moving || undefined} onClick={() => select(selected.current - 1)} aria-label={t.previous}>←</button>
      <div className="dots">{projects.map((project, i) => <button key={project.id} data-testid={`project-dot-${i}`} aria-label={`${t.projectLabel} ${i + 1}: ${project.title[lang]}`} aria-current={selection.index === i ? 'true' : undefined} aria-disabled={moving || undefined} onClick={() => select(i)}><span /></button>)}</div>
      <button className="arrow-button" data-testid="next-project" aria-disabled={moving || undefined} onClick={() => select(selected.current + 1)} aria-label={t.next}>→</button>
    </div>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{selection.index + 1} / {projects.length}: {projects[selection.index].title[lang]}</span>
  </div>;
}
