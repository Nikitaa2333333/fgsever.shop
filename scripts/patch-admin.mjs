import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync('server.js', 'utf8');
const lines = src.split('\n');

const apiStart  = lines.findIndex(l => l.includes('// --- API routes ---'));
const serveStart = lines.findIndex(l => l.includes('// --- Serve built React app ---'));

const before = lines.slice(0, apiStart).join('\n');
const after  = lines.slice(serveStart).join('\n');

const middle = `
// --- API routes ---
app.use(express.json());

// --- Аудит категорий ---
app.get('/admin', (req, res) => {
  const { cat = '', q = '', prob = '', page = '1' } = req.query;
  const PAGE_SIZE = 100;

  const CATS = [
    { id: 'mechanical-parts',         label: 'Механика',    color: '#1565c0' },
    { id: 'car-electronics',          label: 'Электроника', color: '#2e7d32' },
    { id: 'interior',                 label: 'Интерьер',    color: '#880e4f' },
    { id: 'lights',                   label: 'Освещение',   color: '#e65100' },
    { id: 'audio-systems',            label: 'Аудио',       color: '#6a1b9a' },
    { id: 'body-parts',               label: 'Кузов',       color: '#00695c' },
    { id: 'navigation-entertainment', label: 'Мультимедиа', color: '#283593' },
    { id: 'suspension',               label: 'Подвеска',    color: '#bf360c' },
    { id: 'brake-system',             label: 'Тормоза',     color: '#b71c1c' },
    { id: 'wheels-rims-tires',        label: 'Диски/шины',  color: '#424242' },
  ];
  const KW_MAP = [
    { id: 'mechanical-parts',         kws: ['двигател','генератор','стартер','турбо','компрессор','коробка','кпп','радиатор','патрубок','охладитель','катализатор','фильтр','webasto','помпа','маслян'] },
    { id: 'car-electronics',          kws: ['блок управления','аккумулятор','датчик','модуль','проводка','лямбда','антенна','реле','kafas','mulf','combox','видеомодул','камер','переключател'] },
    { id: 'interior',                 kws: ['подушка безопасности','приборн','руль','консоль','зеркало внутренн','сиден','дверн карт','потолок','подлокотник','ковёр','коврик','декоративн','беспроводн','климат','usb','aux','проекц'] },
    { id: 'lights',                   kws: ['фара','фонарь','противотуманн','освещен','поворотник','стоп-сигнал'] },
    { id: 'audio-systems',            kws: ['динамик','усилитель','аудио','радио','колонк','сабвуф','чейнджер'] },
    { id: 'body-parts',               kws: ['крыло','дверь','капот','бампер','крышка багажник','зеркало','решетка','порог','багажник','рейлинг','фаркоп','выхлоп','эмблема','ручка'] },
    { id: 'navigation-entertainment', kws: ['дисплей','навигац','мультимедиа','джойстик','головное','монитор'] },
    { id: 'suspension',               kws: ['амортизатор','рычаг','стабилизатор','подрамник','ступиц','привод','редуктор','рулевая рейка','вал'] },
    { id: 'brake-system',             kws: ['тормоз','суппорт','колодк','диск тормоз','abs','трубк'] },
    { id: 'wheels-rims-tires',        kws: ['диск','шина','колесо','резина'] },
  ];
  const PROBS = [
    { pattern: /усилитель/i,                                                                         wrongCat: 'audio-systems', why: 'Усилитель тормозов/бампера — не аудио' },
    { pattern: /рулев.{0,5}колонк|колонк.{0,10}рул/i,                                               wrongCat: 'audio-systems', why: 'Рулевая колонка — не аудио' },
    { pattern: /амортизатор.{0,15}(капот|багажник)|((капот|багажник).{0,15}амортизатор)/i,          wrongCat: 'suspension',    why: 'Амортизатор капота/багажника — не подвеска' },
    { pattern: /привод.{0,10}(зеркал|двер|замк)|((зеркал|двер).{0,10}привод)/i,                    wrongCat: 'suspension',    why: 'Привод зеркала/двери — не подвеска' },
    { pattern: /трубк.{0,10}(кондиц|топлив|масл|охлад)|((кондиц|топлив|масл|охлад).{0,10}трубк)/i,wrongCat: 'brake-system',  why: 'Трубка кондиционера/масла — не тормоза' },
    { pattern: /развальн/i,                                                                          wrongCat: 'suspension',    why: 'Рычаг развальный — проверь' },
  ];

  function findTrigger(title) {
    const lower = title.toLowerCase();
    for (const c of KW_MAP) for (const kw of c.kws) if (lower.includes(kw)) return kw;
    return '';
  }
  function findProblem(title, catId) {
    for (const p of PROBS) if (p.wrongCat === catId && p.pattern.test(title)) return p.why;
    return '';
  }
  function e(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  const all = db.prepare('SELECT title, sku, categoryId, subCategory, price FROM products ORDER BY categoryId, title').all()
    .map(r => ({ ...r, trigger: findTrigger(r.title), problem: findProblem(r.title, r.categoryId) }));

  // Статистика
  const stats = {};
  CATS.forEach(c => { stats[c.id] = { total: 0, problems: 0 }; });
  all.forEach(r => {
    if (!stats[r.categoryId]) stats[r.categoryId] = { total: 0, problems: 0 };
    stats[r.categoryId].total++;
    if (r.problem) stats[r.categoryId].problems++;
  });
  const totalProblems = all.filter(r => r.problem).length;

  // Частота ключевых слов
  const kwFreq = {};
  KW_MAP.forEach(c => c.kws.forEach(kw => { kwFreq[kw] = 0; }));
  all.forEach(r => { if (r.trigger) kwFreq[r.trigger] = (kwFreq[r.trigger]||0) + 1; });

  // Фильтрация
  let filtered = all;
  if (cat)          filtered = filtered.filter(r => r.categoryId === cat);
  if (q)            filtered = filtered.filter(r => r.title.toLowerCase().includes(q.toLowerCase()) || r.sku.toLowerCase().includes(q.toLowerCase()));
  if (prob === '1') filtered = filtered.filter(r => r.problem);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const curPage = Math.min(Math.max(1, parseInt(page)), pages);
  const pageRows = filtered.slice((curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE);

  const catColor = Object.fromEntries(CATS.map(c => [c.id, c.color]));
  const catLabel = Object.fromEntries(CATS.map(c => [c.id, c.label]));

  const statsCards = CATS.map(c => {
    const s = stats[c.id];
    const active = c.id === cat ? ' active' : '';
    return '<a class="sc' + active + '" href="?cat=' + c.id + '&q=' + encodeURIComponent(q) + '&prob=' + prob + '" style="border-left:4px solid ' + c.color + '">'
      + '<div class="sc-label">' + c.label + '</div>'
      + '<div class="sc-num" style="color:' + c.color + '">' + s.total + '</div>'
      + (s.problems ? '<div class="sc-prob">⚠ ' + s.problems + '</div>' : '<div class="sc-ok">✓ ок</div>')
      + '</a>';
  }).join('');

  const kwRows = KW_MAP.map(c => {
    const kws = c.kws.map(kw => {
      const cnt = kwFreq[kw]||0;
      return '<span class="' + (cnt===0?'kz':'ko') + '" title="' + cnt + ' товаров">' + e(kw) + ' <b>' + cnt + '</b></span>';
    }).join('');
    return '<tr><td class="kc" style="color:' + catColor[c.id] + '">' + catLabel[c.id] + '</td><td>' + kws + '</td></tr>';
  }).join('');

  const tableRows = pageRows.map((r, i) => {
    const color = catColor[r.categoryId] || '#999';
    const label = catLabel[r.categoryId] || r.categoryId;
    const rowCls = r.problem ? ' class="pr"' : '';
    const kw = r.trigger ? '<span class="kt">' + e(r.trigger) + '</span>' : '<span class="kf">фоллбэк</span>';
    return '<tr' + rowCls + '>'
      + '<td class="tn">' + ((curPage-1)*PAGE_SIZE+i+1) + '</td>'
      + '<td class="tt"><span class="tit">' + e(r.title) + '</span><br><span class="sku">' + e(r.sku) + '</span></td>'
      + '<td><span class="cb" style="background:' + color + '20;color:' + color + ';border:1px solid ' + color + '40">' + label + '</span></td>'
      + '<td class="ts">' + e(r.subCategory) + '</td>'
      + '<td>' + kw + '</td>'
      + '<td class="tp">' + e(r.problem) + '</td>'
      + '<td class="tpr">' + (r.price>0?r.price.toLocaleString('ru-RU')+' ₽':'—') + '</td>'
      + '</tr>';
  }).join('');

  function pgLink(p, label, disabled) {
    if (disabled) return '<span class="pg-dis">' + label + '</span>';
    return '<a class="pg-btn" href="?cat=' + encodeURIComponent(cat) + '&q=' + encodeURIComponent(q) + '&prob=' + prob + '&page=' + p + '">' + label + '</a>';
  }
  const pager = pages <= 1 ? '' : '<div class="pager">'
    + pgLink(1, '«', curPage===1)
    + pgLink(curPage-1, '‹ Пред.', curPage===1)
    + '<span class="pg-info">Стр. ' + curPage + ' из ' + pages + ' · ' + total + ' строк</span>'
    + pgLink(curPage+1, 'След. ›', curPage===pages)
    + pgLink(pages, '»', curPage===pages)
    + '</div>';

  const css = \`*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f5f7;color:#1e293b;font-size:13px}
a{text-decoration:none;color:inherit}
.hdr{background:#0f172a;color:#fff;padding:14px 24px;display:flex;align-items:center;gap:12px}
.hdr h1{font-size:16px;font-weight:700}.hdr-sub{color:#94a3b8;font-size:12px;margin-top:2px}
.badge{background:#ef4444;color:#fff;border-radius:20px;padding:3px 11px;font-size:12px;font-weight:700;margin-left:auto}
.stats{display:flex;gap:7px;flex-wrap:wrap;padding:10px 24px;background:#fff;border-bottom:1px solid #e2e8f0}
.sc-all{padding:8px 12px;border-radius:8px;background:#f8fafc;border:2px solid transparent;min-width:70px}
.sc-all.active,.sc-all:hover{border-color:#0066cc;background:#eff6ff}
.sc{display:block;padding:8px 12px;border-radius:8px;background:#f8fafc;border:2px solid transparent;min-width:90px}
.sc.active,.sc:hover{border-color:#0066cc;background:#eff6ff}
.sc-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b}
.sc-num{font-size:20px;font-weight:800;line-height:1.2;margin-top:2px}
.sc-prob{font-size:11px;color:#ef4444;font-weight:600;margin-top:2px}
.sc-ok{font-size:11px;color:#22c55e;margin-top:2px}
.kw{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 24px}
.kw h2{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.kwt{width:100%;border-collapse:collapse}
.kwt td{padding:3px 8px;vertical-align:top;border-bottom:1px solid #f1f5f9}
.kc{font-weight:700;font-size:12px;white-space:nowrap;width:110px}
.ko{display:inline-block;margin:2px;padding:2px 7px;border-radius:10px;font-size:11px;font-family:monospace;background:#dbeafe;color:#1e40af}
.kz{display:inline-block;margin:2px;padding:2px 7px;border-radius:10px;font-size:11px;font-family:monospace;background:#fee2e2;color:#991b1b;text-decoration:line-through;opacity:.6}
.ko b,.kz b{font-weight:700;margin-left:2px}
.toolbar{display:flex;gap:8px;align-items:center;padding:9px 24px;background:#fff;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;position:sticky;top:0;z-index:10;box-shadow:0 2px 4px rgba(0,0,0,.05)}
.toolbar input{flex:1;min-width:180px;padding:7px 11px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none}
.toolbar input:focus{border-color:#0066cc}
.tbtn{padding:6px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:#475569;white-space:nowrap}
.tbtn:hover{background:#f1f5f9}.tbtn.on{background:#ef4444;color:#fff;border-color:#ef4444}
.cnt{background:#e2e8f0;border-radius:10px;padding:2px 10px;font-size:12px;color:#64748b;white-space:nowrap}
.tw{overflow-x:auto;padding:14px 24px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.07)}
th{background:#0f172a;color:#94a3b8;padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8fafc}
tr.pr td{background:#fff5f5}
tr.pr:hover td{background:#fee2e2}
.tn{color:#94a3b8;font-size:11px;text-align:right;width:36px}
.tt{max-width:280px}.tit{font-weight:500;line-height:1.4}.sku{color:#94a3b8;font-size:11px}
.cb{display:inline-block;padding:2px 9px;border-radius:18px;font-size:11px;font-weight:700}
.ts{color:#64748b;font-size:12px;max-width:150px}
.kt{display:inline-block;padding:2px 7px;border-radius:10px;font-size:11px;background:#dbeafe;color:#1e40af;font-family:monospace}
.kf{display:inline-block;padding:2px 7px;border-radius:10px;font-size:11px;background:#fef3c7;color:#92400e;font-family:monospace}
.tp{color:#dc2626;font-size:11px;font-weight:600;max-width:200px}
.tpr{white-space:nowrap;text-align:right;color:#16a34a;font-weight:600}
.pager{display:flex;gap:8px;align-items:center;justify-content:center;padding:16px 24px}
.pg-btn{padding:6px 14px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:12px;font-weight:600;color:#475569}
.pg-btn:hover{background:#f1f5f9}
.pg-dis{padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;font-size:12px;color:#94a3b8}
.pg-info{font-size:13px;color:#64748b;padding:0 8px}\`;

  res.send('<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Аудит — FG SEVER</title><style>' + css + '</style></head><body>'
    + '<div class="hdr"><div><h1>Аудит категорий — FG SEVER</h1><div class="hdr-sub">' + all.length + ' товаров</div></div><div class="badge">⚠ ' + totalProblems + ' проблемных</div></div>'
    + '<div class="stats"><a class="sc-all' + (!cat?' active':'') + '" href="?q=' + encodeURIComponent(q) + '&prob=' + prob + '" style="border-left:4px solid #0f172a"><div class="sc-label">Все</div><div class="sc-num" style="color:#0f172a">' + all.length + '</div>' + (totalProblems?'<div class="sc-prob">⚠ '+totalProblems+'</div>':'') + '</a>' + statsCards + '</div>'
    + '<div class="kw"><h2>Ключевые слова</h2><table class="kwt"><tbody>' + kwRows + '</tbody></table></div>'
    + '<div class="toolbar"><form method="get"><input type="hidden" name="cat" value="' + e(cat) + '"><input type="text" name="q" value="' + e(q) + '" placeholder="Поиск по названию или артикулу..."><button type="submit" class="tbtn">Найти</button><button type="submit" name="prob" value="' + (prob==='1'?'':'1') + '" class="tbtn' + (prob==='1'?' on':'') + '">⚠ Проблемные</button><a class="tbtn" href="/admin">Сбросить</a><span class="cnt">' + total + ' строк</span></form></div>'
    + '<div class="tw"><table><thead><tr><th>#</th><th>Наименование / Артикул</th><th>Категория</th><th>Подкатегория</th><th>Ключ. слово</th><th>Проблема</th><th>Цена</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>'
    + pager
    + '</body></html>');
});
`;

writeFileSync('server.js', before + '\n' + middle + '\n' + after, 'utf8');
console.log('Готово. Строк:', (before + middle + after).split('\n').length);
