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
let globalRefreshInterval = null;

// Сказочные имена для мужчин и женщин
const maleNames = ['Иван-Царевич', 'Кощей Бессмертный', 'Добрыня Никитич', 'Леший', 'Водяной', 'Бабай', 'Соловей-Разбойник', 'Змей Горыныч'];
const femaleNames = ['Василиса Премудрая', 'Баба Яга', 'Царевна-Лягушка', 'Снегурочка', 'Марья-Искусница', 'Аленушка', 'Кикимора', 'Русалка'];

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

// Глобальные переменные для DOM элементов
let setupScreen, waitingRoomScreen, joinedRoomScreen;
let backToSetupBtn, backToWaitingBtn, leaveGroupBtn;
let groupMembersContainer, metroMap;
let wagonSelect, colorSelect, waitingTimer, waitingTimerDisplay, waitingTimerStatus;
let waitingStartTimerBtn, waitingStopTimerBtn, waitingTimerOptions, waitingTimerExpanded;
let positionCards, moodCards;
let enterWaitingRoomBtn, confirmStationBtn;
let requestsContainer; // ВОССТАНОВИЛ для отображения пользователей

// Безопасное получение элементов
function getElementSafe(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`❌ Элемент ${id} не найден`);
    }
    return element;
}

// Инициализация всех DOM элементов
function initializeDOMElements() {
    console.log('🔧 Инициализация DOM элементов...');
    
    // Основные экраны
    setupScreen = getElementSafe('setup-screen');
    waitingRoomScreen = getElementSafe('waiting-room-screen');
    joinedRoomScreen = getElementSafe('joined-room-screen');
    
    // Кнопки навигации
    backToSetupBtn = getElementSafe('back-to-setup');
    backToWaitingBtn = getElementSafe('back-to-waiting');
    leaveGroupBtn = getElementSafe('leave-group');
    enterWaitingRoomBtn = getElementSafe('enter-waiting-room');
    confirmStationBtn = getElementSafe('confirm-station');
    
    // Элементы комнаты ожидания
    wagonSelect = getElementSafe('wagon-select');
    colorSelect = getElementSafe('color-select');
    waitingTimer = getElementSafe('waiting-room-timer');
    waitingTimerDisplay = getElementSafe('waiting-timer-display');
    waitingTimerStatus = getElementSafe('waiting-timer-status');
    waitingStartTimerBtn = getElementSafe('waiting-start-timer');
    waitingStopTimerBtn = getElementSafe('waiting-stop-timer');
    waitingTimerExpanded = getElementSafe('waiting-timer-expanded');
    waitingTimerOptions = document.querySelectorAll('#waiting-timer-expanded .timer-option');
    
    // Карта и группы
    metroMap = getElementSafe('metro-map');
    groupMembersContainer = getElementSafe('group-members');
    
    // Контейнер для запросов (ВОССТАНОВИЛ)
    requestsContainer = getElementSafe('requests-container');
    
    // Карточки состояний
    positionCards = document.querySelectorAll('#position-cards .state-card');
    moodCards = document.querySelectorAll('#mood-cards .state-card');
    
    console.log('✅ DOM элементы инициализированы');
}

async function handleEnterWaitingRoom() {
    console.log('🚪 Вход в комнату ожидания');
    
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
        status: 'В режиме ожидания',
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
            loadRequests(); // ВОССТАНОВИЛ загрузку запросов
            startGlobalRefresh();
            
            console.log('✅ Пользователь создан:', createdUser.name);
        }
    } catch (error) {
        alert(error.message || 'Ошибка создания профиля. Проверьте подключение к серверу.');
    }
}

function handleBackToSetup() {
    console.log('🔙 Назад к настройкам');
    setupScreen.classList.add('active');
    waitingRoomScreen.classList.remove('active');
    stopGlobalRefresh();
}

function handleBackToWaiting() {
    console.log('🔙 Назад к ожиданию');
    waitingRoomScreen.classList.add('active');
    joinedRoomScreen.classList.remove('active');
}

