import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';

const db = new Database('fgsever.sqlite');
const rows = db.prepare('SELECT title, categoryId, subCategory, price, sku FROM products ORDER BY categoryId, title').all();
db.close();

const CATEGORY_MAP = [
  { id: 'mechanical-parts',         label: 'Механика' },
  { id: 'car-electronics',          label: 'Электроника' },
  { id: 'interior',                 label: 'Интерьер' },
  { id: 'lights',                   label: 'Освещение' },
  { id: 'audio-systems',            label: 'Аудио' },
  { id: 'body-parts',               label: 'Кузов' },
  { id: 'navigation-entertainment', label: 'Мультимедиа' },
  { id: 'suspension',               label: 'Подвеска' },
  { id: 'brake-system',             label: 'Тормоза' },
  { id: 'wheels-rims-tires',        label: 'Диски/шины' },
];

const KEYWORDS_MAP = [
  { id: 'mechanical-parts',         keywords: ['двигател','генератор','стартер','турбо','компрессор','коробка','кпп','радиатор','патрубок','охладитель','катализатор','фильтр','webasto','помпа','маслян'] },
  { id: 'car-electronics',          keywords: ['блок управления','аккумулятор','датчик','модуль','проводка','лямбда','антенна','реле','kafas','mulf','combox','видеомодул','камер','переключател'] },
  { id: 'interior',                 keywords: ['подушка безопасности','приборн','руль','консоль','зеркало внутренн','сиден','дверн карт','потолок','подлокотник','ковёр','коврик','декоративн','беспроводн','климат','usb','aux','проекц'] },
  { id: 'lights',                   keywords: ['фара','фонарь','противотуманн','освещен','поворотник','стоп-сигнал'] },
  { id: 'audio-systems',            keywords: ['динамик','усилитель','аудио','радио','колонк','сабвуф','чейнджер'] },
  { id: 'body-parts',               keywords: ['крыло','дверь','капот','бампер','крышка багажник','зеркало','решетка','порог','багажник','рейлинг','фаркоп','выхлоп','эмблема','ручка'] },
  { id: 'navigation-entertainment', keywords: ['дисплей','навигац','мультимедиа','джойстик','головное','монитор'] },
  { id: 'suspension',               keywords: ['амортизатор','рычаг','стабилизатор','подрамник','ступиц','привод','редуктор','рулевая рейка','вал'] },
  { id: 'brake-system',             keywords: ['тормоз','суппорт','колодк','диск тормоз','abs','трубк'] },
  { id: 'wheels-rims-tires',        keywords: ['диск','шина','колесо','резина'] },
];

// Известные проблемные паттерны
const PROBLEMS = [
  { pattern: /усилитель/i,        wrongCat: 'audio-systems',  reason: 'Усилитель тормозов/бампера → не аудио' },
  { pattern: /рулев.{0,5}колонк/i, wrongCat: 'audio-systems', reason: 'Рулевая колонка → не аудио' },
  { pattern: /колонк.{0,10}рул/i,  wrongCat: 'audio-systems', reason: 'Рулевая колонка → не аудио' },
  { pattern: /амортизатор.{0,10}(капот|багажник|крышк)/i, wrongCat: 'suspension', reason: 'Амортизатор капота/багажника → не подвеска' },
  { pattern: /(капот|багажник).{0,10}амортизатор/i,        wrongCat: 'suspension', reason: 'Амортизатор капота/багажника → не подвеска' },
  { pattern: /привод.{0,10}(зеркал|двер|замк)/i,           wrongCat: 'suspension', reason: 'Привод зеркала/двери → не подвеска' },
  { pattern: /(зеркал|двер).{0,10}привод/i,                wrongCat: 'suspension', reason: 'Привод зеркала/двери → не подвеска' },
  { pattern: /трубк.{0,10}(кондиц|топлив|масл|охлад)/i,   wrongCat: 'brake-system', reason: 'Трубка кондиционера/топлива → не тормоза' },
  { pattern: /(кондиц|топлив|масл|охлад).{0,10}трубк/i,   wrongCat: 'brake-system', reason: 'Трубка кондиционера/топлива → не тормоза' },
  { pattern: /развальн/i,         wrongCat: 'suspension',    reason: 'Рычаг развальный — возможно, ок' },
  { pattern: /декоративн.{0,15}двигател/i, wrongCat: 'interior', reason: 'Декоративная крышка двигателя → не интерьер' },
];

function findTrigger(title) {
  const lower = title.toLowerCase();
  for (const cat of KEYWORDS_MAP) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) return { catId: cat.id, keyword: kw };
    }
  }
  return { catId: 'mechanical-parts', keyword: '(фоллбэк)' };
}

