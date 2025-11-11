// Сказочные имена для мужчин и женщин
const maleNames = ['Иван-Царевич', 'Кощей Бессмертный', 'Добрыня Никитич', 'Леший', 'Водяной', 'Бабай', 'Соловей-Разбойник', 'Змей Горыныч'];
const femaleNames = ['Василиса Премудрая', 'Баба Яга', 'Царевна-Лягушка', 'Снегурочка', 'Марья-Искусница', 'Аленушка', 'Кикимора', 'Русалка'];
// Новые элементы для комнаты ожидания
const wagonSelect = document.getElementById('wagon-select');
const colorSelect = document.getElementById('color-select');
const waitingTimer = document.getElementById('waiting-room-timer');
const waitingTimerDisplay = document.getElementById('waiting-timer-display');
const waitingTimerStatus = document.getElementById('waiting-timer-status');
const waitingStartTimerBtn = document.getElementById('waiting-start-timer');
const waitingStopTimerBtn = document.getElementById('waiting-stop-timer');
const waitingTimerOptions = document.querySelectorAll('#waiting-timer-expanded .timer-option');
// Обработчики для таймера в комнате ожидания
waitingTimer.addEventListener('click', function() {
    document.getElementById('waiting-timer-expanded').classList.toggle('active');
});

waitingTimerOptions.forEach(btn => {
    btn.addEventListener('click', function() {
        waitingTimerOptions.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedMinutes = parseInt(this.getAttribute('data-minutes'));
        waitingTimerDisplay.textContent = `Готов к запуску: ${selectedMinutes} мин`;
    });
});

waitingStartTimerBtn.addEventListener('click', startTimer);
waitingStopTimerBtn.addEventListener('click', stopTimer);
// Станции метро
const stations = {
    spb: [
        'Адмиралтейская', 'Балтийская', 'Василеостровская', 'Владимирская', 'Гостиный двор',
        'Горьковская', 'Достоевская', 'Елизаровская', 'Звенигородская', 'Кировский завод',
        'Ладожская', 'Лиговский проспект', 'Ломоносовская', 'Маяковская', 'Невский проспект',
        'Обводный канал', 'Озерки', 'Парк Победы', 'Петроградская', 'Площадь Восстания',
        'Площадь Ленина', 'Приморская', 'Пролетарская', 'Проспект Ветеранов', 'Проспект Просвещения',
        'Пушкинская', 'Садовая', 'Сенная площадь', 'Спасская', 'Спортивная',
        'Старая Деревня', 'Технологический институт', 'Фрунзенская', 'Чернышевская', 'Чкаловская'
    ],
    moscow: [
        'Авиамоторная', 'Автозаводская', 'Академическая', 'Александровский сад', 'Алексеевская',
        'Алтуфьево', 'Аннино', 'Арбатская', 'Аэропорт', 'Бабушкинская',
        'Багратионовская', 'Баррикадная', 'Бауманская', 'Беговая', 'Белорусская',
        'Беляево', 'Бибирево', 'Библиотека им. Ленина', 'Боровицкая', 'Ботанический сад',
        'Братиславская', 'Бульвар Дмитрия Донского', 'Бунинская аллея', 'Варшавская', 'ВДНХ',
        'Владыкино', 'Водный стадион', 'Войковская', 'Волгоградский проспект', 'Волжская',
        'Воробьёвы горы', 'Выставочная', 'Выхино', 'Деловой центр', 'Динамо'
    ]
};

// API endpoints
const API_BASE = 'https://metro-backend-xlkt.onrender.com/api';

// Элементы DOM
const setupScreen = document.getElementById('setup-screen');
const waitingRoomScreen = document.getElementById('waiting-room-screen');
const joinedRoomScreen = document.getElementById('joined-room-screen');
const setupForm = document.getElementById('setup-form');
const backToSetupBtn = document.getElementById('back-to-setup');
const backToWaitingBtn = document.getElementById('back-to-waiting');
const requestsContainer = document.getElementById('requests-container');
const timerDisplay = document.getElementById('timer-display');
const startTimerBtn = document.getElementById('start-timer');
const stopTimerBtn = document.getElementById('stop-timer');
const timerOptions = document.querySelectorAll('.timer-option');
const compactTimer = document.getElementById('compact-timer');
const timerExpanded = document.getElementById('timer-expanded');
const timerStatus = document.getElementById('timer-status');
const positionCards = document.querySelectorAll('#position-cards .state-card');
const moodCards = document.querySelectorAll('#mood-cards .state-card');
const groupMembersContainer = document.getElementById('group-members');
const leaveGroupBtn = document.getElementById('leave-group');
const stationSelect = document.getElementById('station');
const metroMap = document.getElementById('metro-map');
const cityFilterSelect = document.getElementById('city-filter-select');
const joinSelectedStationBtn = document.getElementById('join-selected-station');
const stationDetails = document.getElementById('station-details');