async function handleConfirmStation() {
    console.log('✅ Подтверждаем станцию');
    const wagon = wagonSelect ? wagonSelect.value || '' : '';
    const color = colorSelect ? colorSelect.value : '';
    
    if (!color) {
        alert('Пожалуйста, укажите цвет верхней одежды');
        return;
    }
    
    if (!currentSelectedStation) {
        alert('Пожалуйста, выберите станцию на карте');
        return;
    }
    
    if (userId) {
        try {
            await updateUser(userId, {
                station: currentSelectedStation,
                wagon: wagon,
                color: color,
                is_waiting: false,
                is_connected: true,
                status: 'Выбрал станцию: ' + currentSelectedStation
            });
            
            await joinStation(currentSelectedStation);
            
        } catch (error) {
            console.error('Ошибка при обновлении параметров:', error);
            alert('Ошибка: ' + error.message);
        }
    }
}

function initializeCityAndGenderSelection() {
    // Обработчики выбора города
    const cityOptions = document.querySelectorAll('.city-option');
    cityOptions.forEach(option => {
        option.addEventListener('click', function() {
            cityOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedCity = this.getAttribute('data-city');
            console.log('📍 Выбран город:', selectedCity);
        });
    });

    // Обработчики выбора пола
    const genderOptions = document.querySelectorAll('.gender-option');
    genderOptions.forEach(option => {
        option.addEventListener('click', function() {
            genderOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedGender = this.getAttribute('data-gender');
            console.log('👤 Выбран пол:', selectedGender);
        });
    });
}

async function handleLeaveGroup() {
    console.log('🚪 Покидаем группу');
    
    if (userId) {
        try {
            await updateUser(userId, { 
                status: 'Ожидание',
                is_waiting: true,
                is_connected: false,
            });
        } catch (error) {
            console.error('Ошибка при обновлении пользователя:', error);
        }
    }
    
    currentGroup = null;
    joinedRoomScreen.classList.remove('active');
    waitingRoomScreen.classList.add('active');
    
    console.log('✅ Вышли из группы');
}

// Инициализация таймера в комнате ожидания
function initializeWaitingRoomTimer() {
    if (waitingTimer && waitingTimerExpanded) {
        waitingTimer.addEventListener('click', function() {
            waitingTimerExpanded.classList.toggle('active');
        });
        console.log('✅ Таймер комнаты ожидания инициализирован');
    }
    
    if (waitingStartTimerBtn) {
        waitingStartTimerBtn.addEventListener('click', startTimer);
    }
    
    if (waitingStopTimerBtn) {
        waitingStopTimerBtn.addEventListener('click', stopTimer);
    }
    
    if (waitingTimerOptions.length > 0) {
        waitingTimerOptions.forEach(btn => {
            btn.addEventListener('click', function() {
                waitingTimerOptions.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedMinutes = parseInt(this.getAttribute('data-minutes'));
                if (waitingTimerDisplay) {
                    waitingTimerDisplay.textContent = `Готов к запуску: ${selectedMinutes} мин`;
                }
            });
        });
    }
}

function initializeStateCards() {
    console.log('🎯 Инициализация карточек состояний...');
    
    if (positionCards.length === 0) {
        console.warn('❌ Карточки позиций не найдены');
    } else {
        positionCards.forEach(card => {
            card.addEventListener('click', async function() {
                positionCards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                currentPosition = this.getAttribute('data-position');
                
                localStorage.setItem('selectedPosition', currentPosition);
                await updateUserState();
                console.log('📍 Позиция обновлена:', currentPosition);
            });
        });
    }

    restoreSelectedStates();
    console.log('✅ Карточки состояний инициализированы');
}

function initializeMoodCards() {
    if (moodCards.length === 0) {
        console.warn('❌ Карточки настроений не найдены');
        return;
    }
    
    moodCards.forEach(card => {
        card.addEventListener('click', async function() {
            moodCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentMood = this.getAttribute('data-mood');
            
            localStorage.setItem('selectedMood', currentMood);
            await updateUserState();
            console.log('😊 Настроение обновлено:', currentMood);
        });
    });
}

