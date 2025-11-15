import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import requestIp from 'request-ip';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';


const { Pool } = pkg;

// =============================================
// ПРОСТОЙ КЭШ БЕЗ ДОПОЛНИТЕЛЬНЫХ ЗАВИСИМОСТЕЙ
// =============================================

class SimpleCache {
  constructor() {
    this.data = new Map();
  }
  
  set(key, value, ttl = 10000) {
    this.data.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }
  
  get(key) {
    const item = this.data.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.data.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.data.clear();
  }
}

const cache = new SimpleCache();

// =============================================
// КОНСТАНТЫ И НАСТРОЙКИ
// =============================================

const PORT = process.env.PORT || 3000;
// В бэкенде (server.js) обнови CORS:
const CORS_ORIGINS = [
  'https://frommetro.vercel.app',
  'https://your-app-name.vercel.app', // твой новый домен
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'https://vk.com',
  'https://vk.ru',
  'https://*.vk.com',
  'https://*.vk.ru',
  'https://*.vk-apps.com',
  '*'
];

const USER_COLORS = [
  '#dc3545', '#007bff', '#28a745', '#ffc107', 
  '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'
];

// =============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =============================================

const app = express();

// =============================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
// =============================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Обработчик ошибок пула соединений
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
});

// =============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

/**
 * Генерирует случайный цвет из предопределенного списка
 */
function getRandomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

/**
 * Генерирует уникальный ID сессии на основе IP и User-Agent
 */
function generateSessionId(req) {
  const ip = req.clientIp || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const timestamp = Date.now().toString();
  return Buffer.from(`${ip}-${userAgent}-${timestamp}`).toString('base64').slice(0, 32);
}

/**
 * Обертка для обработки ошибок в async функциях
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// =============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ
// =============================================

/**
 * Проверяет наличие обязательных переменных окружения
 */
function checkEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Отсутствуют обязательные переменные окружения:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Все переменные окружения настроены');
}

/**
 * Проверяет подключение к базе данных
 */
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ База данных подключена успешно');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    return false;
  }
}

/**
 * Проверяет существующие сессии для предотвращения дублирования
 */
