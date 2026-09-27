import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { content, roles, projects, socials, email, recommendationsUrl, type Lang, type Role, type Project } from './content';

const base = '/portfolio/';
const asset = (name: string, folder = 'images') => `${base}assets/${folder}/${name}`;
const sections = ['about', 'experience', 'services', 'projects', 'recommendations', 'contacts'];

function SocialLinks({ lang }: { lang: Lang }) {
  return <div className="socials" aria-label={lang === 'ru' ? 'Социальные сети' : 'Social profiles'}>{socials.map(s => <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}><img src={asset(s.icon)} alt="" /></a>)}</div>;
}

function Navigation({ lang, footer = false }: { lang: Lang; footer?: boolean }) {
  return <nav className={footer ? 'navigation footer-nav' : 'navigation'} aria-label={lang === 'ru' ? (footer ? 'Навигация внизу страницы' : 'Основная навигация') : (footer ? 'Footer navigation' : 'Main navigation')}>
    {sections.map((id, i) => <a className={id === 'contacts' ? 'desktop-only' : ''} key={id} href={`#${id}`}>{content[lang].nav[i]}</a>)}
  </nav>;
}

function Heading({ children, emoji, id }: { children: string; emoji?: string; id: string }) {
  return <h2 id={id}>{emoji && <span aria-hidden="true">{emoji} </span>}{children}{emoji && <span aria-hidden="true"> {emoji}</span>}</h2>;
}

function VideoPreview({ project, active, paused }: { project: Project; active: boolean; paused: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let visible = false;
    const update = () => {
      if (visible && active && !paused && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, { threshold: .45 });
    observer.observe(video);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); video.pause(); };
  }, [active, paused]);
  return <video ref={ref} src={active ? asset(project.video, 'videos') : undefined} poster={asset(`${project.id}.webp`)} muted loop playsInline preload="none" aria-hidden="true" />;
}

function ProjectCarousel({ lang, onPlay, paused }: { lang: Lang; onPlay: (p: Project) => void; paused: boolean }) {
  const [index, setIndex] = useState(0);
  const gesture = useRef<{x: number; y: number} | null>(null);
  const ignoreClick = useRef(false);
  const t = content[lang];
  const move = (delta: number) => setIndex(i => (i + delta + projects.length) % projects.length);
  return <div className="carousel" data-testid="carousel" role="region" aria-roledescription={lang === 'ru' ? 'карусель' : 'carousel'} aria-label={t.projectsTitle}
    onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); move(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } }}>
    <div className="carousel-viewport" onClickCapture={e=>{if(ignoreClick.current){e.preventDefault();e.stopPropagation();}}} onPointerDown={e => { gesture.current = {x:e.clientX,y:e.clientY}; }} onPointerCancel={() => {gesture.current=null;}}
      onPointerUp={e => {const start=gesture.current; gesture.current=null; if(start && Math.abs(e.clientX-start.x)>45 && Math.abs(e.clientX-start.x)>Math.abs(e.clientY-start.y)){ignoreClick.current=true; move(e.clientX<start.x?1:-1); setTimeout(()=>{ignoreClick.current=false;},0);}}}>
      {projects.map((p, i) => {
        const offset = ((i - index + 9) % 6) - 3;
        const active = index === i;
        return <article key={p.id} className={`project-card ${active ? 'active' : ''}`} data-testid="project-card" aria-current={active ? 'true' : 'false'} aria-hidden={Math.abs(offset)>1 || undefined} style={{'--offset':offset} as CSSProperties}>
          <div className="project-preview">
            <VideoPreview project={p} active={active} paused={paused} />
            {(p.game || !active) && <button className="play-overlay" tabIndex={active ? 0 : -1} data-testid={`play-${p.id}`} aria-label={`${active ? t.play : t.projectLabel}: ${p.title[lang]}`} onClick={() => {if(ignoreClick.current)return; if(!active)setIndex(i);else if(p.game)onPlay(p);}}>
              {p.game && <><span className="play-label">{lang === 'ru' ? 'Нажать' : 'Click'}</span><span className="play-circle"><img src={asset('play.svg')} alt="" /></span><span className="play-label">{lang === 'ru' ? 'для игры' : 'to play'}</span></>}
            </button>}
          </div>
          <h3>{p.title[lang]} <img className="company-logo" src={asset(`icon_${p.company}.png`)} alt={p.company.toUpperCase()} /></h3>
          <p>{p.description[lang]}</p>
          <a className="button project-link" tabIndex={active ? 0 : -1} href={p.href} target="_blank" rel="noopener noreferrer">{i<2?t.designLink:t.websiteLink}</a>
        </article>;
      })}
    </div>
    <div className="carousel-controls">
      <button className="arrow-button" data-testid="previous-project" onClick={()=>move(-1)} aria-label={t.previous}>←</button>
      <div className="dots">{projects.map((p,i)=><button key={p.id} data-testid={`project-dot-${i}`} aria-label={`${t.projectLabel} ${i+1}: ${p.title[lang]}`} aria-current={index===i?'true':undefined} onClick={()=>setIndex(i)}><span /></button>)}</div>
      <button className="arrow-button" data-testid="next-project" onClick={()=>move(1)} aria-label={t.next}>→</button>
    </div>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{index+1} / 6: {projects[index].title[lang]}</span>
  </div>;
}