// Элементы выбора города и пола
const cityOptions = document.querySelectorAll('.city-option');
const genderOptions = document.querySelectorAll('.gender-option');

// Текущий пользователь и состояние
let currentUser = null;
let timerInterval = null;
let timerSeconds = 0;
let userId = null;
let selectedMinutes = 5;
let selectedCity = 'spb';
let selectedGender = 'male';
let currentPosition = '';
let currentMood = '';
let currentGroup = null;
let currentSelectedStation = null;
let autoRefreshIntervals = [];

// Инициализация станций метро
function initializeStations() {
    stationSelect.innerHTML = '<option value="">Выберите станцию</option>';
    const cityStations = stations[selectedCity];
    cityStations.forEach(station => {
        const option = document.createElement('option');
        option.value = station;
        option.textContent = station;
        stationSelect.appendChild(option);
    });
}

// Обработчики выбора города
cityOptions.forEach(option => {
    option.addEventListener('click', function() {
        cityOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        selectedCity = this.getAttribute('data-city');
        initializeStations();
    });
});

// Обработчики выбора пола
genderOptions.forEach(option => {
    option.addEventListener('click', function() {
        genderOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        selectedGender = this.getAttribute('data-gender');
    });
});

// Компактный таймер
compactTimer.addEventListener('click', function() {
    timerExpanded.classList.toggle('active');
});

// Обработчики для карточек состояний
positionCards.forEach(card => {
    card.addEventListener('click', function() {
        positionCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        currentPosition = this.getAttribute('data-position');
        updateUserState();
    });
});

moodCards.forEach(card => {
    card.addEventListener('click', function() {
        moodCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        currentMood = this.getAttribute('data-mood');
        updateUserState();
    });
});

// Функции API
async function createUser(userData) {
    try {
        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка создания пользователя');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        throw error;
    }
}

async function getUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        const users = await response.json();
        return users.map((user, index) => ({
            ...user,
            id: user.id || index + 1
        }));
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        return [];
    }
}

async function updateUser(userId, updates) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        return await response.json();
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        return null;
    }
}

async function deleteUser(userId) {
    try {
        await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
    }
}

async function pingActivity() {
    if (userId) {
        try {
            await fetch(`${API_BASE}/users/${userId}/ping`, { method: 'POST' });
            console.log('✅ Активность обновлена');
            return true;
        } catch (error) {
            console.error('Ошибка пинга активности:', error);
            return false;
        }
    }
}

// Функция загрузки карты станций
async function loadStationsMap() {
    try {
        const response = await fetch(`${API_BASE}/stations/waiting-room?city=${selectedCity}`);
        const stationsData = await response.json();
        
        metroMap.innerHTML = '';
        const allStations = stations[selectedCity];
        const stationsMap = {};
        
        stationsData.forEach(station => {
            stationsMap[station.station] = station;
        });
        
        allStations.forEach(stationName => {
            const stationData = stationsMap[stationName];
            const stationElement = document.createElement('div');
            stationElement.className = 'station-map-item';
            
            let userCount = 0;
            let waitingCount = 0;
            let connectedCount = 0;
            let stationClass = 'empty';
            
            if (stationData) {
                userCount = stationData.totalUsers;
                waitingCount = stationData.waiting;
                connectedCount = stationData.connected;
                
                if (connectedCount > 0) {
                    stationClass = 'connected';
                } else if (waitingCount > 0) {
                    stationClass = 'waiting';
                }
            }
            
            stationElement.classList.add(stationClass);
            stationElement.setAttribute('data-station', stationName);
            
            stationElement.innerHTML = `
                <div class="station-name">${stationName}</div>
                ${userCount > 0 ? `
                    <div class="station-counts">
                        ${waitingCount > 0 ? `<span class="station-count count-waiting">${waitingCount}⏳</span>` : ''}
                        ${connectedCount > 0 ? `<span class="station-count count-connected">${connectedCount}✅</span>` : ''}
                    </div>
                ` : '<div style="font-size: 10px; color: #666;">Пусто</div>'}
            `;
            
            stationElement.addEventListener('click', () => selectStation(stationName, stationData));
            metroMap.appendChild(stationElement);
        });


        // Обновить легенду с общими цифрами
            const legendItems = document.querySelectorAll('.legend-item');
            legendItems.forEach(item => {
                const text = item.textContent;
                if (text.includes('Выбрали станцию')) {
                    item.innerHTML = `<div class="legend-color connected"></div>
                                    <span>Выбрали станцию: ${data.totalStats.total_connected}</span>`;
                } else if (text.includes('В режиме ожидания')) {
                    item.innerHTML = `<div class="legend-color waiting"></div>
                                    <span>В режиме ожидания: ${data.totalStats.total_waiting}</span>`;
                }
            });
        
    } catch (error) {
        console.error('Ошибка загрузки карты станций:', error);
        metroMap.innerHTML = `
            <div class="no-requests">
                <p>Ошибка загрузки карты</p>
                <button class="btn" onclick="loadStationsMap()">Попробовать снова</button>
            </div>
        `;
    }
}

