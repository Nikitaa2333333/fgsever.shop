# Правила React — FG SEVER

## Роутинг

- **Только state-based**: `currentPage` string + `onNavigate(page: string)` в `App.tsx`
- Новые страницы добавлять как `case` в switch в `App.tsx`
- React Router — не добавлять

## Компоненты

- Только функциональные компоненты
- Пропсы описывать интерфейсами прямо над компонентом
- Страницы → `src/pages/`
- Переиспользуемые UI-компоненты → `src/components/`

## Состояние

- Только React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`)
- Глобальный стейт (searchQuery, orderModal) — в `App.tsx`, прокидывать пропсами
- Redux, Zustand, Context — не добавлять без явного запроса

## Стили

- Tailwind CSS utility-first
- Никакого CSS-in-JS (styled-components, emotion)
- Кастомные CSS-классы — только если Tailwind не справляется

## Хуки данных

- `useProducts(category?, sort?, query?)` — загрузка товаров
- `useGroups(categoryId)` — загрузка подкатегорий
- Данные приходят с `/api/*`, фоллбэк на `src/generated/catalog.json`
