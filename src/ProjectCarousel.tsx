import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { content, projects, type Lang, type Project } from './content';
import { VideoPreview } from './VideoPreview';

const asset = (name: string, folder = 'images') => `/portfolio/assets/${folder}/${name}`;
const duration = 766;
const offsetFor = (card: number, selected: number, direction = 1) => {
  const minimum = direction === 1 ? -2 : -3;
  return ((card - selected - minimum + projects.length) % projects.length) + minimum;
};

export function ProjectCarousel({ lang, onPlay, paused }: { lang: Lang; onPlay: (project: Project) => void; paused: boolean }) {
  const [selection, setSelection] = useState({ index: 0, offsets: projects.map((_, i) => offsetFor(i, 0)), rebased: -1 });
  const [moving, setMoving] = useState(false);
  const selected = useRef(0);
  const locked = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef(0);
  const gesture = useRef<{ x: number; y: number; pointer: number; direction: 'horizontal' | 'vertical' | null } | null>(null);
  const ignoreClickUntil = useRef(0);
  const t = content[lang];
  useEffect(() => () => { clearTimeout(timer.current); cancelAnimationFrame(frame.current); }, []);

  function select(next: number) {
    if (locked.current || paused) return;
    const index = (next + projects.length) % projects.length;
    const previous = selected.current;
    if (index === previous) return;
    const focusWasInCard = root.current?.querySelector('.project-card.active')?.contains(document.activeElement);
    const forward = (index - previous + projects.length) % projects.length;
    const direction = forward <= projects.length / 2 ? 1 : -1;
    locked.current = true;
    setMoving(true);
    function step() {
      const current = selected.current;
      const offsets = projects.map((_, i) => offsetFor(i, current, direction));
      setSelection(last => ({ index: current, offsets, rebased: offsets.findIndex((offset, i) => offset !== last.offsets[i]) }));
      // The only teleport is the sixth card, fully outside the clipped viewport.
      // Let its new start position render before moving the complete ring together.
      frame.current = requestAnimationFrame(() => {
        frame.current = requestAnimationFrame(() => {
          const nextIndex = (current + direction + projects.length) % projects.length;
          selected.current = nextIndex;
          setSelection({ index: nextIndex, offsets: offsets.map(offset => offset - direction), rebased: -1 });
          if (focusWasInCard) requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('.project-card.active [tabindex="0"]')?.focus({ preventScroll: true }));
          timer.current = setTimeout(() => {
            if (nextIndex !== index) step();
            else { locked.current = false; setMoving(false); }
          }, duration);
        });
      });
    }
    step();
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
        const offset = selection.offsets[i];
        const rebase = selection.rebased === i;
        const active = i === selection.index;
        return <article key={project.id} className={`project-card ${active ? 'active' : ''}`} data-testid="project-card" data-offset={offset} data-rebased={rebase} aria-current={active ? 'true' : 'false'} aria-hidden={!active || undefined} style={{ '--offset': offset, transition: rebase ? 'none' : undefined } as CSSProperties}>
          <div className="project-preview">
            <VideoPreview project={project} lang={lang} active={active} nearby={Math.abs(offset) <= 1} paused={paused} />
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
