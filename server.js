// Логирование всех входящих запросов
app.use((req, res, next) => {
  console.log(`📍 ${new Date().toISOString()} ${req.method} ${req.path}`);
  console.log('📍 Headers:', req.headers);
  console.log('📍 Body:', req.body);
  next();
});


import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import requestIp from 'request-ip';

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3000;

// Улучшенная CORS конфигурация
app.use(cors({
  origin: [
    'https://frommetro.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Явно обрабатываем OPTIONS запросы для preflight
app.options('*', cors());

// PostgreSQL connection с улучшенной обработкой ошибок
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Добавляем настройки пула соединений
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
});

// Обработчик ошибок пула
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
});

// Функция для проверки подключения к БД
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
// Функция для генерации случайного цвета
function getRandomColor() {
  const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
  return colors[Math.floor(Math.random() * colors.length)];
}


// Упрощенная функция миграции
async function migrateDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Запуск миграции базы данных...');
    
    // Основные колонки для добавления
    const alterQueries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address INET`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mood VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS user_agent TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_id VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_waiting BOOLEAN DEFAULT true`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT false`
    ];

    for (const query of alterQueries) {
      try {
        await client.query(query);
        console.log(`✅ Выполнен: ${query.split('ADD COLUMN IF NOT EXISTS')[1]}`);
      } catch (error) {
        console.warn(`⚠️ Предупреждение при выполнении миграции:`, error.message);
      }
    }

    // Создание таблиц если не существуют
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

// Инициализация базы данных
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

initDB();

// Функция для проверки и сброса неактивных пользователей
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

// Функция сброса всех сессий
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

// Функция автоматического сброса сессий
async function autoResetSessions() {
  console.log('🕒 Запуск автоматического сброса сессий...');
  const result = await resetAllSessions();
  if (result.success) {
    console.log(`✅ Автоматический сброс завершен: ${result.message}`);
  } else {
    console.error('❌ Ошибка автоматического сброса:', result.error);
  }
}

// Middleware для очистки неактивных пользователей
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

// Запускаем автоматический сброс каждые 15 минут
setInterval(autoResetSessions, 15 * 60 * 1000);
// Запускаем проверку активности каждую минуту
setInterval(checkAndResetInactiveUsers, 60 * 1000);
// Запускаем очистку каждые 30 минут
setInterval(cleanupInactiveUsers, 30 * 60 * 1000);

console.log('⏰ Автоматический сброс сессий настроен каждые 15 минут');
console.log('⏰ Проверка активности пользователей настроена каждую минуту');
console.log('⏰ Очистка неактивных пользователей настроена каждые 30 минут');

// Генерация уникального ID сессии
function generateSessionId(req) {
  const ip = req.clientIp || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const timestamp = Date.now().toString();
  return Buffer.from(`${ip}-${userAgent}-${timestamp}`).toString('base64').slice(0, 32);
}

// Функция для проверки дублирующих сессий
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

// API Routes

// Получение всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM users 
      WHERE online = true 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка получения пользователей:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение статистики по станциям для комнаты ожидания
app.get('/api/stations/waiting-room', async (req, res) => {
  try {
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
    
    // Добавить общую статистику по всему городу
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
    
    // Вернуть оба набора данных
    res.json({
        stationStats: stationStats,
        totalStats: totalStats.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения статистики для комнаты ожидания:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создание нового пользователя - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.post('/api/users', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const userData = req.body;
    const clientIp = req.clientIp;
    const userAgent = req.get('User-Agent') || 'unknown';
    const sessionId = generateSessionId(req);
    
    console.log('📍 Данные нового пользователя:', userData);
    console.log(`📍 IP: ${clientIp}, User-Agent: ${userAgent.substring(0, 50)}...`);
    
    // ВАЖНО: Проверяем обязательные поля
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
    
    // Убедимся, что все обязательные поля есть
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
      [
        userRecord.name,
        userRecord.station,
        userRecord.wagon,
        userRecord.color,
        userRecord.color_code,
        userRecord.status,
        userRecord.timer,
        userRecord.timer_total,
        userRecord.city,
        userRecord.gender,
        userRecord.ip_address,
        userRecord.position,
        userRecord.mood,
        userRecord.last_activity,
        userRecord.user_agent,
        userRecord.session_id,
        userRecord.is_waiting,
        userRecord.is_connected,
        userRecord.online
      ]
    );
    
    await client.query('COMMIT');
    
    const createdUser = result.rows[0];
    console.log(`✅ Создан пользователь: ${createdUser.name} (ID: ${createdUser.id})`);
    
    res.status(201).json(createdUser);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка создания пользователя:', error);
    
    // Отправляем понятную ошибку клиенту
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера при создании пользователя',
      details: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
});

// Обновление пользователя
app.put('/api/users/:id', async (req, res) => {
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
      isConnected: 'is_connected'
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
});

// Удаление пользователя
app.delete('/api/users/:id', async (req, res) => {
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
});

// Функция пинга активности пользователя - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.post('/api/users/:id/ping', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    // Проверяем существование пользователя
    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Обновляем активность
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
});
// Health check с проверкой БД
app.get('/health', async (req, res) => {
  try {
    // Проверяем подключение к БД
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

// Проверка готовности API
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
// Обертка для обработки ошибок async функций
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Пример применения ко всем endpoints
app.get('/api/users', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM users 
    WHERE online = true 
    ORDER BY created_at DESC
  `);
  res.json(result.rows);
}));
// Проверка обязательных переменных окружения
function checkEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Отсутствуют обязательные переменные окружения:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ Все переменные окружения настроены');
}

// Вызовите в начале
checkEnvironment();

// Увеличьте лимиты для Express
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Добавьте обработку таймаутов
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 секунд
  res.setTimeout(30000);
  next();
});


// Присоединение к комнате станции
app.post('/api/rooms/join-station', async (req, res) => {
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
});

// Выход из комнаты
app.post('/api/rooms/leave', async (req, res) => {
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
    console.log(`👋 Пользователь ${user.name} вышел из комнаты и вернулся в ожидание`);
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка выхода из комнаты:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Обновление состояния пользователя
app.put('/api/rooms/user/:userId/state', async (req, res) => {
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
    console.log(`🎯 Обновлено состояние пользователя ID: ${userId} - позиция: ${position}, настроение: ${mood}`);
    res.json(userUpdate.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка обновления состояния:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// API для сброса сессий через HTTP
app.post('/api/admin/reset-sessions', async (req, res) => {
  try {
    const result = await resetAllSessions();
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
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🚇 Metro API работает!',
    version: '2.3.0',
    features: [
      'Управление пользователями с проверкой активности',
      'Интерактивная карта станций',
      'Позиции и настроения пользователей',
      'Статистика по станциям в реальном времени',
      'Автоочистка неактивных пользователей',
      'Автоматический сброс сессий каждые 15 минут',
      'Поддержка до 20 сессий с одного IP',
      'Разделение на ожидающих и подключенных'
    ],
    timestamp: new Date().toISOString()
  });
});

// Обработка несуществующих маршрутов
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('❌ Необработанная ошибка:', error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚇 Сервер "Из метро" запущен на порту ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📊 Версия: 2.3.0`);
  console.log(`🕒 Система активности включена`);
  console.log(`🗺️  Интерактивная карта станций готова`);
  console.log(`🔄 Автообновление каждые 2-3 секунды`);
});