function findProblem(title, categoryId) {
  for (const p of PROBLEMS) {
    if (p.wrongCat === categoryId && p.pattern.test(title)) {
      return p.reason;
    }
  }
  return null;
}

const catLabel = Object.fromEntries(CATEGORY_MAP.map(c => [c.id, c.label]));

// Собираем данные
const data = rows.map(r => {
  const { catId, keyword } = findTrigger(r.title);
  const problem = findProblem(r.title, r.categoryId);
  return {
    title: r.title,
    sku: r.sku,
    categoryId: r.categoryId,
    categoryLabel: catLabel[r.categoryId] || r.categoryId,
    subCategory: r.subCategory || '',
    keyword,
    problem,
    price: r.price,
  };
});

const stats = {};
CATEGORY_MAP.forEach(c => { stats[c.id] = { total: 0, problems: 0 }; });
data.forEach(d => {
  if (!stats[d.categoryId]) stats[d.categoryId] = { total: 0, problems: 0 };
  stats[d.categoryId].total++;
  if (d.problem) stats[d.categoryId].problems++;
});

const problemCount = data.filter(d => d.problem).length;

const rowsHtml = data.map((d, i) => {
  const rowClass = d.problem ? 'problem-row' : '';
  const problemBadge = d.problem
    ? `<span class="problem-badge" title="${d.problem}">⚠ ${d.problem}</span>`
    : '';
  const kwBadge = d.keyword === '(фоллбэк)'
    ? `<span class="kw-fallback">${d.keyword}</span>`
    : `<span class="kw-badge">${d.keyword}</span>`;
  return `<tr class="${rowClass}" data-cat="${d.categoryId}" data-problem="${d.problem ? '1' : '0'}">
    <td class="td-num">${i + 1}</td>
    <td class="td-title">${escHtml(d.title)}<br><small class="sku">${escHtml(d.sku)}</small></td>
    <td class="td-cat"><span class="cat-badge cat-${d.categoryId}">${d.categoryLabel}</span></td>
    <td class="td-sub">${escHtml(d.subCategory)}</td>
    <td class="td-kw">${kwBadge}</td>
    <td class="td-problem">${problemBadge}</td>
    <td class="td-price">${d.price > 0 ? d.price.toLocaleString('ru-RU') + ' ₽' : '—'}</td>
  </tr>`;
}).join('\n');

