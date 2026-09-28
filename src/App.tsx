import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { content, roles, socials, email, recommendationsUrl, type Lang, type Role, type Project } from './content';
import { ProjectCarousel } from './ProjectCarousel';
import { Screen, sectionIds, useScreens, useReducedMotion, type SectionId } from './screens';

const base = '/portfolio/';
const asset = (name: string, folder = 'images') => base + 'assets/' + folder + '/' + name;

function SocialLinks({lang}: {lang: Lang}) {
  return <div className="socials" aria-label={lang === 'ru' ? 'Социальные сети' : 'Social profiles'}>{socials.map(s => <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}><img src={asset(s.icon)} alt="" /></a>)}</div>;
}
function Navigation({lang, footer = false}: {lang: Lang; footer?: boolean}) {
  return <nav className={footer ? 'navigation footer-nav' : 'navigation'} aria-label={lang === 'ru' ? (footer ? 'Навигация внизу страницы' : 'Основная навигация') : (footer ? 'Footer navigation' : 'Main navigation')}>{sectionIds.map((id,i) => <a className={id === 'contacts' ? 'desktop-only' : ''} key={id} href={'#'+id}>{content[lang].nav[i]}</a>)}</nav>;
}
function LanguageSwitch({lang,role,section}: {lang:Lang;role:Role;section:SectionId}) {
  const start = useRef<{x:number;y:number}|null>(null);
  const dragged = useRef(false);
  const href = (l:Lang) => base+l+'/'+role+'/#'+section;
  return <div className="language-switch" data-lang={lang} role="group" aria-label={lang === 'ru' ? 'Язык' : 'Language'}
    onPointerDown={e=>{start.current={x:e.clientX,y:e.clientY};dragged.current=false;}}
    onPointerMove={e=>{if(start.current && Math.abs(e.clientX-start.current.x)>10 && Math.abs(e.clientX-start.current.x)>Math.abs(e.clientY-start.current.y)){dragged.current=true;e.currentTarget.setPointerCapture(e.pointerId);}}}
    onPointerCancel={()=>{start.current=null;}}
    onPointerUp={e=>{const p=start.current;start.current=null;if(!p||!dragged.current)return;e.stopPropagation();const next=e.clientX>p.x?'en':'ru';if(next!==lang)location.assign(href(next));}}
    onClickCapture={e=>{if(dragged.current){e.preventDefault();e.stopPropagation();}}}>
    <span className="language-thumb" aria-hidden="true" />
    {(['ru','en'] as const).map(l=><a key={l} data-testid={'language-'+l} href={href(l)} hrefLang={l} lang={l} aria-current={l===lang?'page':undefined} onClick={e=>{if(l===lang)e.preventDefault();}}>{l==='ru'?'РУС':'ENG'}</a>)}
  </div>;
}
function Heading({children,emoji,id}: {children:string;emoji?:string;id:string}) {
  return <h2 id={id} tabIndex={-1}>{emoji&&<span aria-hidden="true">{emoji} </span>}{children}{emoji&&<span aria-hidden="true"> {emoji}</span>}</h2>;
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

export function App({lang,role}: {lang:Lang;role:Role}) {
  const t=content[lang];
  const [game,setGame]=useState<Project|null>(null);
  const [toast,setToast]=useState<{error:boolean}|null>(null);
  const toastTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const screens=useScreens(!!game);
  const reduced=useReducedMotion();
  useEffect(()=>()=>clearTimeout(toastTimer.current),[]);
  const enter={type:'spring' as const,duration:reduced?0:1.2,bounce:.08};
  const screenProps={activeIndex:screens.activeIndex,sceneScale:screens.sceneScale,viewportHeight:screens.viewportHeight,showNeighbors:screens.showNeighbors,intro:screens.intro,ready:screens.ready};
  async function copyEmail(){
    try{await navigator.clipboard.writeText(email);setToast({error:false});}catch{setToast({error:true});}
    clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(null),5000);
  }
  const resume=<a className="button resume-link" href={asset(roles[role].resume,'resumes')} download>{t.download}</a>;
  const contacts=<section id="contacts" className="contacts-section" aria-labelledby="contacts-title"><Heading id="contacts-title">{t.contactsTitle}</Heading><p>{t.contactsDescription}</p><SocialLinks lang={lang}/><a className="email" href={'mailto:'+email}>{email}</a><button className="button" data-testid="copy-email" onClick={()=>void copyEmail()}>{t.copy}</button></section>;
  const footer=<footer><div className="footer-content"><a className="back-to-top" href="#about" aria-label={lang==='ru'?'Наверх':'Back to top'}><img src={asset('up-arrow.svg')} alt=""/></a><Navigation lang={lang} footer/></div><div className="copyright">2026</div></footer>;
  return <>
    <main className="screen-stage" ref={screens.stage} data-active-screen={screens.active} data-transitioning={screens.transitioning} data-intro={screens.intro} onDragStart={e=>e.preventDefault()}>
      <a className="skip-link" href="#about">{lang==='ru'?'К содержимому':'Skip to content'}</a>
      <Screen id="about" index={0} {...screenProps}>
        <div className="about-layout">
          <header className="site-header"><LanguageSwitch lang={lang} role={role} section={screens.section}/><Navigation lang={lang}/>{resume}</header>
          <section id="about" className="hero" aria-labelledby="hero-title">
            <motion.div className="hero-copy" initial={reduced?false:{x:'-100vw'}} animate={{x:0}} transition={enter}><p className="greeting">{t.greeting}</p><p className="name">{t.name}</p><h1 id="hero-title" tabIndex={-1}>{roles[role][lang].map(line=><span key={line}>{line}</span>)}</h1><ul className="bio">{t.about.map(p=><li key={p}>{p}</li>)}</ul></motion.div>
            <motion.div className="portrait" initial={reduced?false:{x:'100vw'}} animate={{x:0}} transition={enter}><img src={asset('portrait.png')} alt={t.name} width="486" height="590" fetchPriority="high"/></motion.div>
            <motion.div className="hero-contact" initial={reduced?false:{y:'100vh'}} animate={{y:0}} transition={enter}><a className="button" href={socials[0].href} target="_blank" rel="noopener noreferrer">{t.contact}</a></motion.div>
            <motion.div className="hero-socials" initial={reduced?false:{y:'100vh'}} animate={{y:0}} transition={enter}><SocialLinks lang={lang}/></motion.div>
          </section>
        </div>
      </Screen>
      <Screen id="experience" index={1} {...screenProps}><section id="experience" className="card-section" aria-labelledby="experience-title"><Heading id="experience-title" emoji="📈">{t.experienceTitle}</Heading><div className="card-grid">{t.stats.map((s,i)=><article className="info-card" key={s.title} style={{'--order':i} as CSSProperties}><img className="stat-icon" src={asset('icon_'+s.icon+'.png')} alt=""/><h3>{s.title}</h3><p>{s.body}</p></article>)}</div></section></Screen>
      <Screen id="services" index={2} {...screenProps}><section id="services" className="card-section" aria-labelledby="services-title"><Heading id="services-title" emoji="🛠️">{t.servicesTitle}</Heading><div className="card-grid">{t.services.map((s,i)=><article className="info-card" key={s.title} style={{'--order':i} as CSSProperties}><span className="service-icon" aria-hidden="true">{s.icon}</span><h3>{s.title}</h3><p>{s.body}</p></article>)}</div></section></Screen>
      <Screen id="projects" index={3} {...screenProps}><section id="projects" className="projects-section" aria-labelledby="projects-title"><Heading id="projects-title" emoji="🎯">{t.projectsTitle}</Heading><ProjectCarousel lang={lang} onPlay={setGame} paused={!!game || screens.active!=='projects'}/></section></Screen>
      <Screen id="recommendations" index={4} {...screenProps}><div className={screens.mobile?'recommendations-combined':'recommendations-layout'}><section id="recommendations" className="recommendations-section" aria-labelledby="recommendations-title"><Heading id="recommendations-title" emoji="👍">{t.recommendationsTitle}</Heading><div className="letters">{['sytnov','kozikov'].map((person,i)=><a href={recommendationsUrl} target="_blank" rel="noopener noreferrer" key={person} aria-label={t.recommendationsTitle+' — '+(lang==='ru'?['Сытнов','Козиков'][i]:['Sytnov','Kozikov'][i])}><img src={asset('letter-'+person+'.webp')} alt={(lang==='ru'?'Рекомендательное письмо':'Letter of recommendation')+': '+(lang==='ru'?['Сытнов','Козиков'][i]:['Sytnov','Kozikov'][i])} width="445" height="631"/></a>)}</div><a className="button" href={recommendationsUrl} target="_blank" rel="noopener noreferrer">{t.recommendationsLink}</a></section>{screens.mobile&&<>{contacts}{footer}</>}</div></Screen>
      {!screens.mobile&&<Screen id="contacts" index={5} {...screenProps}><div className="contacts-layout">{contacts}{footer}</div></Screen>}
    </main>
    <div className={'toast '+(toast?.error?'error':'')} data-testid="toast" role="status" aria-live="polite" aria-atomic="true">{toast?(toast.error?t.copyError:t.copied):''}</div>
    {game&&<GameDialog project={game} lang={lang} onClose={()=>setGame(null)}/>}
  </>;
}