// ВОССТАНОВИЛ функцию загрузки запросов
async function loadRequests() {
    if (!requestsContainer) {
        console.log('ℹ️ Контейнер requests-container не найден, пропускаем загрузку запросов');
        return;
    }
    
    const users = await getUsers();
    requestsContainer.innerHTML = '';
    
    // Фильтруем пользователей: только те, кто на той же станции, что и текущий пользователь
    let filteredUsers = users.filter(user => 
        user.city === selectedCity && 
        user.online === true
    );
    
    // Если мы на третьей странице (joined room), показываем только пользователей текущей станции
    if (joinedRoomScreen && joinedRoomScreen.classList.contains('active') && currentGroup) {
        filteredUsers = filteredUsers.filter(user => 
            user.station === currentGroup.station
        );
    }
    
    if (filteredUsers.length === 0) {
        const message = joinedRoomScreen && joinedRoomScreen.classList.contains('active') && currentGroup 
            ? `Пока нет других пользователей на станции ${currentGroup.station}`
            : `Пока нет пользователей на станциях ${selectedCity === 'spb' ? 'Санкт-Петербурга' : 'Москвы'}`;
            
        requestsContainer.innerHTML = `
            <div class="no-requests">
                <h3>${message}</h3>
                <p>Будьте первым!</p>
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
            
            // Формируем информацию о состоянии пользователя
            const stateInfo = [];
            if (user.position) stateInfo.push(`Позиция: ${user.position}`);
            if (user.mood) stateInfo.push(`Настроение: ${user.mood}`);
            const stateText = stateInfo.join(' • ');
            
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
                
                ${stateText ? `<div class="user-state-info" style="margin: 10px 0; padding: 8px; background: #f8f9fa; border-radius: 5px; font-size: 14px;">
                    <strong>Состояние:</strong> ${stateText}
                </div>` : ''}
                
                <div class="user-connections">
                    <div class="connections-count">
                        ${user.is_waiting ? '⏳ Ожидает присоединения' : '✅ Соединился с другими'}
                        ${stateText ? ` • ${stateText}` : ''}
                    </div>
                </div>
            `;
            
            requestsContainer.appendChild(requestCard);
        });
    });
}

// Основная инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚇 DOM загружен, инициализация...');
    
    // Инициализируем DOM элементы
    initializeDOMElements();
    
    // Инициализация обработчиков
    if (enterWaitingRoomBtn) {
        enterWaitingRoomBtn.addEventListener('click', handleEnterWaitingRoom);
    }
    
    if (backToSetupBtn) {
        backToSetupBtn.addEventListener('click', handleBackToSetup);
    }
    
    if (backToWaitingBtn) {
        backToWaitingBtn.addEventListener('click', handleBackToWaiting);
    }
    
    if (leaveGroupBtn) {
        leaveGroupBtn.addEventListener('click', handleLeaveGroup);
    }
    
    if (confirmStationBtn) {
        confirmStationBtn.addEventListener('click', handleConfirmStation);
    }
    
    // Инициализация выбора города и пола
    initializeCityAndGenderSelection();
    
    // Инициализация таймера в комнате ожидания
    initializeWaitingRoomTimer();
    
    // Инициализация карточек состояний
    initializeStateCards();
    initializeMoodCards();

    console.log('✅ Все обработчики инициализированы');
});

// Функция для запуска глобального обновления каждые 5 секунд
function startGlobalRefresh() {
    if (globalRefreshInterval) {
        clearInterval(globalRefreshInterval);
    }
    
    globalRefreshInterval = setInterval(async () => {
        console.log('🔄 Глобальное обновление данных...');
        
        if (setupScreen && setupScreen.classList.contains('active')) {
            // На первом экране ничего не обновляем
        } else if (waitingRoomScreen && waitingRoomScreen.classList.contains('active')) {
            // На втором экране обновляем карту станций и запросы
            await loadStationsMap();
            await loadRequests(); // ВОССТАНОВИЛ
            restoreSelectedStation();
        } else if (joinedRoomScreen && joinedRoomScreen.classList.contains('active')) {
            // На третьем экране обновляем участников группы и запросы
            await loadGroupMembers();
            await loadRequests(); // ВОССТАНОВИЛ
            restoreSelectedStates();
        }
        
        await pingActivity();
        
    }, 5000);
    
    console.log('✅ Глобальное обновление запущено каждые 5 секунд');
}