function GameDialog({ project, lang, onClose }: { project: Project; lang: Lang; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t = content[lang];
  useEffect(()=>{
    const opener = document.activeElement as HTMLElement | null;
    const prior = document.body.style.overflow;
    const d=ref.current;
    d?.showModal(); document.body.style.overflow='hidden';
    return ()=>{clearTimeout(timer.current);d?.close();document.body.style.overflow=prior;opener?.focus({preventScroll:true});};
  },[]);
  function close(){if(closing)return;setClosing(true);timer.current=setTimeout(onClose,matchMedia('(prefers-reduced-motion: reduce)').matches?0:300);}
  return <dialog ref={ref} className={`game-dialog ${closing?'closing':''}`} aria-labelledby="game-title" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}} onKeyDown={e=>{
    if(e.key!=='Tab')return;
    const focusable=e.currentTarget.querySelectorAll<HTMLElement>('button, iframe, a[href]');
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }}>
    <div className="dialog-body">
      <div className="dialog-header"><h2 id="game-title">{project.title[lang]}</h2><button className="close-button" data-testid="close-modal" aria-label={t.close} onClick={close} autoFocus>×</button></div>
      <div className="game-surface">{!loaded&&<span className="loading" role="status">{lang==='ru'?'Загрузка…':'Loading…'}</span>}<iframe title={project.title[lang]} src={project.game} onLoad={()=>setLoaded(true)} allow="fullscreen; autoplay" allowFullScreen /></div>
      <a className="button external-game" href={project.game} target="_blank" rel="noopener noreferrer">{t.openExternal} ↗</a>
    </div>
  </dialog>;
}

