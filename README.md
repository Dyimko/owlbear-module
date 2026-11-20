# My System — расширение для Owlbear Rodeo

## Первый запуск (локально)
1. Установи Node.js 22 LTS.
2. В папке проекта: `npm install`, затем `npm run dev`.
3. Owlbear → Профиль → **Add Extension** → `http://localhost:5173/manifest.json` (назови его «DEV»).
4. Открой комнату и включи расширение. Правки кода видны сразу.

## Выпуск на сайт (GitHub Pages)
1. Создай на GitHub репозиторий (например `owlbear-module`) и залей туда эту папку:
   ```
   git init && git add . && git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/ТВОЙ_НИК/owlbear-module.git
   git push -u origin main
   ```
2. На GitHub: Settings → Pages → Source: **GitHub Actions**.
3. После каждого push в `main` сайт обновляется сам (вкладка Actions).
4. Ссылка для себя и друзей: `https://ТВОЙ_НИК.github.io/owlbear-module/manifest.json` («PROD»).

Перед релизом поднимай `version` в `public/manifest.json`.

## Структура
| Файл | Что делает |
|---|---|
| `public/manifest.json` | Название, иконка, popover, фоновый скрипт |
| `src/main.ts` | Popover: кнопки d4/d12/d20 и общий лог бросков |
| `src/background.ts` | Контекстное меню токена: «Сделать персонажем», «Лист персонажа» |
| `src/sheet.ts` | Лист: стресс, раны по частям тела, проверки |
| `src/types.ts` | Модель данных персонажа (сюда добавлять атрибуты, инвентарь) |
| `src/constants.ts` | Префикс `com.my-system` для метаданных и каналов. Поменяй на свой |

Данные персонажа хранятся в метаданных токена, поэтому они синхронизируются у всех игроков и сохраняются вместе со сценой.
