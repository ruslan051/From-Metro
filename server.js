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

// Initialize database tables
async function initDB() {
  try {
    // Users table with new fields
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
        position VARCHAR(100),
        mood VARCHAR(100),
        ip_address INET,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Rooms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        host_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        host_user_name VARCHAR(255),
        station VARCHAR(255),
        wagon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Room users (many-to-many relationship)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_users (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

    // Add indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_station_wagon ON users(station, wagon);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_online ON users(online);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_room_users_room_id ON room_users(room_id);
    `);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initDB();

// Функция для генерации случайного цвета
function getRandomColor() {
  const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
  return colors[Math.floor(Math.random() * colors.length)];
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
      console.log(`Cleaned up ${result.rowCount} inactive users`);
    }
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
  }
}

// Запускаем очистку каждые 30 минут
setInterval(cleanupInactiveUsers, 30 * 60 * 1000);

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
    res.status(500).json({ error: error.message });
  }
});

// Создание нового пользователя с проверкой IP
app.post('/api/users', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const userData = req.body;
    const clientIp = req.clientIp;
    
    // Проверяем, есть ли уже активный пользователь с таким IP
    const existingUser = await client.query(
      `SELECT * FROM users 
       WHERE ip_address = $1 AND online = true 
       AND last_activity > NOW() - INTERVAL '10 minutes'`,
      [clientIp]
    );
    
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'У вас уже есть активная сессия. Подождите несколько минут или закройте предыдущую вкладку.' 
      });
    }
    
    const result = await client.query(
      `INSERT INTO users (
        name, station, wagon, color, color_code, status, timer, timer_total, 
        city, gender, ip_address, position, mood
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
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
        userData.mood || ''
      ]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
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
      mood: 'mood'
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
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
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
    
    // Удаляем пользователя из комнат
    await client.query('DELETE FROM room_users WHERE user_id = $1', [id]);
    
    // Удаляем комнаты где пользователь был хостом
    await client.query('DELETE FROM rooms WHERE host_user_id = $1', [id]);
    
    // Удаляем пользователя
    const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    if (result.rowCount === 1) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
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
    res.status(500).json({ error: error.message });
  }
});

// Получение расширенной статистики по станциям с группировкой по городу
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
        COUNT(CASE WHEN room_id IS NOT NULL THEN 1 END) as users_in_rooms
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
    result.rows.forEach(row => {
      if (!stationStats[row.station]) {
        stationStats[row.station] = {
          station: row.station,
          city: row.city,
          totalUsers: 0,
          wagons: [],
          usersWithPosition: 0,
          usersWithMood: 0,
          usersInRooms: 0
        };
      }
      
      stationStats[row.station].totalUsers += parseInt(row.total_users);
      stationStats[row.station].usersWithPosition += parseInt(row.users_with_position);
      stationStats[row.station].usersWithMood += parseInt(row.users_with_mood);
      stationStats[row.station].usersInRooms += parseInt(row.users_in_rooms);
      
      if (row.wagon) {
        stationStats[row.station].wagons.push({
          wagon: row.wagon,
          users: parseInt(row.total_users)
        });
      }
    });
    
    res.json(Object.values(stationStats));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создание комнаты