async function checkExistingSessions(client, clientIp, userAgent, sessionId) {
  try {
    const existingSessions = await client.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE ip_address = $1 AND online = true 
       AND last_activity > NOW() - INTERVAL '10 minutes'
       AND station IS NOT NULL`,
      [clientIp]
    );
    
    const sessionCount = parseInt(existingSessions.rows[0].count);
    
    if (sessionCount >= 1000) {
      return {
        allowed: false,
        reason: 'С одного IP-адреса разрешено не более 20 активных сессий одновременно.'
      };
    }
    
    const exactMatch = await client.query(
      `SELECT id FROM users 
       WHERE ip_address = $1 AND user_agent = $2 AND online = true 
       AND last_activity > NOW() - INTERVAL '1 second'`,
      [clientIp, userAgent]
    );
    
    if (exactMatch.rows.length > 0) {
      return {
        allowed: false,
        reason: 'У вас уже есть активная сессия в этом браузере. Закройте предыдущую вкладку или подождите несколько минут.'
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('❌ Ошибка проверки сессий:', error);
    return { allowed: true };
  }
}

/**
 * Выполняет миграцию базы данных - добавляет новые поля и таблицы
 */
async function migrateDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Запуск миграции базы данных...');
    
    // Добавление новых колонок в таблицу users
    const alterQueries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address INET`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mood VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS user_agent TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_id VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_waiting BOOLEAN DEFAULT true`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS timer_end TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS show_timer BOOLEAN DEFAULT false`
    ];

    for (const query of alterQueries) {
      try {
        await client.query(query);
        console.log(`✅ Выполнен: ${query.split('ADD COLUMN IF NOT EXISTS')[1]}`);
      } catch (error) {
        console.warn(`⚠️ Предупреждение при выполнении миграции:`, error.message);
      }
    }

    // Создание таблиц для комнат
    const createTables = [
      `CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        host_user_id INTEGER,
        host_user_name VARCHAR(255),
        station VARCHAR(255),
        wagon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS room_users (
        id SERIAL PRIMARY KEY,
        room_id INTEGER,
        user_id INTEGER,
        user_name VARCHAR(255),
        user_station VARCHAR(255),
        user_wagon VARCHAR(50),
        user_color VARCHAR(100),
        user_color_code VARCHAR(7),
        user_position VARCHAR(100),
        user_mood VARCHAR(100),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const query of createTables) {
      await client.query(query);
    }

    await client.query('COMMIT');
    console.log('✅ Миграция базы данных завершена успешно');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка миграции базы данных:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Инициализирует базу данных - создает таблицы и выполняет миграции
 */
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        station VARCHAR(255) NOT NULL,
        wagon VARCHAR(50),
        color VARCHAR(100),
        color_code VARCHAR(7),
        status VARCHAR(255) DEFAULT 'Ожидание',
        timer VARCHAR(50) DEFAULT '00:00',
        timer_total INTEGER DEFAULT 0,
        online BOOLEAN DEFAULT true,
        status_updated BOOLEAN DEFAULT false,
        room_id INTEGER,
        city VARCHAR(50) DEFAULT 'spb',
        gender VARCHAR(20) DEFAULT 'male',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ База данных инициализирована');
    await migrateDatabase();
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
  }
}

/**
 * Проверяет и сбрасывает неактивных пользователей
 */
async function checkAndResetInactiveUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🕒 Проверка активности пользователей...');
    
    // Находим пользователей, которые неактивны более 2 минут
    const inactiveUsers = await client.query(`
      SELECT id, name, station 
      FROM users 
      WHERE online = true 
      AND last_activity < NOW() - INTERVAL '2 minutes'
    `);
    
    if (inactiveUsers.rows.length > 0) {
      console.log(`🔍 Найдено ${inactiveUsers.rows.length} неактивных пользователей:`);
      
      // Сбрасываем неактивных пользователей
      const resetResult = await client.query(`
        UPDATE users 
        SET 
          online = false,
          is_waiting = true,
          is_connected = false,
          room_id = NULL,
          status = 'Не в сети',
          last_activity = CURRENT_TIMESTAMP
        WHERE online = true 
        AND last_activity < NOW() - INTERVAL '2 minutes'
      `);
      
      // Удаляем неактивных пользователей из комнат
      await client.query(`
        DELETE FROM room_users 
        WHERE user_id IN (
          SELECT id FROM users 
          WHERE online = false 
          AND last_activity < NOW() - INTERVAL '2 minutes'
        )
      `);
      
      // Удаляем пустые комнаты
      await client.query(`
        DELETE FROM rooms 
        WHERE id NOT IN (
          SELECT DISTINCT room_id FROM room_users WHERE room_id IS NOT NULL
        )
      `);
      
      await client.query('COMMIT');
      
      console.log(`✅ Сброшено ${resetResult.rowCount} неактивных сессий`);
      inactiveUsers.rows.forEach(user => {
        console.log(`   - ${user.name} (${user.station})`);
      });
      
      return {
        success: true,
        resetCount: resetResult.rowCount,
        inactiveUsers: inactiveUsers.rows
      };
    } else {
      await client.query('ROLLBACK');
      console.log('✅ Активных пользователей нет, сброс не требуется');
      return {
        success: true,
        resetCount: 0,
        inactiveUsers: []
      };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка проверки активности:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

/**
 * Сбрасывает все неактивные сессии
 */
async function resetAllSessions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Начинаем мягкий сброс всех сессий...');
    
    // Сбрасываем только действительно неактивных пользователей
    const resetResult = await client.query(`
      UPDATE users 
      SET 
        online = false,
        is_waiting = true,
        is_connected = false,
        room_id = NULL,
        status = 'Ожидание',
        last_activity = CURRENT_TIMESTAMP
      WHERE online = true 
      AND last_activity < NOW() - INTERVAL '5 minutes'
    `);
    
    // Очищаем комнаты от неактивных пользователей
    await client.query(`
      DELETE FROM room_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE online = false
      )
    `);
    
    // Удаляем пустые комнаты
    await client.query(`
      DELETE FROM rooms 
      WHERE id NOT IN (
        SELECT DISTINCT room_id FROM room_users WHERE room_id IS NOT NULL
      )
    `);
    
    await client.query('COMMIT');
    
    console.log(`✅ Мягкий сброс: ${resetResult.rowCount} неактивных сессий`);
    
    return {
      success: true,
      resetUsers: resetResult.rowCount,
      message: `Сброшено ${resetResult.rowCount} неактивных сессий`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка сброса сессий:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

/**
 * Автоматически сбрасывает сессии по расписанию
 */
async function autoResetSessions() {
  console.log('🕒 Запуск автоматического сброса сессий...');
  const result = await resetAllSessions();
  if (result.success) {
    console.log(`✅ Автоматический сброс завершен: ${result.message}`);
  } else {
    console.error('❌ Ошибка автоматического сброса:', result.error);
  }
}

/**
 * Очищает неактивных пользователей из базы данных
 */
async function cleanupInactiveUsers() {
  try {
    const result = await pool.query(`
      DELETE FROM users 
      WHERE created_at < NOW() - INTERVAL '24 hours' 
      OR (online = true AND last_activity < NOW() - INTERVAL '2 hours')
    `);
    
    if (result.rowCount > 0) {
      console.log(`🧹 Очищено ${result.rowCount} неактивных пользователей`);
    }
  } catch (error) {
    console.error('❌ Ошибка очистки неактивных пользователей:', error);
  }
}

// =============================================
// MIDDLEWARE
// =============================================

// Middleware для сжатия данных
app.use(compression());

// CORS middleware - ОДИН РАЗ
app.use(cors({
  origin: [
    'https://frommetro.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000', 
    'http://localhost:8080',
    'https://your-frontend-domain.vercel.app',
    // Домены VK:
    'https://vk.com',
    'https://vk.ru', 
    'https://*.vk.com',
    'https://*.vk.ru',
    'https://*.vk-apps.com',
    'https://*.userapi.com',
    // Локальная разработка VK:
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // Ваши текущие адреса:
    'http://172.28.192.1:5173',
    'http://192.168.1.139:5173', 
    'http://172.30.80.1:5173',
    'http://172.29.112.1:5173',
    // Для разработки можно разрешить все:
    '*'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Увеличено до 300 запросов в минуту
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Обработка preflight CORS запросов
app.options('*', cors());

// Парсинг JSON и URL-encoded данных
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Получение IP адреса клиента
app.use(requestIp.mw());

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Таймауты для запросов
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 секунд
  res.setTimeout(30000);
  next();
});

// Логирование входящих запросов
app.use((req, res, next) => {
  console.log(`📍 ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// =============================================
// API ROUTES - ЗДОРОВЬЕ СИСТЕМЫ
// =============================================

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    
    res.json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT COUNT(*) as user_count FROM users WHERE online = true');
    
    res.json({
      status: 'operational',
      database: 'connected',
      activeUsers: parseInt(dbResult.rows[0].user_count),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// API ROUTES - ПОЛЬЗОВАТЕЛИ
// =============================================

// Получение всех пользователей С КЭШИРОВАНИЕМ
app.get('/api/users', asyncHandler(async (req, res) => {
  const cacheKey = 'online_users';
  const cachedUsers = cache.get(cacheKey);
  
  if (cachedUsers) {
    console.log('📦 Возвращаем кэшированных пользователей');
    return res.json(cachedUsers);
  }
  
  const result = await pool.query(`
    SELECT * FROM users 
    WHERE online = true 
    ORDER BY created_at DESC
  `);
  
  cache.set(cacheKey, result.rows, 10000); // Кэш на 10 секунд
  console.log('✅ Пользователи закэшированы');
  res.json(result.rows);
}));

// Создание нового пользователя
app.post('/api/users', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const userData = req.body;
    const clientIp = req.clientIp;
    const userAgent = req.get('User-Agent') || 'unknown';
    const sessionId = generateSessionId(req);
    
    console.log('📍 Данные нового пользователя:', userData);
    
    // Проверяем обязательные поля
    if (!userData || !userData.name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Отсутствуют обязательные данные пользователя',
        receivedData: userData
      });
    }
    
    const sessionCheck = await checkExistingSessions(client, clientIp, userAgent, sessionId);
    
    if (!sessionCheck.allowed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: sessionCheck.reason
      });
    }
    
    // Подготавливаем данные пользователя
    const userRecord = {
      name: userData.name || 'Аноним',
      station: userData.station || '',
      wagon: userData.wagon || null,
      color: userData.color || 'Синий',
      color_code: userData.colorCode || getRandomColor(),
      status: userData.status || 'Ожидание',
      timer: userData.timer || '00:00',
      timer_total: userData.timerTotal || 0,
      city: userData.city || 'spb',
      gender: userData.gender || 'male',
      ip_address: clientIp,
      position: userData.position || '',
      mood: userData.mood || '',
      last_activity: new Date(),
      user_agent: userAgent,
      session_id: sessionId,
      is_waiting: true,
      is_connected: false,
      online: true
    };
    
    const result = await client.query(
      `INSERT INTO users (
        name, station, wagon, color, color_code, status, timer, timer_total, 
        city, gender, ip_address, position, mood, last_activity, user_agent, session_id,
        is_waiting, is_connected, online
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
       RETURNING *`,
      Object.values(userRecord)
    );
    
    await client.query('COMMIT');
    
    // Очищаем кэш при добавлении нового пользователя
    cache.clear();
    console.log('🧹 Кэш очищен после добавления пользователя');
    
    const createdUser = result.rows[0];
    console.log(`✅ Создан пользователь: ${createdUser.name} (ID: ${createdUser.id})`);
    
    res.status(201).json(createdUser);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка создания пользователя:', error);
    
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при создании пользователя',
      details: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
}));