// Функция выбора станции на карте
function selectStation(stationName, stationData) {
    currentSelectedStation = stationName;
    
    document.querySelectorAll('.station-map-item').forEach(item => {
        item.style.borderWidth = '2px';
    });
    
    const selectedElement = document.querySelector(`[data-station="${stationName}"]`);
    if (selectedElement) {
        selectedElement.style.borderWidth = '4px';
    }
    
    const stationNameElement = document.getElementById('selected-station-name');
    const statWaiting = document.getElementById('stat-waiting');
    const statConnected = document.getElementById('stat-connected');
    const statTotal = document.getElementById('stat-total');
    
    stationNameElement.textContent = stationName;
    
    if (stationData) {
        statWaiting.textContent = stationData.waiting;
        statConnected.textContent = stationData.connected;
        statTotal.textContent = stationData.totalUsers;
    } else {
        statWaiting.textContent = '0';
        statConnected.textContent = '0';
        statTotal.textContent = '0';
    }
    
    stationDetails.style.display = 'block';
    stationDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Функция присоединения к станции
async function joinStation(station) {
    try {
        const response = await fetch(`${API_BASE}/rooms/join-station`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                station: station
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка присоединения к станции');
        }
        
        const result = await response.json();
        
        if (result.success) {
            currentGroup = {
                station: station,
                users: result.users
            };
            
            waitingRoomScreen.classList.remove('active');
            joinedRoomScreen.classList.add('active');
            
            loadGroupMembers();
            console.log(`✅ Успешно присоединились к станции ${station}`);
        }
        
    } catch (error) {
        console.error('Ошибка при присоединении к станции:', error);
        alert('Ошибка при присоединении к станции: ' + error.message);
    }
}

// Функция загрузки участников группы
async function loadGroupMembers() {
    if (!currentGroup) return;
    
    const users = await getUsers();
    const groupUsers = users.filter(user => 
        user.station === currentGroup.station && 
        user.is_connected === true
    );
    
    groupMembersContainer.innerHTML = '';
    
    if (groupUsers.length === 0) {
        groupMembersContainer.innerHTML = '<div class="no-requests">Нет участников</div>';
        return;
    }
    
    groupUsers.forEach(user => {
        const memberElement = document.createElement('div');
        memberElement.className = 'user-state-display';
        memberElement.innerHTML = `
            <div style="width: 50px; height: 50px; border-radius: 50%; background: ${user.color_code || '#007bff'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">
                ${user.name.charAt(0)}
            </div>
            <div class="user-state-info">
                <div class="user-state-name">${user.name} ${user.id === userId ? '(Вы)' : ''}</div>
                <div class="user-state-details">
                    ${user.position || 'Позиция не указана'} • ${user.mood || 'Настроение не указано'}
                </div>
            </div>
            ${user.position ? `<div class="state-badge">${user.position}</div>` : ''}
        `;
        groupMembersContainer.appendChild(memberElement);
    });
}

// Функция обновления состояния пользователя
async function updateUserState() {
    if (userId && (currentPosition || currentMood)) {
        const stateText = [currentPosition, currentMood].filter(Boolean).join(' | ');
        await updateUser(userId, { 
            status: stateText || 'Ожидание',
            position: currentPosition,
            mood: currentMood
        });
        loadGroupMembers();
    }
}

// Функция загрузки пользователей
async function loadRequests() {
    const users = await getUsers();
    requestsContainer.innerHTML = '';
    
    const filteredUsers = users.filter(user => 
        user.city === selectedCity && 
        user.online === true
    );
    
    if (filteredUsers.length === 0) {
        requestsContainer.innerHTML = `
            <div class="no-requests">
                <h3>Пока нет пользователей на станциях ${selectedCity === 'spb' ? 'Санкт-Петербурга' : 'Москвы'}</h3>
                <p>Будьте первым - выберите станцию на карте выше!</p>
            </div>
        `;
        return;
    }
    
    const usersByStation = {};
    filteredUsers.forEach(user => {
        if (!usersByStation[user.station]) {
            usersByStation[user.station] = [];
        }
        usersByStation[user.station].push(user);
    });
    
    const sortedStations = Object.keys(usersByStation).sort((a, b) => 
        usersByStation[b].length - usersByStation[a].length
    );
    
    sortedStations.forEach(station => {
        const stationUsers = usersByStation[station];
        
        const stationHeader = document.createElement('div');
        stationHeader.className = 'station-header-card';
        stationHeader.innerHTML = `
            <div class="station-title">
                <strong>${station}</strong>
                <span class="user-count-badge">${stationUsers.length} пользователей</span>
            </div>
        `;
        requestsContainer.appendChild(stationHeader);
        
        stationUsers.forEach(user => {
            const requestCard = document.createElement('div');
            requestCard.className = 'request-card';
            const isCurrentUser = userId && user.id === userId;
            
            requestCard.innerHTML = `
                <div class="request-header">
                    <div class="user-info-compact">
                        <div class="user-avatar-small">${user.name.charAt(0)}</div>
                        <div class="user-details">
                            <div class="user-name">${user.name} ${isCurrentUser ? '(Вы)' : ''}</div>
                            <div class="user-status">
                                <span class="color-indicator" style="background-color: ${user.color_code || '#007bff'}"></span>
                                ${user.color} • ${user.status}
                            </div>
                        </div>
                    </div>
                    ${user.wagon && user.wagon !== 'Не указан' ? `<div class="wagon">Вагон ${user.wagon}</div>` : ''}
                </div>
                
                ${user.position ? `<div class="status-info"><strong>Позиция:</strong> ${user.position}</div>` : ''}
                ${user.mood ? `<div class="status-info"><strong>Настроение:</strong> ${user.mood}</div>` : ''}
                
                <div class="user-connections">
                    <div class="connections-count">
                        ${user.is_waiting ? '⏳ Ожидает присоединения' : '✅ Соединился с другими'}
                    </div>
                </div>
            `;
            
            requestsContainer.appendChild(requestCard);
        });
    });
}

// Функция запуска автообновления
function startAutoRefresh() {
    // Очищаем предыдущие интервалы
    autoRefreshIntervals.forEach(interval => clearInterval(interval));
    autoRefreshIntervals = [];
    
    // // Обновляем карту каждые 2 секунды
    // autoRefreshIntervals.push(setInterval(() => {
    //     loadStationsMap();
    // }, 2000));
    
    // Обновляем список пользователей каждые 3 секунды
    autoRefreshIntervals.push(setInterval(() => {
        loadRequests();
    }, 3000));
    
    // Пинг активности каждые 20 секунд
    autoRefreshIntervals.push(setInterval(() => {
        pingActivity();
    }, 20000));
    
    console.log('🔄 Автообновление запущено');
}

// Обработчики событий
setupForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const station = document.getElementById('station').value;
    const wagon = document.getElementById('wagon').value || 'Не указан';
    const color = document.getElementById('color').value;
    
    if (!station) {
        alert('Пожалуйста, выберите станцию метро');
        return;
    }
    
    if (!color) {
        alert('Пожалуйста, укажите цвет верхней одежды');
        return;
    }
    
    // Генерация сказочного имени
    const getRandomName = (gender) => {
        const names = gender === 'male' ? maleNames : femaleNames;
        return names[Math.floor(Math.random() * names.length)];
    };
    
    const randomName = getRandomName(selectedGender);
    
    const userData = {
        name: randomName,
        station: '',
        wagon: '',
        color: '',
        colorCode: getRandomColor(),
        status: 'Ожидание',
        timer: "00:00",
        online: true,
        city: selectedCity,
        gender: selectedGender,
        position: '',
        mood: '',
        isWaiting: true,
        isConnected: false
    };
    
    try {
        const createdUser = await createUser(userData);
        
        if (createdUser) {
            currentUser = createdUser;
            userId = createdUser.id;
            
            setupScreen.classList.remove('active');
            waitingRoomScreen.classList.add('active');
            
            loadStationsMap();
            loadRequests();
            startAutoRefresh();
        }
    } catch (error) {
        alert(error.message || 'Ошибка создания профиля. Проверьте подключение к серверу.');
    }
});

