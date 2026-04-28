import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

console.log('🔍 ЗАПУСК АНАЛИЗА РАСПРЕДЕЛЕНИЯ ПО КАТЕГОРИЯМ\n');

try {
  const productsContent = readFileSync(join(root, 'src', 'generated', 'products.json'), 'utf-8');
  const products = JSON.parse(productsContent);

  const stats = {};
  const unassignedExamples = []; // Товары, упавшие в механику по умолчанию
  let unassignedCount = 0;

  for (const p of products) {
    if (!stats[p.categoryId]) {
      stats[p.categoryId] = 0;
    }
    stats[p.categoryId]++;

    // Предполагаем, что mechanical-parts — это "общая корзина" по умолчанию. 
    // Соберем оттуда выборку, чтобы заказчик мог посмотреть, что не распозналось.
    if (p.categoryId === 'mechanical-parts') {
      unassignedCount++;
      // Сохраняем первые 50 примеров
      if (unassignedExamples.length < 50) {
        unassignedExamples.push(`- [${p.sku}] ${p.title}`);
      }
    }
  }

  console.log('📊 РАСПРЕДЕЛЕНИЕ ТОВАРОВ ПО КАТЕГОРИЯМ:');
  console.log('='.repeat(50));
  
  // Сортировка по убыванию количества
  const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  
  for (const [cat, count] of sortedStats) {
    const percentage = ((count / products.length) * 100).toFixed(1);
    console.log(`${cat.padEnd(30)} : ${String(count).padStart(4)} шт. (${percentage}%)`);
  }

  console.log('\n⚠️ ПОТЕНЦИАЛЬНО НЕРАСПОЗНАННЫЕ ТОВАРЫ (Mechanical Parts):');
  console.log(`Всего в этой категории: ${unassignedCount} шт. Примеры:`);
  console.log('-'.repeat(50));
  console.log(unassignedExamples.join('\n'));

  // Сохраняем сводку в файл для удобства
  const reportPath = join(root, 'scratch', 'category-report.txt');
  let reportText = 'РАСПРЕДЕЛЕНИЕ ТОВАРОВ ПО КАТЕГОРИЯМ\n========================\n';
  for (const [cat, count] of sortedStats) {
    reportText += `${cat}: ${count}\n`;
  }
  reportText += '\nПРИМЕРЫ ТОВАРОВ В ОБЩЕЙ КОРЗИНЕ (mechanical-parts):\n';
  reportText += unassignedExamples.join('\n');
  
  writeFileSync(reportPath, reportText);
  console.log(`\n✅ Полный отчет сохранен в: scratch/category-report.txt`);

} catch (e) {
  console.error('❌ Ошибка при анализе (возможно, нужно сначала запустить npm run convert):', e.message);
}
