export type Lang = 'ru' | 'en';
export type Role = 'manager' | 'designer' | 'engineer' | 'gamification';

export const roles: Record<Role, { ru: [string, string]; en: [string, string]; resume: string }> = {
  manager: { ru: ['Менеджер', 'Продукта'], en: ['Product', 'Manager'], resume: 'manager.pdf' },
  designer: { ru: ['Продуктовый', 'Дизайнер'], en: ['Product', 'Designer'], resume: 'designer.pdf' },
  engineer: { ru: ['Инженер', 'Продукта'], en: ['Product', 'Engineer'], resume: 'engineer.pdf' },
  gamification: { ru: ['Дизайнер', 'Геймификации'], en: ['Gamification', 'Designer'], resume: 'gamification.pdf' },
};

type Card = { title: string; body: string; icon: string };
export interface Content {
  name: string;
  greeting: string;
  nav: [string, string, string, string, string, string];
  contact: string;
  download: string;
  copy: string;
  copied: string;
  copyError: string;
  recommendationsLink: string;
  contactsDescription: string;
  about: string[];
  stats: Card[];
  services: Card[];
  projectsTitle: string;
  experienceTitle: string;
  servicesTitle: string;
  recommendationsTitle: string;
  contactsTitle: string;
  designLink: string;
  websiteLink: string;
  play: string;
  close: string;
  openExternal: string;
  previous: string;
  next: string;
  projectLabel: string;
}

export const content: Record<Lang, Content> = {
  ru: {
    name: 'Чинков Артем',
    greeting: 'Привет, я',
    nav: ['О себе', 'Опыт в цифрах', 'Что я делаю', 'Проекты', 'Рекомендации', 'Контакты'],
    contact: 'Связаться со мной',
    download: 'Скачать резюме',
    copy: 'Скопировать почту',
    copied: 'Скопировано!',
    copyError: 'Что-то пошло не так. Скопируйте адрес вручную.',
    recommendationsLink: 'К рекомендациям',
    contactsDescription: 'Связаться со мной можно одним из следующих способов:',
    about: ['Соединяю продуктовый менеджмент, UX/UI, разработку с AI и гейм-дизайн. Работал над мобильными приложениями, образовательными продуктами, играми в Сбере, МТС, VK, БКС.', 'По образованию я психолог, выпускник МГУ. Этот опыт помогает учитывать мотивацию пользователей.'],
    stats: [
      { title: '15% MAU · +10% пополнения · +3 п.п. Aha', body: 'Результаты в БКС: 15% MAU вовлечены в геймификацию; средняя сумма пополнения выросла на 10% к предыдущему периоду; Aha-конверсия выросла с 15% до 18%.', icon: 'bcs' },
      { title: '300+ тысяч абонентов', body: 'Привлёк тариф + приложение «Прогрессоры» от МТС.', icon: 'mts' },
      { title: '3 млн+ прохождений', body: 'У каждого из двух тренажёров VK «Урок цифры».', icon: 'vk' },
      { title: '8 гейм-дизайнеров', body: 'Команда, которой я руководил в Сбере.', icon: 'sber' },
    ],
    services: [
      { title: 'Развитие продукта', body: 'Исследую потребности, формулирую гипотезы и требования, прорабатываю MVP, roadmap и бэклог. Сопровождаю запуск и анализ результатов.', icon: '💼' },
      { title: 'Продуктовый дизайн', body: 'Проектирую пользовательские сценарии и адаптивные интерфейсы. Работаю с дизайн-системами, создаю прототипы и дорабатываю UX по обратной связи.', icon: '💻' },
      { title: 'Разработка с AI', body: 'С помощью AI создаю: UX/UI, BRD, CR, Frontend, Backend.', icon: '🤖' },
      { title: 'Геймификация', body: 'Связываю механики с ключевыми метриками и целевыми действиями.', icon: '👾' },
    ],
    projectsTitle: 'Мои проекты', experienceTitle: 'Опыт в цифрах', servicesTitle: 'Что я делаю',
    recommendationsTitle: 'Рекомендации', contactsTitle: 'Контакты',
    designLink: 'К макетам', websiteLink: 'К веб-сайту', play: 'Нажать для игры',
    close: 'Закрыть', openExternal: 'Открыть отдельно', previous: 'Предыдущий проект', next: 'Следующий проект', projectLabel: 'Проект',
  },
  en: {
    name: 'Artem Chinkov',
    greeting: 'Hi, I’m',
    nav: ['About me', 'Experience in numbers', 'What I do', 'Projects', 'Recommendations', 'Contact'],
    contact: 'Get in touch',
    download: 'Download CV',
    copy: 'Copy email',
    copied: 'Copied!',
    copyError: 'Something went wrong. Please copy the address manually.',
    recommendationsLink: 'View recommendations',
    contactsDescription: 'You can get in touch with me here:',
    about: ['I combine product management, UX/UI, AI-assisted development, and game design. I have worked on mobile apps, educational products, and games at Sber, MTS, VK, and BCS.', 'I am a psychology graduate of Moscow State University. This background helps me account for user motivation.'],
    stats: [
      { title: '15% MAU · +10% top-ups · +3 pp Aha', body: 'Results at BCS: 15% of monthly active users engaged with gamification; the average top-up amount increased by 10% compared with the previous period; Aha conversion increased from 15% to 18%.', icon: 'bcs' },
      { title: '300K+ subscribers', body: 'Attracted by the MTS Progressors mobile plan + app.', icon: 'mts' },
      { title: '3M+ completions', body: 'For each of the two VK Digital Lesson learning simulators.', icon: 'vk' },
      { title: '8 game designers', body: 'The team I led at Sber.', icon: 'sber' },
    ],
    services: [
      { title: 'Product development', body: 'I research needs, define hypotheses and requirements, and develop MVPs, roadmaps, and backlogs. I support launches and analyse results.', icon: '💼' },
      { title: 'Product design', body: 'I design user journeys and responsive interfaces. I work with design systems, create prototypes, and refine UX based on feedback.', icon: '💻' },
      { title: 'Development with AI', body: 'I use AI to create UX/UI, business requirements documents, change requests, and frontend and backend implementations.', icon: '🤖' },
      { title: 'Gamification', body: 'I connect mechanics to key metrics and target user actions.', icon: '👾' },
    ],
    projectsTitle: 'My projects', experienceTitle: 'Experience in numbers', servicesTitle: 'What I do',
    recommendationsTitle: 'Recommendations', contactsTitle: 'Contact',
    designLink: 'View designs', websiteLink: 'Visit website', play: 'Click to play',
    close: 'Close', openExternal: 'Open separately', previous: 'Previous project', next: 'Next project', projectLabel: 'Project',
  },
};

