import express from 'express';
import cors from 'cors';
import pkg from 'pg';

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDB() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        station VARCHAR(255) NOT NULL,
        wagon VARCHAR(50),
        color VARCHAR(100),
        color_code VARCHAR(7),
        status VARCHAR(255) DEFAULT 'Жду на станции',
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

    // Rooms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        host_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        host_user_name VARCHAR(255),
        station VARCHAR(255),
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
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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

// API Routes
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    const result = await pool.query(
      `INSERT INTO users (name, station, wagon, color, color_code, status, timer, timer_total, city, gender) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        userData.name,
        userData.station,
        userData.wagon || null,
        userData.color,
        userData.colorCode || getRandomColor(),
        userData.status || 'Жду на станции',
        userData.timer || '00:00',
        userData.timerTotal || 0,
        userData.city || 'spb',
        userData.gender || 'male'
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
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
      gender: 'gender'
    };
    
    Object.keys(updates).forEach(key => {
      if (fieldMapping[key] && key !== 'id') {
        setClause.push(`${fieldMapping[key]} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });
    
    if (updates.status) {
      setClause.push('status_updated = $' + paramCount);
      values.push(true);
      paramCount++;
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Удаляем пользователя из комнат
    await pool.query('DELETE FROM room_users WHERE user_id = $1', [id]);
    
    // Удаляем комнаты где пользователь был хостом
    await pool.query('DELETE FROM rooms WHERE host_user_id = $1', [id]);
    
    // Удаляем пользователя
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    if (result.rowCount === 1) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT station, COUNT(*) as count FROM users WHERE online = true GROUP BY station'
    );
    
    const stats = {};
    result.rows.forEach(row => {
      stats[row.station] = parseInt(row.count);
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const roomData = req.body;
    
    // Создаем комнату
    const roomResult = await client.query(
      `INSERT INTO rooms (host_user_id, host_user_name, station) 
       VALUES ($1, $2, $3) RETURNING *`,
      [roomData.hostUserId, roomData.hostUserName, roomData.station]
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

app.post('/api/rooms/join', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { roomId, userId } = req.body;
    
    // Проверяем существование комнаты и пользователя
    const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (roomResult.rows.length === 0 || userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Room or user not found' });
    }
    
    const room = roomResult.rows[0];
    const user = userResult.rows[0];
    
    // Проверяем, не присоединен ли уже
    const existingJoin = await client.query(
      'SELECT * FROM room_users WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    
    if (existingJoin.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User already joined this room' });
    }
    
    // Добавляем пользователя в комнату
    await client.query(
      `INSERT INTO room_users (room_id, user_id, user_name, user_station, user_wagon, user_color, user_color_code) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [roomId, userId, user.name, user.station, user.wagon, user.color, user.color_code]
    );
    
    // Обновляем пользователя
    await client.query(
      'UPDATE users SET room_id = $1 WHERE id = $2',
      [roomId, userId]
    );
    
    // Получаем обновленную комнату с участниками
    const updatedRoom = await client.query(`
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', ru.user_id,
                 'name', ru.user_name,
                 'station', ru.user_station,
                 'wagon', ru.user_wagon,
                 'color', ru.user_color,
                 'colorCode', ru.user_color_code
               )
             ) as joined_users
      FROM rooms r
      LEFT JOIN room_users ru ON r.id = ru.room_id
      WHERE r.id = $1
      GROUP BY r.id
    `, [roomId]);
    
    await client.query('COMMIT');
    res.json(updatedRoom.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

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
    const roomUsers = await client.query(
      'SELECT COUNT(*) as count FROM room_users WHERE room_id = $1',
      [roomId]
    );
    
    if (parseInt(roomUsers.rows[0].count) === 0) {
      const room = await client.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
      if (room.rows.length > 0 && room.rows[0].host_user_id !== userId) {
        await client.query('DELETE FROM rooms WHERE id = $1', [roomId]);
      }
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

app.get('/api/rooms/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', ru.user_id,
                 'name', ru.user_name,
                 'station', ru.user_station,
                 'wagon', ru.user_wagon,
                 'color', ru.user_color,
                 'colorCode', ru.user_color_code
               )
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

app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, 
             json_agg(
               json_build_object(
                 'id', ru.user_id,
                 'name', ru.user_name,
                 'station', ru.user_station,
                 'wagon', ru.user_wagon,
                 'color', ru.user_color,
                 'colorCode', ru.user_color_code
               )
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

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🚇 Metro API is running!',
    version: '1.0.0',
    endpoints: [
      'GET /api/users',
      'POST /api/users',
      'PUT /api/users/:id',
      'DELETE /api/users/:id',
      'GET /api/stations',
      'POST /api/rooms',
      'POST /api/rooms/join',
      'POST /api/rooms/leave',
      'GET /api/rooms/user/:userId',
      'GET /api/rooms/:roomId'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚇 Сервер "Из метро" запущен на порту ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
});