const statsHtml = CATEGORY_MAP.map(c => {
  const s = stats[c.id] || { total: 0, problems: 0 };
  return `<div class="stat-card cat-card-${c.id}" onclick="filterCat('${c.id}')">
    <div class="stat-label">${c.label}</div>
    <div class="stat-num">${s.total}</div>
    ${s.problems > 0 ? `<div class="stat-problems">⚠ ${s.problems} проблем</div>` : ''}
  </div>`;
}).join('\n');

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Аудит каталога FG SEVER — ${rows.length} товаров</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f6fa; color: #222; font-size: 13px; }

  .header { background: #1a1a2e; color: white; padding: 20px 24px; }
  .header h1 { font-size: 20px; font-weight: 700; }
  .header p { margin-top: 4px; color: #aaa; font-size: 13px; }

  .stats { display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 24px; background: #fff; border-bottom: 1px solid #e0e0e0; }
  .stat-card { padding: 10px 16px; border-radius: 8px; cursor: pointer; background: #f0f0f0; border: 2px solid transparent; min-width: 110px; transition: all .15s; }
  .stat-card:hover { border-color: #0066cc; }
  .stat-card.active { border-color: #0066cc; background: #e8f0fe; }
  .stat-label { font-size: 11px; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
  .stat-num { font-size: 22px; font-weight: 700; margin-top: 2px; }
  .stat-problems { font-size: 11px; color: #c0392b; margin-top: 2px; font-weight: 600; }

  .toolbar { display: flex; gap: 10px; align-items: center; padding: 12px 24px; background: #fff; border-bottom: 1px solid #e0e0e0; flex-wrap: wrap; }
  .toolbar input { flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
  .toolbar select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
  .btn { padding: 8px 14px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
  .btn:hover { background: #f0f0f0; }
  .btn.active { background: #c0392b; color: white; border-color: #c0392b; }
  .count-badge { background: #eee; border-radius: 12px; padding: 2px 10px; font-size: 12px; color: #555; }

  .table-wrap { overflow-x: auto; padding: 0 24px 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; }
  td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f8f9ff; }

  .problem-row td { background: #fff8f8; }
  .problem-row:hover td { background: #ffefef; }

  .td-num { color: #aaa; font-size: 11px; width: 40px; }
  .td-title { max-width: 320px; font-weight: 500; }
  .sku { color: #aaa; font-size: 11px; font-weight: 400; }
  .td-cat { white-space: nowrap; }
  .td-sub { color: #555; font-size: 12px; max-width: 160px; }
  .td-kw { white-space: nowrap; }
  .td-problem { max-width: 240px; }
  .td-price { white-space: nowrap; text-align: right; color: #27ae60; font-weight: 600; }

  .cat-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
  .kw-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #e8f4fd; color: #1a6b9a; font-family: monospace; }
  .kw-fallback { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #fdecea; color: #c0392b; font-family: monospace; }
  .problem-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; background: #fdecea; color: #c0392b; font-weight: 600; line-height: 1.4; }

  .cat-mechanical-parts { background: #e3f2fd; color: #0d47a1; }
  .cat-car-electronics { background: #e8f5e9; color: #1b5e20; }
  .cat-interior { background: #fce4ec; color: #880e4f; }
  .cat-lights { background: #fff8e1; color: #e65100; }
  .cat-audio-systems { background: #f3e5f5; color: #4a148c; }
  .cat-body-parts { background: #e0f2f1; color: #004d40; }
  .cat-navigation-entertainment { background: #e8eaf6; color: #1a237e; }
  .cat-suspension { background: #fff3e0; color: #bf360c; }
  .cat-brake-system { background: #fbe9e7; color: #bf360c; }
  .cat-wheels-rims-tires { background: #f5f5f5; color: #212121; }

  .hidden { display: none; }
</style>
</head>
<body>

<div class="header">
  <h1>Аудит каталога FG SEVER</h1>
  <p>${rows.length} товаров · Сгенерировано ${new Date().toLocaleString('ru-RU')} · <span style="color:#e74c3c">⚠ ${problemCount} проблемных</span></p>
</div>

<div class="stats" id="stats">
  <div class="stat-card" onclick="filterCat('')" id="stat-all">
    <div class="stat-label">Все</div>
    <div class="stat-num">${rows.length}</div>
    ${problemCount > 0 ? `<div class="stat-problems">⚠ ${problemCount} проблем</div>` : ''}
  </div>
  ${statsHtml}
</div>

<div class="toolbar">
  <input type="text" id="search" placeholder="Поиск по названию или артикулу..." oninput="applyFilters()">
  <button class="btn" id="btn-problems" onclick="toggleProblems()">⚠ Только проблемные</button>
  <button class="btn" onclick="filterCat(''); document.getElementById('search').value=''; showProblemsOnly=false; document.getElementById('btn-problems').classList.remove('active'); applyFilters()">Сбросить</button>
  <span class="count-badge" id="visible-count">${rows.length} строк</span>
</div>

<div class="table-wrap">
<table id="main-table">
  <thead>
    <tr>
      <th>#</th>
      <th>Наименование / Артикул</th>
      <th>Категория</th>
      <th>Подкатегория</th>
      <th>Ключевое слово</th>
      <th>Проблема</th>
      <th>Цена</th>
    </tr>
  </thead>
  <tbody id="tbody">
    ${rowsHtml}
  </tbody>
</table>
</div>

<script>
let activeCat = '';
let showProblemsOnly = false;

function filterCat(cat) {
  activeCat = cat;
  document.querySelectorAll('.stat-card').forEach(el => el.classList.remove('active'));
  const target = cat ? document.querySelector('[onclick="filterCat(\\''+cat+'\\')"]') : document.getElementById('stat-all');
  if (target) target.classList.add('active');
  applyFilters();
}

function toggleProblems() {
  showProblemsOnly = !showProblemsOnly;
  document.getElementById('btn-problems').classList.toggle('active', showProblemsOnly);
  applyFilters();
}

function applyFilters() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const rows = document.querySelectorAll('#tbody tr');
  let visible = 0;
  rows.forEach(row => {
    const cat = row.dataset.cat;
    const isProblem = row.dataset.problem === '1';
    const text = row.textContent.toLowerCase();

    const catOk = !activeCat || cat === activeCat;
    const problemOk = !showProblemsOnly || isProblem;
    const searchOk = !q || text.includes(q);

    if (catOk && problemOk && searchOk) {
      row.classList.remove('hidden');
      visible++;
    } else {
      row.classList.add('hidden');
    }
  });
  document.getElementById('visible-count').textContent = visible + ' строк';
}

document.getElementById('stat-all').classList.add('active');
</script>
</body>
</html>`;

writeFileSync('catalog-audit.html', html, 'utf8');
console.log('Готово: catalog-audit.html');
console.log('Товаров:', rows.length);
console.log('Проблемных:', problemCount);