export interface Project {
  id: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  company: 'bcs' | 'vk' | 'mts' | 'sber';
  video: string;
  href: string;
  game?: string;
}

export const projects: Project[] = [
  { id: 'yacht', title: { ru: 'Яхта', en: 'Yacht' }, description: { ru: 'Интерактив на инвестиционную тематику.', en: 'An investment-themed interactive experience.' }, company: 'bcs', video: '1_BCS_yacht.mp4', href: 'https://www.figma.com/design/n9uNFy5ZsO0IeFh0g4lEjI/%D0%9F%D0%BE%D1%80%D1%82%D1%84%D0%BE%D0%BB%D0%B8%D0%BE--%D0%91%D0%9A%D0%A1-?node-id=0-1', game: 'https://robotrek1000.github.io/Phaser_Build_2/' },
  { id: 'finwords', title: { ru: 'Финворды', en: 'Finwords' }, description: { ru: 'Интерактив на инвестиционную тематику.', en: 'An investment-themed interactive experience.' }, company: 'bcs', video: '2_BCS_finwords.mp4', href: 'https://www.figma.com/design/n9uNFy5ZsO0IeFh0g4lEjI/%D0%9F%D0%BE%D1%80%D1%82%D1%84%D0%BE%D0%BB%D0%B8%D0%BE--%D0%91%D0%9A%D0%A1-?node-id=1-11292', game: 'https://robotrek1000.github.io/Finwords/' },
  { id: 'store', title: { ru: 'Магазин приложений', en: 'App Store' }, description: { ru: 'Образовательный тренажёр.', en: 'An educational simulator.' }, company: 'vk', video: '3_VK_store.mp4', href: 'https://xn--h1adlhdnlo2c.xn--p1ai/lessons/store', game: 'https://store.datalesson.ru/app-senior/index.html?session_id' },
  { id: 'messenger', title: { ru: 'Мессенджеры', en: 'Messengers' }, description: { ru: 'Образовательный тренажёр.', en: 'An educational simulator.' }, company: 'vk', video: '4_VK_messenger.mp4', href: 'https://xn--h1adlhdnlo2c.xn--p1ai/lessons/messenger', game: 'https://messenger.datalesson.ru/senior/index.html?session_id' },
  { id: 'progressors', title: { ru: 'Прогрессоры', en: 'Progressors' }, description: { ru: 'Гео-приложение с тарифом и программой лояльности.', en: 'A location-based app with a mobile plan and loyalty programme.' }, company: 'mts', video: '5_MTS_progressors.mp4', href: 'https://progressors.ru/' },
  { id: 'vklad', title: { ru: 'Вклад', en: 'Vklad' }, description: { ru: 'Интерактив на инвестиционную тематику.', en: 'An investment-themed interactive experience.' }, company: 'sber', video: '6_SBER_vklad.mp4', href: 'https://fingame.vbudushee.ru/' },
];

export const email = 'artemartem86@mail.ru';
export const recommendationsUrl = 'https://drive.google.com/drive/folders/14A69UB_mIAChmjtHNVzPm3XFBqA-L3Z7?usp=sharing';
export const socials = [
  { id: 'telegram', label: 'Telegram', href: 'https://t.me/artem_chinkov', icon: 'contact_telegram.svg' },
  { id: 'max', label: 'MAX', href: 'https://max.ru/u/f9LHodD0cOKg-qsuooaS9rvNMhaSjP3EIOlnL_-ge3qNEGUWt_IKnww93to', icon: 'contact_max.svg' },
  { id: 'vk', label: 'VK', href: 'https://vk.com/magic_artem', icon: 'contact_vk.svg' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/artemchinkov', icon: 'contact_linkedin.svg' },
];