backToSetupBtn.addEventListener('click', async function() {
    if (userId) {
        try {
            await deleteUser(userId);
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
        }
    }
    
    // Останавливаем автообновление
    autoRefreshIntervals.forEach(interval => clearInterval(interval));
    autoRefreshIntervals = [];
    
    waitingRoomScreen.classList.remove('active');
    setupScreen.classList.add('active');
    stopTimer();
    currentUser = null;
    userId = null;
});

backToWaitingBtn.addEventListener('click', function() {
    joinedRoomScreen.classList.remove('active');
    waitingRoomScreen.classList.add('active');
});

leaveGroupBtn.addEventListener('click', async function() {
    if (userId) {
        try {
            await updateUser(userId, { 
                status: 'Ожидание',
                position: '',
                mood: '',
                is_waiting: true,
                is_connected: false
            });
        } catch (error) {
            console.error('Ошибка при обновлении пользователя:', error);
        }
    }
    currentGroup = null;
    joinedRoomScreen.classList.remove('active');
    waitingRoomScreen.classList.add('active');
});

// Обработчики таймера
startTimerBtn.addEventListener('click', startTimer);
stopTimerBtn.addEventListener('click', stopTimer);

timerOptions.forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.timer-option').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedMinutes = parseInt(this.getAttribute('data-minutes'));
        timerDisplay.textContent = `Готов к запуску: ${selectedMinutes} мин`;
    });
});