export function App({ lang, role }: { lang: Lang; role: Role }) {
  const t=content[lang];
  const [game,setGame]=useState<Project|null>(null);
  const [toast,setToast]=useState<{error:boolean}|null>(null);
  const toastTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const currentSection=useRef('about');
  const manuallyScrolled=useRef(false);
  useEffect(()=>{
    const nodes=[...document.querySelectorAll<HTMLElement>('main > section')];
    const visibility=new Map<string,number>();
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(e=>{visibility.set(e.target.id,e.intersectionRatio); if(e.isIntersecting)e.target.classList.add('in-view');else e.target.classList.remove('in-view');});
      const best=[...visibility.entries()].sort((a,b)=>b[1]-a[1])[0];
      if(best?.[1]>0)currentSection.current=best[0];
    },{threshold:[0,.1,.25,.5,.75]});
    const resize=new ResizeObserver(()=>nodes.forEach(n=>n.classList.toggle('snap-target',n.offsetHeight<=window.innerHeight+2)));
    nodes.forEach(n=>{observer.observe(n);resize.observe(n);});
    const onResize=()=>nodes.forEach(n=>n.classList.toggle('snap-target',n.offsetHeight<=window.innerHeight+2));
    const onManualScroll=()=>{manuallyScrolled.current=true;};
    window.addEventListener('resize',onResize);
    window.addEventListener('wheel',onManualScroll,{passive:true});
    window.addEventListener('touchmove',onManualScroll,{passive:true});
    if(location.hash)requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'instant'}));
    return ()=>{observer.disconnect();resize.disconnect();window.removeEventListener('resize',onResize);window.removeEventListener('wheel',onManualScroll);window.removeEventListener('touchmove',onManualScroll);clearTimeout(toastTimer.current);};
  },[]);
  async function copyEmail(){
    try{await navigator.clipboard.writeText(email);setToast({error:false});}catch{setToast({error:true});}
    clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(null),5000);
  }
  return <>
    <a className="skip-link" href="#about">{lang==='ru'?'К содержимому':'Skip to content'}</a>
    <header className="site-header container">
      <Navigation lang={lang}/>
      <div className="header-actions"><div className="language-switch" aria-label={lang==='ru'?'Язык':'Language'}>{(['ru','en'] as const).map(l=><a key={l} data-testid={`language-${l}`} aria-current={l===lang?'page':undefined} href={`${base}${l}/${role}/`} hrefLang={l} lang={l} onClick={e=>{e.currentTarget.href=`${base}${l}/${role}/#${manuallyScrolled.current?currentSection.current:(location.hash.slice(1)||currentSection.current)}`;}}>{l==='ru'?'РУС':'ENG'}</a>)}</div>
      <a className="button resume-link" href={asset(roles[role].resume,'resumes')} download>{t.download}</a></div>
    </header>
    <main>
      <section id="about" className="hero container in-view" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="greeting">{t.greeting}</p><p className="name">{t.name}</p><h1 id="hero-title">{roles[role][lang].map(line=><span key={line}>{line}</span>)}</h1><ul className="bio">{t.about.map(p=><li key={p}>{p}</li>)}</ul></div>
        <div className="portrait"><img src={asset('portrait.png')} alt={t.name} width="486" height="590" fetchPriority="high" /></div>
        <a className="button hero-contact" href={socials[0].href} target="_blank" rel="noopener noreferrer">{t.contact}</a><div className="hero-socials"><SocialLinks lang={lang}/></div>
      </section>
      <section id="experience" className="card-section container" aria-labelledby="experience-title"><div className="section-inner"><Heading id="experience-title" emoji="📈">{t.experienceTitle}</Heading><div className="card-grid">{t.stats.map((s,i)=><article className="info-card" key={s.title} style={{'--order':i} as CSSProperties}><img className="stat-icon animated-icon" src={asset(`icon_${s.icon}.png`)} alt="" loading="lazy"/><h3>{s.title}</h3><p>{s.body}</p></article>)}</div></div></section>
      <section id="services" className="card-section container" aria-labelledby="services-title"><div className="section-inner"><Heading id="services-title" emoji="🛠️">{t.servicesTitle}</Heading><div className="card-grid">{t.services.map((s,i)=><article className="info-card" key={s.title} style={{'--order':i} as CSSProperties}><span className="service-icon animated-icon" aria-hidden="true">{s.icon}</span><h3>{s.title}</h3><p>{s.body}</p></article>)}</div></div></section>
      <section id="projects" className="projects-section" aria-labelledby="projects-title"><div className="section-inner"><Heading id="projects-title" emoji="🎯">{t.projectsTitle}</Heading><ProjectCarousel lang={lang} onPlay={setGame} paused={!!game}/></div></section>
      <section id="recommendations" className="recommendations-section container" aria-labelledby="recommendations-title"><div className="section-inner"><Heading id="recommendations-title" emoji="👍">{t.recommendationsTitle}</Heading><div className="letters">{['sytnov','kozikov'].map((person,i)=><a href={recommendationsUrl} target="_blank" rel="noopener noreferrer" key={person} aria-label={`${t.recommendationsTitle} — ${lang==='ru'?['Сытнов','Козиков'][i]:['Sytnov','Kozikov'][i]}`}><img src={asset(`letter-${person}.webp`)} alt={`${lang==='ru'?'Рекомендательное письмо':'Letter of recommendation'}: ${lang==='ru'?['Сытнов','Козиков'][i]:['Sytnov','Kozikov'][i]}`} loading="lazy" width="445" height="631"/></a>)}</div><a className="button" href={recommendationsUrl} target="_blank" rel="noopener noreferrer">{t.recommendationsLink}</a></div></section>
      <section id="contacts" className="contacts-section container" aria-labelledby="contacts-title"><div className="section-inner"><Heading id="contacts-title">{t.contactsTitle}</Heading><p>{t.contactsDescription}</p><SocialLinks lang={lang}/><a className="email" href={`mailto:${email}`}>{email}</a><button className="button" data-testid="copy-email" onClick={()=>void copyEmail()}>{t.copy}</button></div></section>
    </main>
    <footer><div className="footer-content container"><a className="back-to-top" href="#about" aria-label={lang==='ru'?'Наверх':'Back to top'}><img src={asset('up-arrow.svg')} alt=""/></a><Navigation lang={lang} footer/></div><div className="copyright">2026</div></footer>
    <div className={`toast ${toast?.error?'error':''}`} data-testid="toast" role="status" aria-live="polite" aria-atomic="true">{toast?(toast.error?t.copyError:t.copied):''}</div>
    {game&&<GameDialog project={game} lang={lang} onClose={()=>setGame(null)}/>}
  </>;
}