// Функция остановки глобального обновления
function stopGlobalRefresh() {
    if (globalRefreshInterval) {
        clearInterval(globalRefreshInterval);
        globalRefreshInterval = null;
        console.log('⏹️ Глобальное обновление остановлено');
    }
}

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
    if (!metroMap) return;
    
    try {
        const response = await fetch(`${API_BASE}/stations/waiting-room?city=${selectedCity}`);
        const data = await response.json();
        
        metroMap.innerHTML = '';
        const allStations = stations[selectedCity];
        const stationsMap = {};
        
        data.stationStats.forEach(station => {
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
            
            stationElement.addEventListener('click', () => selectStation(stationName, stationData || {
                waiting: 0,
                connected: 0,
                totalUsers: 0
            }));
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

function selectStation(stationName, stationData) {
    currentSelectedStation = stationName;
    
    localStorage.setItem('selectedStation', stationName);
    
    document.querySelectorAll('.station-map-item').forEach(item => {
        item.style.borderWidth = '2px';
        item.style.borderColor = '';
        item.style.boxShadow = '';
        item.classList.remove('selected');
    });
    
    const selectedElement = document.querySelector(`[data-station="${stationName}"]`);
    if (selectedElement) {
        selectedElement.style.borderWidth = '4px';
        selectedElement.style.borderColor = '#0057b8';
        selectedElement.style.boxShadow = '0 0 10px rgba(0, 87, 184, 0.5)';
        selectedElement.classList.add('selected');
    }
    
    console.log('📍 Выбрана станция:', stationName);
}

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
            
            setTimeout(async () => {
                await loadGroupMembers();
                await loadRequests(); // ВОССТАНОВИЛ
            }, 100);
            
            console.log(`✅ Успешно присоединились к станции ${station}`);
        }
        
    } catch (error) {
        console.error('Ошибка при присоединении к станции:', error);
        alert('Ошибка при присоединении к станции: ' + error.message);
    }
}

// Улучшенная функция восстановления выбранной станции
function restoreSelectedStation() {
    const savedStation = localStorage.getItem('selectedStation');
    if (savedStation) {
        currentSelectedStation = savedStation;
        
        const selectedElement = document.querySelector(`[data-station="${savedStation}"]`);
        if (selectedElement) {
            document.querySelectorAll('.station-map-item').forEach(item => {
                item.style.borderWidth = '2px';
                item.style.borderColor = '';
                item.style.boxShadow = '';
                item.classList.remove('selected');
            });
            
            selectedElement.style.borderWidth = '4px';
            selectedElement.style.borderColor = '#0057b8';
            selectedElement.style.boxShadow = '0 0 10px rgba(0, 87, 184, 0.5)';
            selectedElement.classList.add('selected');
        }
    }
}

