# Портфолио Артёма Чинкова

Адаптивное портфолио на React, TypeScript и Vite. Восемь страниц имеют собственный готовый HTML, метаданные и PNG-превью для мессенджеров.

## Разработка

Нужен Node.js 22.12 или новее. В Windows PowerShell при ограничении запуска сценариев используйте `npm.cmd` вместо `npm`.

```sh
npm ci
npm run dev
npm run build
npm run preview
npx playwright install chromium
npm test
```

Сайт размещается под `/portfolio/`. Адреса: `/portfolio/{ru|en}/{manager|designer|engineer|gamification}/`. Корень переводит на `/portfolio/ru/manager/`. Переключатель языка сохраняет профессию и секцию. Русские PDF резюме доступны на обоих языках, каждый соответствует своей профессии.

Контент находится в `src/content.ts`, локальные материалы — в `public`. Сборка публикует только `dist`: исходные задания, инструкции и ссылки из корня не попадают на сайт. `scripts/build-pages.tsx` создаёт HTML страниц, карту сайта и PNG-превью. Основной шрифт Nunito загружается локально.

## GitHub Pages

Репозиторий: `artem-chinkov/portfolio`. В Settings → Pages выберите Source: GitHub Actions. Workflow проверяет типы, собирает сайт и запускает браузерные тесты; успешная сборка ветки `main` публикуется по адресу https://artem-chinkov.github.io/portfolio/. Pull request проходит те же проверки без публикации. Можно запустить workflow вручную для ветки `main`.

Для изменения адреса публикации нужно согласованно изменить `base` в конфигурации Vite, константы адреса в генераторе страниц и маршрутизацию приложения.
