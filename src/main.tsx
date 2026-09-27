import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource-variable/nunito';
import './styles.css';
import { App } from './App';
import { roles, type Lang, type Role } from './content';

const match=location.pathname.match(/^\/portfolio\/(ru|en)\/(manager|designer|engineer|gamification)\/?$/);
const lang=(match?.[1] || 'ru') as Lang;
const role=(match?.[2] || 'manager') as Role;
document.documentElement.lang=lang;
if(!match && (location.pathname==='/portfolio/'||location.pathname==='/portfolio'||location.pathname==='/'))location.replace('/portfolio/ru/manager/'+location.hash);
const root=document.getElementById('root')!;
if(!(role in roles))throw new Error('Unknown portfolio role');
if(root.hasChildNodes())hydrateRoot(root,<App lang={lang} role={role}/>);
else createRoot(root).render(<App lang={lang} role={role}/>);
