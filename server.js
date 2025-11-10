import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import requestIp from 'request-ip';

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(requestIp.mw());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Функция для генерации случайного цвета
function getRandomColor() {
  const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Функция для добавления недостающих колонок
async function migrateDatabase() {
  try {
    // Проверяем и добавляем недостающие колонки
    const columnsToAdd = [
      { name: 'ip_address', type: 'INET' },
      { name: 'position', type: 'VARCHAR(100)' },
      { name: 'mood', type: 'VARCHAR(100)' },
      { name: 'last_activity', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'session_id', type: 'VARCHAR(255)' },
      { name: 'is_waiting', type: 'BOOLEAN DEFAULT true' },
      { name: 'is_connected', type: 'BOOLEAN DEFAULT false' }
    ];

    for (const column of columnsToAdd) {
      try {
        // Проверяем существование колонки
        const checkResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = $1
        `, [column.name]);

        if (checkResult.rows.length === 0) {
          // Колонка не существует, добавляем её
          await pool.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ Добавлена колонка: ${column.name}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка при добавлении колонки ${column.name}:`, error.message);
      }
    }

    // Проверяем и добавляем таблицу rooms если её нет
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id SERIAL PRIMARY KEY,
          host_user_id INTEGER,
          host_user_name VARCHAR(255),
          station VARCHAR(255),
          wagon VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Таблица rooms проверена/создана');
    } catch (error) {
      console.error('❌ Ошибка при создании таблицы rooms:', error.message);
    }

    // Проверяем и добавляем таблицу room_users если её нет
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS room_users (
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
        )
      `);
      console.log('✅ Таблица room_users проверена/создана');
    } catch (error) {
      console.error('❌ Ошибка при создании таблицы room_users:', error.message);
    }

    // Добавляем индексы для улучшения производительности
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_users_station_wagon ON users(station, wagon)',
      'CREATE INDEX IF NOT EXISTS idx_users_online ON users(online)',
      'CREATE INDEX IF NOT EXISTS idx_users_city ON users(city)',
      'CREATE INDEX IF NOT EXISTS idx_room_users_room_id ON room_users(room_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity)',
      'CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_waiting ON users(is_waiting)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_connected ON users(is_connected)'
    ];

    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
        console.log(`✅ Индекс создан: ${indexQuery.split('ON ')[1]}`);
      } catch (error) {
        console.error(`❌ Ошибка при создании индекса:`, error.message);
      }
    }

    console.log('✅ Миграция базы данных завершена');
  } catch (error) {
    console.error('❌ Ошибка миграции базы данных:', error);
  }
}

// Инициализация базы данных
async function initDB() {
  try {
    // Создаем основную таблицу users если её нет
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
    
    // Запускаем миграцию для добавления новых полей
    await migrateDatabase();
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
  }
}

initDB();

// Функция сброса всех сессий
async function resetAllSessions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Начинаем сброс всех сессий...');
    
    // Сбрасываем всех пользователей в состояние ожидания
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
    `);
    
    // Очищаем все комнаты
    await client.query('DELETE FROM room_users');
    await client.query('DELETE FROM rooms');
    
    await client.query('COMMIT');
    
    console.log(`✅ Сброшено ${resetResult.rowCount} сессий пользователей`);
    console.log('✅ Все комнаты очищены');
    console.log('✅ Все пользователи возвращены в комнату ожидания');
    
    return {
      success: true,
      resetUsers: resetResult.rowCount,
      message: `Сброшено ${resetResult.rowCount} сессий пользователей`
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

// Функция автоматического сброса сессий каждые 10 минут
async function autoResetSessions() {
  console.log('🕒 Запуск автоматического сброса сессий...');
  const result = await resetAllSessions();
  if (result.success) {
    console.log(`✅ Автоматический сброс завершен: ${result.message}`);
  } else {
    console.error('❌ Ошибка автоматического сброса:', result.error);
  }
}

// Запускаем автоматический сброс каждые 10 минут
setInterval(autoResetSessions, 10 * 60 * 1000);
console.log('⏰ Автоматический сброс сессий настроен каждые 10 минут');

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

// Запускаем очистку каждые 30 минут
setInterval(cleanupInactiveUsers, 30 * 60 * 1000);

// Генерация уникального ID сессии
function generateSessionId(req) {
  const ip = req.clientIp || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const timestamp = Date.now().toString();
  
  // Создаем хеш на основе IP, User-Agent и времени
  return Buffer.from(`${ip}-${userAgent}-${timestamp}`).toString('base64').slice(0, 32);
}

// Функция для проверки дублирующих сессий (более гибкая)
async function checkExistingSessions(client, clientIp, userAgent, sessionId) {
  try {
    // Проверяем активные сессии с того же IP за последние 10 минут
    const existingSessions = await client.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE ip_address = $1 AND online = true 
       AND last_activity > NOW() - INTERVAL '10 minutes'
       AND station IS NOT NULL`,
      [clientIp]
    );
    
    const sessionCount = parseInt(existingSessions.rows[0].count);
    
    // Разрешаем до 20 сессий с одного IP
    if (sessionCount >= 20) {
      return {
        allowed: false,
        reason: 'С одного IP-адреса разрешено не более 20 активных сессий одновременно.'
      };
    }
    
    // Проверяем точное совпадение сессии (тот же IP и User-Agent)
    const exactMatch = await client.query(
      `SELECT id FROM users 
       WHERE ip_address = $1 AND user_agent = $2 AND online = true 
       AND last_activity > NOW() - INTERVAL '5 minutes'`,
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
    // В случае ошибки разрешаем создание пользователя
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
        COUNT(CASE WHEN is_waiting = true THEN 1 END) as waiting_count,
        COUNT(CASE WHEN is_connected = true THEN 1 END) as connected_count
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
    
    const stationStats = result.rows.map(row => ({
      station: row.station,
      totalUsers: parseInt(row.total_users),
      waiting: parseInt(row.waiting_count),
      connected: parseInt(row.connected_count)
    }));
    
    res.json(stationStats);
  } catch (error) {
    console.error('❌ Ошибка получения статистики для комнаты ожидания:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создание нового пользователя с гибкой проверкой IP
app.post('/api/users', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const userData = req.body;
    const clientIp = req.clientIp;
    const userAgent = req.get('User-Agent') || 'unknown';
    const sessionId = generateSessionId(req);
    
    console.log(`📍 Новый пользователь с IP: ${clientIp}, User-Agent: ${userAgent.substring(0, 50)}...`);
    
    // Гибкая проверка существующих сессий
    const sessionCheck = await checkExistingSessions(client, clientIp, userAgent, sessionId);
    
    if (!sessionCheck.allowed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: sessionCheck.reason
      });
    }
    
    // Создаем пользователя в состоянии ожидания
    const result = await client.query(
      `INSERT INTO users (
        name, station, wagon, color, color_code, status, timer, timer_total, 
        city, gender, ip_address, position, mood, last_activity, user_agent, session_id,
        is_waiting, is_connected
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
       RETURNING *`,
      [
        userData.name,
        userData.station,
        userData.wagon || null,
        userData.color,
        userData.colorCode || getRandomColor(),
        userData.status || 'Ожидание',
        userData.timer || '00:00',
        userData.timerTotal || 0,
        userData.city || 'spb',
        userData.gender || 'male',
        clientIp,
        userData.position || '',
        userData.mood || '',
        new Date(),
        userAgent,
        sessionId,
        true,  // is_waiting
        false  // is_connected
      ]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Создан пользователь: ${userData.name} на станции ${userData.station} (IP: ${clientIp})`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка создания пользователя:', error);
    res.status(500).json({ error: error.message });
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
    
    // Динамическое построение запроса
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
    
    // Всегда обновляем last_activity при изменении пользователя
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
    
    // Получаем информацию о пользователе перед удалением
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    // Если пользователь был подключен, уменьшаем счетчик подключенных
    if (user.is_connected) {
      await client.query(
        `UPDATE users 
         SET is_connected = false, is_waiting = true 
         WHERE station = $1 AND wagon = $2 AND is_connected = true`,
        [user.station, user.wagon]
      );
    }
    
    // Удаляем пользователя из комнат
    await client.query('DELETE FROM room_users WHERE user_id = $1', [id]);
    
    // Удаляем комнаты где пользователь был хостом
    await client.query('DELETE FROM rooms WHERE host_user_id = $1', [id]);
    
    // Удаляем пользователя
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

// Получение статистики по станциям
app.get('/api/stations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT station, COUNT(*) as count FROM users WHERE online = true GROUP BY station
    `);
    
    const stats = {};
    result.rows.forEach(row => {
      stats[row.station] = parseInt(row.count);
    });
    
    res.json(stats);
  } catch (error) {
    console.error('❌ Ошибка получения статистики станций:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение расширенной статистики по станциям
app.get('/api/stations/stats', async (req, res) => {
  try {
    const { city } = req.query;
    
    let query = `
      SELECT 
        station,
        wagon,
        city,
        COUNT(*) as total_users,
        COUNT(CASE WHEN position != '' THEN 1 END) as users_with_position,
        COUNT(CASE WHEN mood != '' THEN 1 END) as users_with_mood,
        COUNT(CASE WHEN is_waiting = true THEN 1 END) as waiting_count,
        COUNT(CASE WHEN is_connected = true THEN 1 END) as connected_count
      FROM users 
      WHERE online = true
    `;
    
    const values = [];
    
    if (city) {
      query += ` AND city = $1`;
      values.push(city);
    }
    
    query += ` GROUP BY station, wagon, city ORDER BY total_users DESC`;
    
    const result = await pool.query(query, values);
    
    // Группируем по станциям для удобного отображения
    const stationStats = {};
    result.rows.forEach(row) 
    {
      if (!stationStats[row.station]) {
        stationStats[row.station] = {
          station: row.station,
          city: row.city,
          totalUsers: 0,
          waiting: 0,
          connected: 0,
          wagons: [],
          usersWithPosition: 0,
          usersWithMood: 0
        };
      }
      
      stationStats[row.station].totalUsers += parseInt(row.total_users);
      stationStats[row.station].waiting += parseInt(row.waiting_count);
      stationStats[row.station].connected += parseInt(row.connected_count);
      stationStats[row.station].usersWithPosition += parseInt(row.users_with_position);
      stationStats[row.station].usersWithMood += parseInt(row.users_with_mood);
      
      if (row.wagon) {
        stationStats[row.station].wagons.push({
          wagon: row.wagon,
          users: parseInt(row.total_users),
          waiting: parseInt(row.waiting_count),
          connected: parseInt(row.connected_count)
        });
      }
    }
    
    res.json(Object.values(stationStats));
  } catch (error) {
    console.error('❌ Ошибка получения расширенной статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создание комнаты
app.post('/api/rooms', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const roomData = req.body;
    
    // Создаем комнату
    const roomResult = await client.query(
      `INSERT INTO rooms (host_user_id, host_user_name, station, wagon) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [roomData.hostUserId, roomData.hostUserName, roomData.station, roomData.wagon]
    );
    
    const room = roomResult.rows[0];
    
    // Обновляем пользователя - теперь он подключен, а не ожидает
    await client.query(
      'UPDATE users SET room_id = $1, is_waiting = false, is_connected = true WHERE id = $2',
      [room.id, roomData.hostUserId]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Создана комната: ${roomData.station}, вагон ${roomData.wagon}`);
    res.status(201).json(room);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка создания комнаты:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Присоединение к комнате
app.post('/api/rooms/join', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { userId, station, wagon } = req.body;
    
    // Ищем существующую комнату
    const roomResult = await client.query(
      'SELECT * FROM rooms WHERE station = $1 AND wagon = $2',
      [station, wagon]
    );
    
    let room;
    
    if (roomResult.rows.length === 0) {
      // Создаем новую комнату если не найдена
      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      const user = userResult.rows[0];
      const newRoomResult = await client.query(
        `INSERT INTO rooms (host_user_id, host_user_name, station, wagon) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, user.name, station, wagon]
      );
      
      room = newRoomResult.rows[0];
    } else {
      room = roomResult.rows[0];
    }
    
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    // Проверяем, не присоединен ли уже
    const existingJoin = await client.query(
      'SELECT * FROM room_users WHERE room_id = $1 AND user_id = $2',
      [room.id, userId]
    );
    
    if (existingJoin.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Пользователь уже в этой комнате' });
    }
    
    // Добавляем пользователя в комнату
    await client.query(
      `INSERT INTO room_users (
        room_id, user_id, user_name, user_station, user_wagon, 
        user_color, user_color_code, user_position, user_mood
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        room.id, 
        userId, 
        user.name, 
        user.station, 
        user.wagon, 
        user.color, 
        user.color_code,
        user.position || '',
        user.mood || ''
      ]
    );
    
    // Обновляем пользователя - теперь он подключен, а не ожидает
    await client.query(
      'UPDATE users SET room_id = $1, station = $2, wagon = $3, last_activity = $4, is_waiting = false, is_connected = true WHERE id = $5',
      [room.id, station, wagon, new Date(), userId]
    );
    
    // Получаем участников комнаты
    const roomUsersResult = await client.query(`
      SELECT * FROM room_users WHERE room_id = $1
    `, [room.id]);
    
    await client.query('COMMIT');
    
    const response = {
      ...room,
      joined_users: roomUsersResult.rows.map(ru => ({
        id: ru.user_id,
        name: ru.user_name,
        station: ru.user_station,
        wagon: ru.user_wagon,
        color: ru.user_color,
        colorCode: ru.user_color_code,
        position: ru.user_position,
        mood: ru.user_mood
      }))
    };
    
    console.log(`✅ Пользователь ${user.name} присоединился к комнате: ${station}, вагон ${wagon}`);
    res.json(response);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка присоединения к комнате:', error);
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
    
    // Получаем информацию о пользователе перед выходом
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    // Удаляем пользователя из комнаты
    await client.query(
      'DELETE FROM room_users WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    
    // Обновляем пользователя - возвращаем в состояние ожидания
    await client.query(
      'UPDATE users SET room_id = NULL, last_activity = $1, is_waiting = true, is_connected = false WHERE id = $2',
      [new Date(), userId]
    );
    
    // Проверяем, нужно ли удалить комнату
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

// Получение комнаты пользователя
app.get('/api/rooms/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE host_user_id = $1',
      [userId]
    );
    
    if (roomResult.rows.length === 0) {
      // Проверяем, есть ли пользователь в room_users
      const roomUserResult = await pool.query(
        'SELECT room_id FROM room_users WHERE user_id = $1',
        [userId]
      );
      
      if (roomUserResult.rows.length === 0) {
        return res.status(404).json({ error: 'Комната не найдена' });
      }
      
      const roomId = roomUserResult.rows[0].room_id;
      const room = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
      
      if (room.rows.length === 0) {
        return res.status(404).json({ error: 'Комната не найдена' });
      }
      
      roomResult.rows = room.rows;
    }
    
    const room = roomResult.rows[0];
    const roomUsersResult = await pool.query(`
      SELECT * FROM room_users WHERE room_id = $1
    `, [room.id]);
    
    const response = {
      ...room,
      joined_users: roomUsersResult.rows.map(ru => ({
        id: ru.user_id,
        name: ru.user_name,
        station: ru.user_station,
        wagon: ru.user_wagon,
        color: ru.user_color,
        colorCode: ru.user_color_code,
        position: ru.user_position,
        mood: ru.user_mood
      }))
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Ошибка получения комнаты пользователя:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновление состояния пользователя
app.put('/api/rooms/user/:userId/state', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { userId } = req.params;
    const { position, mood } = req.body;
    
    // Обновляем пользователя
    const userUpdate = await client.query(
      `UPDATE users SET position = $1, mood = $2, last_activity = $3 
       WHERE id = $4 RETURNING *`,
      [position, mood, new Date(), userId]
    );
    
    if (userUpdate.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Обновляем пользователя в комнате
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
    version: '2.2.0',
    features: [
      'Управление пользователями с гибкой проверкой IP',
      'Группировка пользователей по комнатам',
      'Позиции и настроения пользователей',
      'Статистика по станциям',
      'Автоочистка неактивных пользователей',
      'Автоматический сброс сессий каждые 10 минут',
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
  console.log(`📊 Версия: 2.2.0`);
  console.log(`🕒 Автоочистка неактивных пользователей включена`);
  console.log(`🔄 Автоматический сброс сессий каждые 10 минут`);
  console.log(`🌐 Разрешено до 20 сессий с одного IP`);
  console.log(`👥 Разделение пользователей на ожидающих и подключенных`);
  console.log(`🗃️  Проверка и миграция базы данных...`);
  
  // Добавляем команду для сброса сессий в консоль
  console.log(`\n💻 Команда для ручного сброса сессий:`);
  console.log(`   await resetAllSessions()`);
});