app.post('/api/rooms', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const roomData = req.body;
    
    // Проверяем, существует ли уже комната для этой станции и вагона
    const existingRoom = await client.query(
      `SELECT * FROM rooms WHERE station = $1 AND wagon = $2`,
      [roomData.station, roomData.wagon]
    );
    
    if (existingRoom.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Room already exists for this station and wagon' });
    }
    
    // Создаем комнату
    const roomResult = await client.query(
      `INSERT INTO rooms (host_user_id, host_user_name, station, wagon) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [roomData.hostUserId, roomData.hostUserName, roomData.station, roomData.wagon]
    );
    
    const room = roomResult.rows[0];
    
    // Обновляем пользователя
    await client.query(
      'UPDATE users SET room_id = $1 WHERE id = $2',
      [room.id, roomData.hostUserId]
    );
    
    await client.query('COMMIT');
    res.status(201).json(room);
  } catch (error) {
    await client.query('ROLLBACK');
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
    
    const { roomId, userId, station, wagon } = req.body;
    
    let room;
    
    // Если roomId не указан, ищем комнату по станции и вагону
    if (!roomId && station && wagon) {
      const roomResult = await client.query(
        'SELECT * FROM rooms WHERE station = $1 AND wagon = $2',
        [station, wagon]
      );
      
      if (roomResult.rows.length === 0) {
        // Создаем новую комнату если не найдена
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'User not found' });
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
    } else {
      // Используем указанный roomId
      const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
      if (roomResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Room not found' });
      }
      room = roomResult.rows[0];
    }
    
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Проверяем, не присоединен ли уже
    const existingJoin = await client.query(
      'SELECT * FROM room_users WHERE room_id = $1 AND user_id = $2',
      [room.id, userId]
    );
    
    if (existingJoin.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User already joined this room' });
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
        user.position,
        user.mood
      ]
    );
    
    // Обновляем пользователя
    await client.query(
      'UPDATE users SET room_id = $1, station = $2, wagon = $3 WHERE id = $4',
      [room.id, room.station, room.wagon, userId]
    );
    
    // Получаем обновленную комнату с участниками
    const updatedRoomResult = await client.query(`
      SELECT r.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ru.user_id,
                   'name', ru.user_name,
                   'station', ru.user_station,
                   'wagon', ru.user_wagon,
                   'color', ru.user_color,
                   'colorCode', ru.user_color_code,
                   'position', ru.user_position,
                   'mood', ru.user_mood
                 )
               ) FILTER (WHERE ru.user_id IS NOT NULL), '[]'
             ) as joined_users
      FROM rooms r
      LEFT JOIN room_users ru ON r.id = ru.room_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [room.id]);
    
    await client.query('COMMIT');
    res.json(updatedRoomResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
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
    
    // Удаляем пользователя из комнаты
    await client.query(
      'DELETE FROM room_users WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    
    // Обновляем пользователя
    await client.query(
      'UPDATE users SET room_id = NULL WHERE id = $1',
      [userId]
    );
    
    // Проверяем, нужно ли удалить комнату
    const roomUsersResult = await client.query(
      'SELECT COUNT(*) as count FROM room_users WHERE room_id = $1',
      [roomId]
    );
    
    const userCount = parseInt(roomUsersResult.rows[0].count);
    if (userCount === 0) {
      await client.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Получение комнаты пользователя
app.get('/api/rooms/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ru.user_id,
                   'name', ru.user_name,
                   'station', ru.user_station,
                   'wagon', ru.user_wagon,
                   'color', ru.user_color,
                   'colorCode', ru.user_color_code,
                   'position', ru.user_position,
                   'mood', ru.user_mood
                 )
               ) FILTER (WHERE ru.user_id IS NOT NULL), '[]'
             ) as joined_users
      FROM rooms r
      LEFT JOIN room_users ru ON r.id = ru.room_id
      WHERE r.host_user_id = $1 OR ru.user_id = $1
      GROUP BY r.id
    `, [userId]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение комнаты по ID
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ru.user_id,
                   'name', ru.user_name,
                   'station', ru.user_station,
                   'wagon', ru.user_wagon,
                   'color', ru.user_color,
                   'colorCode', ru.user_color_code,
                   'position', ru.user_position,
                   'mood', ru.user_mood
                 )
               ) FILTER (WHERE ru.user_id IS NOT NULL), '[]'
             ) as joined_users
      FROM rooms r
      LEFT JOIN room_users ru ON r.id = ru.room_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [roomId]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение комнаты по станции и вагону
app.get('/api/rooms/station/:station/:wagon', async (req, res) => {
  try {
    const { station, wagon } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ru.user_id,
                   'name', ru.user_name,
                   'station', ru.user_station,
                   'wagon', ru.user_wagon,
                   'color', ru.user_color,
                   'colorCode', ru.user_color_code,
                   'position', ru.user_position,
                   'mood', ru.user_mood
                 )
               ) FILTER (WHERE ru.user_id IS NOT NULL), '[]'
             ) as joined_users
      FROM rooms r
      LEFT JOIN room_users ru ON r.id = ru.room_id
      WHERE r.station = $1 AND r.wagon = $2
      GROUP BY r.id
    `, [station, wagon]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновление состояния пользователя в комнате
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
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Обновляем пользователя в комнате
    await client.query(
      `UPDATE room_users SET user_position = $1, user_mood = $2 
       WHERE user_id = $3`,
      [position, mood, userId]
    );
    
    await client.query('COMMIT');
    res.json(userUpdate.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Получение пользователей по станции и вагону
app.get('/api/users/station/:station/:wagon', async (req, res) => {
  try {
    const { station, wagon } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM users 
      WHERE station = $1 AND wagon = $2 AND online = true
      ORDER BY created_at DESC
    `, [station, wagon]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check и информация о системе
app.get('/', (req, res) => {
  res.json({ 
    message: '🚇 Metro API is running!',
    version: '2.0.0',
    features: [
      'User management with IP tracking',
      'Room-based user grouping',
      'Position and mood states',
      'Station statistics',
      'Auto-cleanup of inactive users'
    ],
    endpoints: [
      'GET /api/users',
      'POST /api/users',
      'PUT /api/users/:id',
      'DELETE /api/users/:id',
      'GET /api/stations',
      'GET /api/stations/stats',
      'POST /api/rooms',
      'POST /api/rooms/join',
      'POST /api/rooms/leave',
      'GET /api/rooms/user/:userId',
      'GET /api/rooms/:roomId',
      'GET /api/rooms/station/:station/:wagon',
      'PUT /api/rooms/user/:userId/state',
      'GET /api/users/station/:station/:wagon'
    ]
  });
});

// Обработка несуществующих маршрутов
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚇 Сервер "Из метро" запущен на порту ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📊 Версия: 2.0.0`);
  console.log(`🕒 Автоочистка неактивных пользователей включена`);
});