// Исправленная функция загрузки участников группы
async function loadGroupMembers() {
    if (!groupMembersContainer) {
        console.error('Контейнер group-members не найден');
        return;
    }
    
    if (!currentGroup) {
        groupMembersContainer.innerHTML = '<div class="no-requests">Выберите станцию для просмотра участников</div>';
        return;
    }

    try {
        const users = await getUsers();
        const groupUsers = users.filter(user => 
            user.station === currentGroup.station && 
            user.is_connected === true
        );
        
        groupMembersContainer.innerHTML = '';
        
        if (groupUsers.length === 0) {
            groupMembersContainer.innerHTML = '<div class="no-requests">Нет участников на этой станции</div>';
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
                        ${user.wagon ? `• Вагон ${user.wagon}` : ''}
                    </div>
                    <div class="user-state-status">
                        ${user.status || 'Ожидание'}
                    </div>
                </div>
            `;
            groupMembersContainer.appendChild(memberElement);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки участников группы:', error);
        if (groupMembersContainer) {
            groupMembersContainer.innerHTML = '<div class="no-requests">Ошибка загрузки участников</div>';
        }
    }
}

// Улучшенная функция восстановления состояний
function restoreSelectedStates() {
    const savedPosition = localStorage.getItem('selectedPosition');
    const savedMood = localStorage.getItem('selectedMood');
    
    console.log('🔄 Восстановление состояний:', { savedPosition, savedMood });
    
    if (savedPosition) {
        currentPosition = savedPosition;
        const positionCard = document.querySelector(`[data-position="${savedPosition}"]`);
        if (positionCard) {
            document.querySelectorAll('#position-cards .state-card').forEach(c => c.classList.remove('active'));
            positionCard.classList.add('active');
            console.log('📍 Восстановлена позиция:', savedPosition);
        }
    }
    
    if (savedMood) {
        currentMood = savedMood;
        const moodCard = document.querySelector(`[data-mood="${savedMood}"]`);
        if (moodCard) {
            document.querySelectorAll('#mood-cards .state-card').forEach(c => c.classList.remove('active'));
            moodCard.classList.add('active');
            console.log('😊 Восстановлено настроение:', savedMood);
        }
    }
}

// Функции навигации
function showSetup() {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    setupScreen.classList.add('active');
}

function showWaitingRoom() {
    if (!userId) {
        alert('Сначала создайте профиль');
        return showSetup();
    }
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    waitingRoomScreen.classList.add('active');
}

function showJoinedRoom() {
    if (!currentGroup) {
        alert('Сначала выберите станцию');
        return;
    }
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    joinedRoomScreen.classList.add('active');
}

// Обновите функцию updateUserState для немедленного обновления
async function updateUserState() {
    if (userId && (currentPosition || currentMood)) {
        const stateText = [currentPosition, currentMood].filter(Boolean).join(' | ');
        
        try {
            await updateUser(userId, { 
                status: stateText || 'Ожидание',
                position: currentPosition,
                mood: currentMood
            });
            
            await loadGroupMembers();
            await loadRequests(); // ВОССТАНОВИЛ
            
            console.log('✅ Состояние обновлено на сервере:', stateText);
        } catch (error) {
            console.error('❌ Ошибка обновления состояния:', error);
        }
    }
}

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
    
    if (waitingStartTimerBtn) waitingStartTimerBtn.disabled = true;
    if (waitingStopTimerBtn) waitingStopTimerBtn.disabled = false;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    timerSeconds = 0;
    if (waitingTimerDisplay) waitingTimerDisplay.textContent = 'Не запущен';
    if (waitingTimerStatus) {
        waitingTimerStatus.textContent = 'Не активен';
        waitingTimerStatus.style.color = '#666';
    }
    
    if (waitingStartTimerBtn) waitingStartTimerBtn.disabled = false;
    if (waitingStopTimerBtn) waitingStopTimerBtn.disabled = true;
    
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
        if (waitingTimerDisplay) waitingTimerDisplay.textContent = 'Время истекло';
        if (waitingTimerStatus) {
            waitingTimerStatus.textContent = 'Истекло';
            waitingTimerStatus.style.color = '#dc3545';
        }
    } else {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        if (waitingTimerDisplay) waitingTimerDisplay.textContent = timeString;
        if (waitingTimerStatus) {
            waitingTimerStatus.textContent = timeString;
            waitingTimerStatus.style.color = '#28a745';
        }
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

// Запуск при полной загрузке страницы
window.addEventListener('load', function() {
    // Восстанавливаем ВСЕ состояния при любой загрузке
    restoreSelectedStates();
    restoreSelectedStation();
    
    // Восстанавливаем таймеры
    const savedTimerMinutes = localStorage.getItem('selectedTimerMinutes');
    if (savedTimerMinutes) {
        selectedMinutes = parseInt(savedTimerMinutes);
        const timerOption = document.querySelector(`.timer-option[data-minutes="${savedTimerMinutes}"]`);
        if (timerOption) {
            document.querySelectorAll('.timer-option').forEach(b => b.classList.remove('active'));
            timerOption.classList.add('active');
        }
    }
    
    // Если пользователь уже авторизован, запускаем обновление
    if (userId) {
        startGlobalRefresh();
    }
    
    console.log('🚇 Приложение "Из метро" инициализировано');
});

// Остановка при закрытии страницы
window.addEventListener('beforeunload', async function() {
    stopGlobalRefresh();
    
    if (userId) {
        try {
            await deleteUser(userId);
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
        }
    }
});

// Пинг активности при действиях пользователя
document.addEventListener('click', pingActivity);
document.addEventListener('keypress', pingActivity);