// Обновление пользователя С ОЧИСТКОЙ КЭША
app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const updates = req.body;
    
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    const fieldMapping = {
      name: 'name',
      station: 'station',
      wagon: 'wagon',
      color: 'color',
      colorCode: 'color_code',
      status: 'status',
      timer: 'timer',
      timerTotal: 'timer_total',
      online: 'online',
      roomId: 'room_id',
      city: 'city',
      gender: 'gender',
      position: 'position',
      mood: 'mood',
      isWaiting: 'is_waiting',
      isConnected: 'is_connected',
      timer_seconds: 'timer_seconds',
      timer_end: 'timer_end',
      show_timer: 'show_timer'
    };
    
    Object.keys(updates).forEach(key => {
      if (fieldMapping[key] && key !== 'id') {
        setClause.push(`${fieldMapping[key]} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });
    
    setClause.push('last_activity = $' + paramCount);
    values.push(new Date());
    paramCount++;
    
    if (updates.status) {
      setClause.push('status_updated = $' + paramCount);
      values.push(true);
      paramCount++;
    }
    
    values.push(id);
    
    const result = await client.query(
      `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    await client.query('COMMIT');
    
    // Очищаем кэш при обновлении пользователя
    cache.clear();
    console.log('🧹 Кэш очищен после обновления пользователя');
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Пользователь не найден' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка обновления пользователя:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}));

// Удаление пользователя С ОЧИСТКОЙ КЭША
app.delete('/api/users/:id', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    if (user.is_connected) {
      await client.query(
        `UPDATE users 
         SET is_connected = false, is_waiting = true 
         WHERE station = $1 AND wagon = $2 AND is_connected = true`,
        [user.station, user.wagon]
      );
    }
    
    await client.query('DELETE FROM room_users WHERE user_id = $1', [id]);
    await client.query('DELETE FROM rooms WHERE host_user_id = $1', [id]);
    const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    // Очищаем кэш при удалении пользователя
    cache.clear();
    console.log('🧹 Кэш очищен после удаления пользователя');
    
    if (result.rowCount === 1) {
      console.log(`🗑️ Удален пользователь ID: ${id}`);
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Пользователь не найден' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка удаления пользователя:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}));

// Пинг активности пользователя
app.post('/api/users/:id/ping', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const result = await client.query(
      'UPDATE users SET last_activity = $1 WHERE id = $2 RETURNING id',
      [new Date(), id]
    );
    
    res.json({ 
      success: true, 
      message: 'Активность обновлена',
      userId: result.rows[0].id
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления активности:', error);
    res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера' 
    });
  } finally {
    client.release();
  }
}));

// =============================================
// API ROUTES - СТАНЦИИ И СТАТИСТИКА
// =============================================

// Получение статистики по станциям для комнаты ожидания
app.get('/api/stations/waiting-room', asyncHandler(async (req, res) => {
  const { city } = req.query;
  
  let query = `
    SELECT 
      station,
      COUNT(*) as total_users,
      COUNT(CASE WHEN is_connected = true AND is_waiting = false THEN 1 END) as connected_count,
      COUNT(CASE WHEN is_waiting = true AND is_connected = false THEN 1 END) as waiting_count
    FROM users 
    WHERE online = true
  `;
  
  const values = [];
  
  if (city) {
    query += ` AND city = $1`;
    values.push(city);
  }
  
  query += ` GROUP BY station ORDER BY total_users DESC, station ASC`;
  
  const result = await pool.query(query, values);
  
  const totalStats = await pool.query(`
      SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_connected = true THEN 1 END) as total_connected,
          COUNT(CASE WHEN is_waiting = true THEN 1 END) as total_waiting
      FROM users 
      WHERE online = true AND city = $1
  `, [city || 'spb']);
  
  const stationStats = result.rows.map(row => ({
    station: row.station,
    totalUsers: parseInt(row.total_users),
    waiting: parseInt(row.waiting_count),
    connected: parseInt(row.connected_count)
  }));
  
  res.json({
      stationStats: stationStats,
      totalStats: totalStats.rows[0]
  });
}));

// =============================================
// API ROUTES - КОМНАТЫ
// =============================================

// Присоединение к комнате станции
app.post('/api/rooms/join-station', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { userId, station } = req.body;
    
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    await client.query(
      `UPDATE users SET 
        station = $1, 
        is_waiting = false, 
        is_connected = true,
        last_activity = $2,
        status = 'Ожидание на станции'
       WHERE id = $3`,
      [station, new Date(), userId]
    );
    
    const stationUsersResult = await client.query(`
      SELECT * FROM users 
      WHERE station = $1 AND is_connected = true AND online = true
      ORDER BY created_at
    `, [station]);
    
    await client.query('COMMIT');
    
    // Очищаем кэш при изменении статуса пользователя
    cache.clear();
    console.log('🧹 Кэш очищен после присоединения к станции');
    
    console.log(`✅ Пользователь ${user.name} присоединился к станции: ${station}`);
    
    res.json({
      success: true,
      station: station,
      users: stationUsersResult.rows,
      totalUsers: stationUsersResult.rows.length
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка присоединения к станции:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}));

// Выход из комнаты
app.post('/api/rooms/leave', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { roomId, userId } = req.body;
    
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    await client.query(
      'DELETE FROM room_users WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    
    await client.query(
      'UPDATE users SET room_id = NULL, last_activity = $1, is_waiting = true, is_connected = false WHERE id = $2',
      [new Date(), userId]
    );
    
    const roomUsersResult = await client.query(
      'SELECT COUNT(*) as count FROM room_users WHERE room_id = $1',
      [roomId]
    );
    
    const userCount = parseInt(roomUsersResult.rows[0].count);
    if (userCount === 0) {
      await client.query('DELETE FROM rooms WHERE id = $1', [roomId]);
      console.log(`🗑️ Удалена пустая комната ID: ${roomId}`);
    }
    
    await client.query('COMMIT');
    
    // Очищаем кэш при выходе из комнаты
    cache.clear();
    console.log('🧹 Кэш очищен после выхода из комнаты');
    
    console.log(`👋 Пользователь ${user.name} вышел из комнаты и вернулся в ожидание`);
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка выхода из комнаты:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}));

// Обновление состояния пользователя в комнате
app.put('/api/rooms/user/:userId/state', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { userId } = req.params;
    const { position, mood } = req.body;
    
    const userUpdate = await client.query(
      `UPDATE users SET position = $1, mood = $2, last_activity = $3 
       WHERE id = $4 RETURNING *`,
      [position, mood, new Date(), userId]
    );
    
    if (userUpdate.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    await client.query(
      `UPDATE room_users SET user_position = $1, user_mood = $2 
       WHERE user_id = $3`,
      [position, mood, userId]
    );
    
    await client.query('COMMIT');
    
    // Очищаем кэш при изменении состояния
    cache.clear();
    console.log('🧹 Кэш очищен после обновления состояния пользователя');
    
    console.log(`🎯 Обновлено состояние пользователя ID: ${userId} - позиция: ${position}, настроение: ${mood}`);
    res.json(userUpdate.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка обновления состояния:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}));

// =============================================
// API ROUTES - АДМИНИСТРИРОВАНИЕ
// =============================================

// Сброс сессий через HTTP
app.post('/api/admin/reset-sessions', asyncHandler(async (req, res) => {
  try {
    const result = await resetAllSessions();
    
    // Очищаем кэш при сбросе сессий
    cache.clear();
    console.log('🧹 Кэш очищен после сброса сессий');
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('❌ Ошибка сброса сессий через API:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}));

// =============================================
// ОСНОВНЫЕ МАРШРУТЫ И ОБРАБОТКА ОШИБОК
// =============================================

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({ 
    message: '🚇 Metro API работает!',
    version: '2.3.1',
    features: [
      'Управление пользователями с проверкой активности',
      'Интерактивная карта станций',
      'Позиции и настроения пользователей',
      'Статистика по станциям в реальном времени',
      'Автоочистка неактивных пользователей',
      'Автоматический сброс сессий каждые 15 минут',
      'Поддержка до 20 сессий с одного IP',
      'Разделение на ожидающих и подключенных',
      'Кэширование пользователей (10 секунд)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Обработка несуществующих маршрутов
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Глобальная обработка ошибок
app.use((error, req, res, next) => {
  console.error('❌ Необработанная ошибка:', error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// =============================================
// ЗАПУСК СЕРВЕРА
// =============================================

/**
 * Запускает сервер и инициализирует все компоненты
 */
async function startServer() {
  try {
    // Проверяем окружение
    checkEnvironment();
    
    // Проверяем подключение к БД
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Не удалось подключиться к базе данных');
      process.exit(1);
    }
    
    // Инициализируем БД
    await initDB();
    
    // Запускаем автоматические задачи
    setInterval(autoResetSessions, 15 * 60 * 1000);
    setInterval(checkAndResetInactiveUsers, 60 * 1000);
    setInterval(cleanupInactiveUsers, 30 * 60 * 1000);
    
    console.log('⏰ Автоматический сброс сессий настроен каждые 15 минут');
    console.log('⏰ Проверка активности пользователей настроена каждую минуту');
    console.log('⏰ Очистка неактивных пользователей настроена каждые 30 минут');
    console.log('📦 Кэширование пользователей включено (10 секунд)');
    
    // Запускаем сервер
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚇 Сервер "Метрос" запущен на порту ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`📊 Версия: 2.3.1`);
      console.log(`🕒 Система активности включена`);
      console.log(`🗺️  Интерактивная карта станций готова`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Запускаем сервер
startServer();