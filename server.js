import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/metro';
let db, usersCollection, roomsCollection;

async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    usersCollection = db.collection('users');
    roomsCollection = db.collection('rooms');
    
    // Создаем индексы
    await usersCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 }); // Автоудаление через 5 минут
    await roomsCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 });
    
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

connectDB();

// Функция для генерации случайного цвета
function getRandomColor() {
  const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// API Routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    const user = {
      name: userData.name,
      station: userData.station,
      wagon: userData.wagon,
      color: userData.color,
      colorCode: userData.colorCode || getRandomColor(),
      status: userData.status || 'Жду на станции',
      timer: userData.timer || '00:00',
      timerTotal: userData.timerTotal || 0,
      online: true,
      statusUpdated: false,
      roomId: null,
      city: userData.city || 'spb',
      gender: userData.gender || 'male',
      createdAt: new Date()
    };
    
    const result = await usersCollection.insertOne(user);
    const createdUser = { ...user, _id: result.insertedId };
    
    res.status(201).json(createdUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.status) {
      updates.statusUpdated = true;
    }
    
    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    
    if (result.value) {
      res.json(result.value);
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
    
    // Находим пользователя перед удалением
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    
    if (user && user.roomId) {
      // Удаляем пользователя из комнаты
      await roomsCollection.updateOne(
        { _id: new ObjectId(user.roomId) },
        { $pull: { joinedUsers: { id: user._id.toString() } } }
      );
      
      // Проверяем, нужно ли удалить комнату
      const room = await roomsCollection.findOne({ _id: new ObjectId(user.roomId) });
      if (room && room.joinedUsers.length === 0 && room.hostUserId !== user._id.toString()) {
        await roomsCollection.deleteOne({ _id: new ObjectId(user.roomId) });
      }
    }
    
    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 1) {
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
    const stationStats = await usersCollection.aggregate([
      { $match: { online: true } },
      { $group: { _id: '$station', count: { $sum: 1 } } }
    ]).toArray();
    
    const stats = {};
    stationStats.forEach(stat => {
      stats[stat._id] = stat.count;
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const roomData = req.body;
    const room = {
      hostUserId: roomData.hostUserId,
      hostUserName: roomData.hostUserName,
      station: roomData.station,
      joinedUsers: [],
      createdAt: new Date()
    };
    
    const result = await roomsCollection.insertOne(room);
    const createdRoom = { ...room, _id: result.insertedId };
    
    // Обновляем пользователя
    await usersCollection.updateOne(
      { _id: new ObjectId(roomData.hostUserId) },
      { $set: { roomId: result.insertedId.toString() } }
    );
    
    res.status(201).json(createdRoom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms/join', async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    
    const room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!room || !user) {
      return res.status(404).json({ error: 'Room or user not found' });
    }
    
    // Проверяем, не присоединен ли уже пользователь
    const alreadyJoined = room.joinedUsers.some(u => u.id === userId);
    if (alreadyJoined) {
      return res.status(400).json({ error: 'User already joined this room' });
    }
    
    // Добавляем пользователя в комнату
    const joinedUser = {
      id: user._id.toString(),
      name: user.name,
      station: user.station,
      wagon: user.wagon,
      color: user.color,
      colorCode: user.colorCode
    };
    
    await roomsCollection.updateOne(
      { _id: new ObjectId(roomId) },
      { $push: { joinedUsers: joinedUser } }
    );
    
    // Обновляем пользователя
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { roomId: roomId } }
    );
    
    // Получаем обновленную комнату
    const updatedRoom = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms/leave', async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    
    // Удаляем пользователя из комнаты
    await roomsCollection.updateOne(
      { _id: new ObjectId(roomId) },
      { $pull: { joinedUsers: { id: userId } } }
    );
    
    // Обновляем пользователя
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { roomId: null } }
    );
    
    // Проверяем, нужно ли удалить комнату
    const room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
    if (room && room.joinedUsers.length === 0 && room.hostUserId !== userId) {
      await roomsCollection.deleteOne({ _id: new ObjectId(roomId) });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const room = await roomsCollection.findOne({
      $or: [
        { hostUserId: userId },
        { 'joinedUsers.id': userId }
      ]
    });
    
    if (room) {
      res.json(room);
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
    const room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
    
    if (room) {
      res.json(room);
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