// Обработчик фильтра по городу
cityFilterSelect.addEventListener('change', function() {
    selectedCity = this.value;
    loadStationsMap();
    loadRequests();
});

// Обработчик присоединения к выбранной станции
joinSelectedStationBtn.addEventListener('click', function() {
    if (currentSelectedStation) {
        joinStation(currentSelectedStation);
    } else {
        alert('Пожалуйста, выберите станцию на карте');
    }
});

// Функции таймера
function startTimer() {
    if (timerInterval) return;
    
    timerSeconds = selectedMinutes * 60;
    updateTimerDisplay();
    
    timerInterval = setInterval(async function() {
        timerSeconds--;
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            stopTimer();
            alert('Время ожидания истекло!');
        }
        
        if (userId) {
            try {
                await updateUser(userId, { 
                    timer: formatTime(timerSeconds),
                    timerTotal: selectedMinutes * 60
                });
            } catch (error) {
                console.error('Ошибка при обновлении таймера:', error);
            }
        }
    }, 1000);
    
    startTimerBtn.disabled = true;
    stopTimerBtn.disabled = false;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    timerSeconds = 0;
    timerDisplay.textContent = 'Не запущен';
    timerStatus.textContent = 'Не активен';
    timerStatus.style.color = '#666';
    
    startTimerBtn.disabled = false;
    stopTimerBtn.disabled = true;
    
    if (userId) {
        try {
            updateUser(userId, { 
                timer: "Не запущен",
                timerTotal: 0
            });
        } catch (error) {
            console.error('Ошибка при остановке таймера:', error);
        }
    }
}

function updateTimerDisplay() {
    if (timerSeconds <= 0) {
        timerDisplay.textContent = 'Время истекло';
        timerStatus.textContent = 'Истекло';
        timerStatus.style.color = '#dc3545';
    } else {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerStatus.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerStatus.style.color = '#28a745';
    }
}

// Вспомогательные функции
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getRandomColor() {
    const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Инициализация
window.addEventListener('load', function() {
    initializeStations();
    document.querySelector('.timer-option[data-minutes="5"]').classList.add('active');
    cityFilterSelect.value = selectedCity;
    
    console.log('🚇 Приложение "Из метро" инициализировано');
    console.log('🔄 Автообновление каждые 2-3 секунды');
});

window.addEventListener('beforeunload', async function() {
    if (userId) {
        try {
            await deleteUser(userId);
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
        }
    }
    
    // Останавливаем автообновление
    autoRefreshIntervals.forEach(interval => clearInterval(interval));
});

// Пинг активности при действиях пользователя
document.addEventListener('click', pingActivity);
document.addEventListener('keypress', pingActivity);