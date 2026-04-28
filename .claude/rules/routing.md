# Роутинг и навигация — FG SEVER

## Как работает роутинг

State-based SPA. Без React Router. Весь роутинг — строка `currentPage` в `App.tsx`.

```tsx
const [currentPage, setCurrentPage] = useState<string>('home');

const navigate = (page: string) => {
  setCurrentPage(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

## Таблица страниц

| `currentPage` значение | Что рендерится |
|------------------------|----------------|
| `'home'` | Главная страница (inline в App.tsx) |
| `'mechanical-parts'` | CategoryPage с categoryId |
| `'car-electronics'` | CategoryPage с categoryId |
| `'interior'` | CategoryPage с categoryId |
| `'lights'` | CategoryPage с categoryId |
| `'audio-systems'` | CategoryPage с categoryId |
| `'body-parts'` | CategoryPage с categoryId |
| `'navigation-entertainment'` | CategoryPage с categoryId |
| `'suspension'` | CategoryPage с categoryId |
| `'brake-system'` | CategoryPage с categoryId |
| `'wheels-rims-tires'` | CategoryPage с categoryId |
| `'product-{id}'` | ProductPage с productId (число) |
| `'search-{query}'` | SearchPage ← создать |

## Как добавить новую страницу

В `App.tsx` найти блок с тернарными операторами и добавить условие:

```tsx
{currentPage.startsWith('search-') ? (
  <SearchPage query={currentPage.replace('search-', '')} onNavigate={navigate} />
) : currentPage.startsWith('product-') ? (
  <ProductPage productId={Number(currentPage.replace('product-', ''))} onNavigate={navigate} />
) : currentPage !== 'home' ? (
  <CategoryPage categoryId={currentPage} onNavigate={navigate} />
) : (
  <main>...главная...</main>
)}
```

## Передача navigate

Все страницы получают `onNavigate` как проп — не использовать window.location.href.

```tsx
interface PageProps {
  onNavigate: (page: string) => void;
}
```

## Глобальный стейт в App.tsx

Добавлять только то, что нужно нескольким страницам:
- `searchQuery` — строка поиска (шапка + SearchPage)
- `openOrderModal` — открыть модалку заявки (Phase 1)

Локальный стейт страниц — держать внутри самой страницы.
