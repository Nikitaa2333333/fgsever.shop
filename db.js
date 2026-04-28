import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'fgsever.sqlite');

const db = new Database(dbPath);

// Настройка для производительности
db.pragma('journal_mode = WAL'); // Быстрые параллельные чтение/запись
db.pragma('synchronous = NORMAL');

// Инициализация схемы
db.exec(`
  CREATE TABLE IF NOT EXISTS cars (
    id TEXT PRIMARY KEY,
    name TEXT,
    brand TEXT,
    model TEXT,
    year TEXT,
    body TEXT,
    engine TEXT,
    steeringWheel TEXT,
    transmission TEXT,
    transmissionModel TEXT,
    drive TEXT,
    trim TEXT,
    vin TEXT,
    description TEXT,
    video TEXT,
    mileage TEXT,
    color TEXT,
    price TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT,
    title TEXT,
    donorId TEXT,
    brand TEXT,
    model TEXT,
    year TEXT,
    body TEXT,
    engine TEXT,
    positionRaw_fb TEXT,
    positionRaw_lr TEXT,
    positionRaw_ud TEXT,
    position TEXT,
    color TEXT,
    oem TEXT,
    crossNumbers TEXT, -- JSON
    manufacturer TEXT,
    description TEXT,
    photos TEXT, -- JSON
    imageUrl TEXT,
    conditionRaw TEXT,
    condition TEXT,
    isNew BOOLEAN,
    price REAL,
    priceFormatted TEXT,
    warehouse TEXT,
    outOfStock BOOLEAN,
    categoryId TEXT,
    subCategory TEXT
  );
  
  -- Индексы для быстрого поиска и фильтрации
  CREATE INDEX IF NOT EXISTS idx_category ON products(categoryId);
  CREATE INDEX IF NOT EXISTS idx_outOfStock ON products(outOfStock);
  CREATE INDEX IF NOT EXISTS idx_donor ON products(donorId);
`);

export default db;
