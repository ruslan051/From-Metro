const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let users = [];
let rooms = [];
let nextId = 1;
let nextRoomId = 1;

// Функция для генерации случайного цвета
function getRandomColor() {
    const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
    return colors[Math.floor(Math.random() * colors.length)];
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API Routes
    if (pathname === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(users));
    }
    else if (pathname === '/api/users' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const userData = JSON.parse(body);
                const user = {
                    id: nextId++,
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
                    createdAt: new Date().toISOString()
                };
                users.push(user);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(user));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    else if (pathname.startsWith('/api/users/') && req.method === 'PUT') {
        const userId = parseInt(pathname.split('/')[3]);
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const updates = JSON.parse(body);
                const userIndex = users.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    if (updates.status && updates.status !== users[userIndex].status) {
                        updates.statusUpdated = true;
                    }
                    users[userIndex] = { ...users[userIndex], ...updates };
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(users[userIndex]));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User not found' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    else if (pathname.startsWith('/api/users/') && req.method === 'DELETE') {
        const userId = parseInt(pathname.split('/')[3]);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            const user = users[userIndex];
            if (user.roomId) {
                const roomIndex = rooms.findIndex(r => r.id === user.roomId);
                if (roomIndex !== -1) {
                    rooms[roomIndex].joinedUsers = rooms[roomIndex].joinedUsers.filter(u => u.id !== userId);
                    if (rooms[roomIndex].joinedUsers.length === 0 && rooms[roomIndex].hostUserId !== userId) {
                        rooms.splice(roomIndex, 1);
                    }
                }
            }
            users.splice(userIndex, 1);
            res.writeHead(204);
            res.end();
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'User not found' }));
        }
    }
    else if (pathname === '/api/stations' && req.method === 'GET') {
        const stationStats = {};
        users.forEach(user => {
            if (user.online) {
                stationStats[user.station] = (stationStats[user.station] || 0) + 1;
            }
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stationStats));
    }
    else if (pathname === '/api/rooms' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const roomData = JSON.parse(body);
                const room = {
                    id: nextRoomId++,
                    hostUserId: roomData.hostUserId,
                    hostUserName: roomData.hostUserName,
                    station: roomData.station,
                    joinedUsers: [],
                    createdAt: new Date().toISOString()
                };
                rooms.push(room);
                
                const hostUserIndex = users.findIndex(u => u.id === roomData.hostUserId);
                if (hostUserIndex !== -1) {
                    users[hostUserIndex].roomId = room.id;
                }
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(room));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    else if (pathname === '/api/rooms/join' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const joinData = JSON.parse(body);
                const roomId = joinData.roomId;
                const userId = joinData.userId;
                
                const roomIndex = rooms.findIndex(r => r.id === roomId);
                const userIndex = users.findIndex(u => u.id === userId);
                
                if (roomIndex !== -1 && userIndex !== -1) {
                    const user = users[userIndex];
                    
                    const alreadyJoined = rooms[roomIndex].joinedUsers.some(u => u.id === userId);
                    if (!alreadyJoined) {
                        rooms[roomIndex].joinedUsers.push({
                            id: user.id,
                            name: user.name,
                            station: user.station,
                            wagon: user.wagon,
                            color: user.color,
                            colorCode: user.colorCode
                        });
                        
                        users[userIndex].roomId = roomId;
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(rooms[roomIndex]));
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'User already joined this room' }));
                    }
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Room or user not found' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    else if (pathname === '/api/rooms/leave' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const leaveData = JSON.parse(body);
                const roomId = leaveData.roomId;
                const userId = leaveData.userId;
                
                const roomIndex = rooms.findIndex(r => r.id === roomId);
                const userIndex = users.findIndex(u => u.id === userId);
                
                if (roomIndex !== -1 && userIndex !== -1) {
                    rooms[roomIndex].joinedUsers = rooms[roomIndex].joinedUsers.filter(u => u.id !== userId);
                    users[userIndex].roomId = null;
                    
                    if (rooms[roomIndex].joinedUsers.length === 0 && rooms[roomIndex].hostUserId !== userId) {
                        rooms.splice(roomIndex, 1);
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Room or user not found' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    else if (pathname.startsWith('/api/rooms/user/') && req.method === 'GET') {
        const userId = parseInt(pathname.split('/')[4]);
        const userRoom = rooms.find(r => r.hostUserId === userId || r.joinedUsers.some(u => u.id === userId));
        
        if (userRoom) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(userRoom));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Room not found' }));
        }
    }
    else if (pathname.startsWith('/api/rooms/') && req.method === 'GET') {
        const roomId = parseInt(pathname.split('/')[3]);
        const room = rooms.find(r => r.id === roomId);
        
        if (room) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(room));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Room not found' }));
        }
    }
    // Serve static files
    else {
        let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname.substring(1));
        
        if (filePath === path.join(__dirname, '')) {
            filePath = path.join(__dirname, 'index.html');
        }

        const extname = path.extname(filePath);
        let contentType = 'text/html';
        
        switch (extname) {
            case '.js': contentType = 'text/javascript'; break;
            case '.css': contentType = 'text/css'; break;
            case '.json': contentType = 'application/json'; break;
        }

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
                        if (err) {
                            res.writeHead(404);
                            res.end('File not found');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(content);
                        }
                    });
                } else {
                    res.writeHead(500);
                    res.end('Server error: ' + err.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚇 Сервер "Из метро" запущен:`);
    console.log(`📍 Локально: http://localhost:${PORT}`);
    console.log(`📱 В сети: http://ВАШ_IP:${PORT}`);
    console.log('Убедитесь, что компьютер и телефон в одной Wi-Fi сети!');
});

// Cleanup every 5 minutes
setInterval(() => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    users = users.filter(user => new Date(user.createdAt) > fiveMinutesAgo);
    
    rooms = rooms.filter(room => {
        const hasUsers = users.some(user => user.roomId === room.id);
        return hasUsers || new Date(room.createdAt) > fiveMinutesAgo;
    });
}, 5 * 60 * 1000);