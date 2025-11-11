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

// Добавьте эту проверку после объявления всех DOM элементов
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚇 DOM загружен, инициализация...');

    
    // Основные кнопки навигации
    const enterWaitingRoomBtn = document.getElementById('enter-waiting-room');
    const backToSetupBtn = document.getElementById('back-to-setup');
    const backToWaitingBtn = document.getElementById('back-to-waiting');
    const leaveGroupBtn = document.getElementById('leave-group');
    const confirmStationBtn = document.getElementById('confirm-station');
    
    // Проверяем и добавляем обработчики
    if (backToSetupBtn) {
        backToSetupBtn.addEventListener('click', async function() {
            console.log('🔙 Назад к настройкам');
            if (userId) {
                try {
                    await deleteUser(userId);
                } catch (error) {
                    console.error('Ошибка при удалении пользователя:', error);
                }
            }
            
            stopGlobalRefresh();
            autoRefreshIntervals.forEach(interval => clearInterval(interval));
            autoRefreshIntervals = [];
            
            waitingRoomScreen.classList.remove('active');
            setupScreen.classList.add('active');
            stopTimer();
            currentUser = null;
            userId = null;
        });
    } else {
        console.warn('❌ Элемент back-to-setup не найден');
    }

    if (backToWaitingBtn) {
        backToWaitingBtn.addEventListener('click', function() {
            console.log('🔙 Назад к ожиданию');
            joinedRoomScreen.classList.remove('active');
            waitingRoomScreen.classList.add('active');
        });
    } else {
        console.warn('❌ Элемент back-to-waiting не найден');
    }

    if (leaveGroupBtn) {
        leaveGroupBtn.addEventListener('click', async function() {
            console.log('🚪 Покидаем группу');
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
    } else {
        console.warn('❌ Элемент leave-group не найден');
    }

   // Проверяем и добавляем обработчики
    if (enterWaitingRoomBtn) {
        enterWaitingRoomBtn.addEventListener('click', handleEnterWaitingRoom);
        console.log('✅ Обработчик для enter-waiting-room добавлен');
    } else {
        console.warn('❌ Кнопка enter-waiting-room не найдена');
    }
    
    if (backToSetupBtn) {
        backToSetupBtn.addEventListener('click', handleBackToSetup);
        console.log('✅ Обработчик для back-to-setup добавлен');
    }
    
    if (backToWaitingBtn) {
        backToWaitingBtn.addEventListener('click', handleBackToWaiting);
        console.log('✅ Обработчик для back-to-waiting добавлен');
    }
    
    if (leaveGroupBtn) {
        leaveGroupBtn.addEventListener('click', handleLeaveGroup);
        console.log('✅ Обработчик для leave-group добавлен');
    }
    
    if (confirmStationBtn) {
        confirmStationBtn.addEventListener('click', handleConfirmStation);
        console.log('✅ Обработчик для confirm-station добавлен');
    }
    
    // Инициализация выбора города и пола
    initializeCityAndGenderSelection();
    
    // Инициализация таймера
    initializeCompactTimer();
    
    // Инициализация таймера в комнате ожидания
    initializeWaitingRoomTimer();
    
    console.log('✅ Все обработчики инициализированы'); });

// Элементы выбора города и пола
const cityOptions = document.querySelectorAll('.city-option');
const genderOptions = document.querySelectorAll('.gender-option');


// Также обновите функцию handleLeaveGroup чтобы не сбрасывать состояния:
async function handleLeaveGroup() {
    console.log('🚪 Покидаем группу');
    
    if (userId) {
        try {
            // Обновляем только статус, но сохраняем позицию и настроение
            await updateUser(userId, { 
                status: 'Ожидание',
                is_waiting: true,
                is_connected: false,
                // НЕ очищаем position и mood - они сохраняются
            });
        } catch (error) {
            console.error('Ошибка при обновлении пользователя:', error);
        }
    }
    
    currentGroup = null;
    joinedRoomScreen.classList.remove('active');
    waitingRoomScreen.classList.add('active');
    
    console.log('✅ Вышли из группы, состояния сохранены');
}
// В начале app.js добавьте безопасные получения элементов
function getElementSafe(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`❌ Элемент ${id} не найден`);
    }
    return element;
}
// Добавьте эту функцию для проверки
function checkAllElements() {
    const elements = [
        'back-to-setup',
        'back-to-waiting', 
        'leave-group',
        'enter-waiting-room',
        'group-members',
        'joined-room-screen',
        'waiting-room-screen',
        'setup-screen'
    ];
    
    console.log('🔍 Проверка элементов DOM:');
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}:`, element ? '✅ Найден' : '❌ Не найден');
    });
}


// Вызовите после загрузки
window.addEventListener('load', function() {
    setTimeout(checkAllElements, 100);
});
// Добавьте эту функцию для отладки
function checkDOM() {
    console.log('🔍 Проверка DOM элементов:');
    console.log('groupMembersContainer:', document.getElementById('group-members'));
    console.log('joinedRoomScreen:', document.getElementById('joined-room-screen'));
    console.log('waitingRoomScreen:', document.getElementById('waiting-room-screen'));
    
    // Проверка стилей
    const metroMap = document.getElementById('metro-map');
    if (metroMap) {
        console.log('metroMap styles:', window.getComputedStyle(metroMap));
    }
}

// Вызовите эту функцию после загрузки страницы
window.addEventListener('load', function() {
    setTimeout(checkDOM, 1000);
});
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
// Исправленный обработчик для кнопки подтверждения параметров
const confirmStationBtn = document.getElementById('confirm-station');
if (confirmStationBtn) {
    confirmStationBtn.addEventListener('click', async function() {
        const wagon = wagonSelect.value || '';
        const color = colorSelect.value;
        
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
                // Обновляем пользователя с выбранными параметрами
                await updateUser(userId, {
                    station: currentSelectedStation,
                    wagon: wagon,
                    color: color,
                    is_waiting: false,
                    is_connected: true,
                    status: 'Выбрал станцию: ' + currentSelectedStation
                });
                
                // Присоединяемся к выбранной станции
                await joinStation(currentSelectedStation);
                
            } catch (error) {
                console.error('Ошибка при обновлении параметров:', error);
                alert('Ошибка: ' + error.message);
            }
        }
    });
} else {
    console.warn('Элемент confirm-station не найден');
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

// Инициализация таймера в комнате ожидания
function initializeWaitingRoomTimer() {
    const waitingTimer = document.getElementById('waiting-room-timer');
    const waitingTimerExpanded = document.getElementById('waiting-timer-expanded');
    
    if (waitingTimer && waitingTimerExpanded) {
        waitingTimer.addEventListener('click', function() {
            waitingTimerExpanded.classList.toggle('active');
        });
        console.log('✅ Таймер комнаты ожидания инициализирован');
    }
    
    // Обработчики для кнопок таймера комнаты ожидания
    const waitingStartTimerBtn = document.getElementById('waiting-start-timer');
    const waitingStopTimerBtn = document.getElementById('waiting-stop-timer');
    const waitingTimerOptions = document.querySelectorAll('#waiting-timer-expanded .timer-option');
    
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
                const waitingTimerDisplay = document.getElementById('waiting-timer-display');
                if (waitingTimerDisplay) {
                    waitingTimerDisplay.textContent = `Готов к запуску: ${selectedMinutes} мин`;
                }
            });
        });
    }
}

// Инициализация всех обработчиков событий
function initializeEventHandlers() {
    console.log('🔧 Инициализация обработчиков событий...');
}
moodCards.forEach(card => {
    card.addEventListener('click', async function() {
        moodCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        currentMood = this.getAttribute('data-mood');
        
        // Сохраняем выбранное настроение
        localStorage.setItem('selectedMood', currentMood);
        
        // Немедленно обновляем состояние
        await updateUserState();
        });   

 // Инициализация карточек состояний
    initializeStateCards();
    
    console.log('✅ Все обработчики инициализированы');



});
// Функция для запуска глобального обновления каждые 5 секунд
function startGlobalRefresh() {
    // Останавливаем предыдущий интервал
    if (globalRefreshInterval) {
        clearInterval(globalRefreshInterval);
    }
    
    // Запускаем новый интервал
    globalRefreshInterval = setInterval(async () => {
        console.log('🔄 Глобальное обновление данных...');
        
        // Обновляем данные в зависимости от активного экрана
        if (setupScreen.classList.contains('active')) {
            // На первом экране ничего не обновляем
        } else if (waitingRoomScreen.classList.contains('active')) {
            // На втором экране обновляем карту станций
            await loadStationsMap();
            await loadRequests();
            
            // Восстанавливаем выделение выбранной станции
            restoreSelectedStation();
        } else if (joinedRoomScreen.classList.contains('active')) {
            // На третьем экране обновляем список пользователей и участников группы
            await loadRequests();
            await loadGroupMembers();
            
            // Восстанавливаем выделение состояний
            restoreSelectedStates();
        }
        
        // Пинг активности
        await pingActivity();
        
    }, 5000); // 5 секунд
    
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
    try {
        // Используем selectedCity из выбора на первой странице
        const response = await fetch(`${API_BASE}/stations/waiting-room?city=${selectedCity}`);
        const data = await response.json();
        
        metroMap.innerHTML = '';
        const allStations = stations[selectedCity];
        const stationsMap = {};
        
        // Создаем маппинг станций
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
    
    // Сохраняем выбранную станцию в localStorage
    localStorage.setItem('selectedStation', stationName);
    
    // Сбрасываем выделение у всех станций
    document.querySelectorAll('.station-map-item').forEach(item => {
        item.style.borderWidth = '2px';
        item.style.borderColor = '';
        item.style.boxShadow = '';
        item.classList.remove('selected');
    });
    
    // Выделяем выбранную станцию жирной синей рамкой и добавляем класс
    const selectedElement = document.querySelector(`[data-station="${stationName}"]`);
    if (selectedElement) {
        selectedElement.style.borderWidth = '4px';
        selectedElement.style.borderColor = '#0057b8';
        selectedElement.style.boxShadow = '0 0 10px rgba(0, 87, 184, 0.5)';
        selectedElement.classList.add('selected');
    }
    
    console.log('📍 Выбрана станция:', stationName);
}

// Обновите функцию присоединения к станции
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
            
            // Даем время DOM обновиться перед загрузкой участников
            setTimeout(async () => {
                await loadGroupMembers();
                await loadRequests();
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
        
        // Восстанавливаем выделение станции
        const selectedElement = document.querySelector(`[data-station="${savedStation}"]`);
        if (selectedElement) {
            // Сбрасываем все выделения
            document.querySelectorAll('.station-map-item').forEach(item => {
                item.style.borderWidth = '2px';
                item.style.borderColor = '';
                item.style.boxShadow = '';
                item.classList.remove('selected');
            });
            
            // Применяем выделение к выбранной станции
            selectedElement.style.borderWidth = '4px';
            selectedElement.style.borderColor = '#0057b8';
            selectedElement.style.boxShadow = '0 0 10px rgba(0, 87, 184, 0.5)';
            selectedElement.classList.add('selected');
        }
    }
}

// Исправленная функция загрузки участников группы
async function loadGroupMembers() {
    const container = getElementSafe('group-members');
    if (!container) {
        console.error('Контейнер group-members не найден');
        return;
    }
    
    if (!currentGroup) {
        container.innerHTML = '<div class="no-requests">Выберите станцию для просмотра участников</div>';
        return;
    }

    
    try {
        const users = await getUsers();
        const groupUsers = users.filter(user => 
            user.station === currentGroup.station && 
            user.is_connected === true
        );
        
        // Проверяем существование контейнера перед обновлением
        if (!groupMembersContainer) {
            console.error('Контейнер groupMembersContainer не найден');
            return;
        }
        
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

// Функция обновления отображения состояния пользователя в списке
function updateUserDisplay() {
    if (!userId) return;
    
    // Находим карточку текущего пользователя в списке
    const userCards = document.querySelectorAll('.request-card');
    userCards.forEach(card => {
        const userNameElement = card.querySelector('.user-name');
        if (userNameElement && userNameElement.textContent.includes('(Вы)')) {
            // Обновляем статус
            const statusElement = card.querySelector('.user-status');
            if (statusElement) {
                const colorIndicator = statusElement.querySelector('.color-indicator');
                const userColor = colorIndicator ? colorIndicator.style.backgroundColor : '#007bff';
                statusElement.innerHTML = `
                    <span class="color-indicator" style="background-color: ${userColor}"></span>
                    ${currentUser?.color || ''} • ${[currentPosition, currentMood].filter(Boolean).join(' | ') || 'Ожидание'}
                `;
            }
            
            // Обновляем блоки с состоянием
            let statusInfoHTML = '';
            if (currentPosition) {
                statusInfoHTML += `<div class="status-info"><strong>Позиция:</strong> ${currentPosition}</div>`;
            }
            if (currentMood) {
                statusInfoHTML += `<div class="status-info"><strong>Настроение:</strong> ${currentMood}</div>`;
            }
            
            const existingStatusInfo = card.querySelectorAll('.status-info');
            existingStatusInfo.forEach(el => el.remove());
            
            if (statusInfoHTML) {
                const userConnections = card.querySelector('.user-connections');
                if (userConnections) {
                    userConnections.insertAdjacentHTML('beforebegin', statusInfoHTML);
                }
            }
        }
    });
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


function initializeStateCards() {
    console.log('🎯 Инициализация карточек состояний...');
    
    // Карточки позиций
    const positionCards = document.querySelectorAll('#position-cards .state-card');
    positionCards.forEach(card => {
        card.addEventListener('click', async function() {
            positionCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentPosition = this.getAttribute('data-position');
            
            // Сохраняем выбранную позицию
            localStorage.setItem('selectedPosition', currentPosition);
            
            // Немедленно обновляем состояние
            await updateUserState();
            console.log('📍 Позиция обновлена:', currentPosition);
        });
    });

    // Карточки настроений
    const moodCards = document.querySelectorAll('#mood-cards .state-card');
    moodCards.forEach(card => {
        card.addEventListener('click', async function() {
            moodCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentMood = this.getAttribute('data-mood');
            
            // Сохраняем выбранное настроение
            localStorage.setItem('selectedMood', currentMood);
            
            // Немедленно обновляем состояние
            await updateUserState();
            console.log('😊 Настроение обновлено:', currentMood);
        });
    });

    // Восстанавливаем сохраненные состояния
    restoreSelectedStates();
    
    console.log('✅ Карточки состояний инициализированы');
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
            
            // Немедленно обновляем отображение
            await loadRequests();
            await loadGroupMembers();
            
            console.log('✅ Состояние обновлено на сервере:', stateText);
        } catch (error) {
            console.error('❌ Ошибка обновления состояния:', error);
        }
    }
}

// Обновите функцию loadRequests для фильтрации по станции
async function loadRequests() {
    const users = await getUsers();
    requestsContainer.innerHTML = '';
    
    // Фильтруем пользователей: только те, кто на той же станции, что и текущий пользователь
    let filteredUsers = users.filter(user => 
        user.city === selectedCity && 
        user.online === true
    );
    
    // Если мы на третьей странице (joined room), показываем только пользователей текущей станции
    if (joinedRoomScreen.classList.contains('active') && currentGroup) {
        filteredUsers = filteredUsers.filter(user => 
            user.station === currentGroup.station
        );
    }
    
    if (filteredUsers.length === 0) {
        const message = joinedRoomScreen.classList.contains('active') && currentGroup 
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

// Функция запуска автообновления
function startAutoRefresh() {
    // Очищаем предыдущие интервалы
    autoRefreshIntervals.forEach(interval => clearInterval(interval));
    autoRefreshIntervals = [];
    
    // Обновляем ТОЛЬКО КОЛИЧЕСТВО ЛЮДЕЙ на второй странице (каждую секунду)
    autoRefreshIntervals.push(setInterval(() => {
        if (waitingRoomScreen.classList.contains('active')) {
            loadStationsMap(); // Эта функция обновляет только количества
        }
    }, 1000));
    
    // Обновляем ТОЛЬКО АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ на третьей странице (каждую секунду)
    autoRefreshIntervals.push(setInterval(() => {
        if (joinedRoomScreen.classList.contains('active')) {
            loadRequests(); // Эта функция обновляет список пользователей
        }
    }, 1000));
    
    // Пинг активности каждые 20 секунд
    autoRefreshIntervals.push(setInterval(() => {
        pingActivity();
    }, 20000));
    
    console.log('🔄 Автообновление настроено:');
    console.log('   - 2 страница: только количество людей (каждую секунду)');
    console.log('   - 3 страница: только активные пользователи (каждую секунду)');
    console.log('   - Состояния пользователей не обновляются');
}
// Удалите старый обработчик формы и добавьте этот:
document.getElementById('enter-waiting-room').addEventListener('click', async function() {
    // Генерация сказочного имени
    const getRandomName = (gender) => {
        const names = gender === 'male' ? maleNames : femaleNames;
        return names[Math.floor(Math.random() * names.length)];
    };
    
    const randomName = getRandomName(selectedGender);
    
    const userData = {
        name: randomName,
        station: '', // Пустая станция
        wagon: '', // Пустой вагон
        color: '', // Пустой цвет
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
        loadRequests();
        
        // Запускаем глобальное обновление вместо startAutoRefresh
        startGlobalRefresh();
        
        console.log('✅ Пользователь создан:', createdUser.name);
    }
    } catch (error) {
        alert(error.message || 'Ошибка создания профиля. Проверьте подключение к серверу.');
    }
});


// Обновите обработчики навигации для управления обновлением
backToSetupBtn.addEventListener('click', async function() {
    // Останавливаем глобальное обновление
    stopGlobalRefresh();
    
    if (userId) {
        try {
            await deleteUser(userId);
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
        }
    }
    
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
                position: '', // Очищаем на сервере, но сохраняем локально
                mood: '', // Очищаем на сервере, но сохраняем локально
                is_waiting: true,
                is_connected: false
            });
        } catch (error) {
            console.error('Ошибка при обновлении пользователя:', error);
        }
    }
    
    // НЕ очищаем сохраненные состояния - они сохраняются навсегда
    // localStorage.removeItem('selectedPosition');
    // localStorage.removeItem('selectedMood');
    // localStorage.removeItem('selectedStation');
    
    currentGroup = null;
    // currentPosition = ''; // Не сбрасываем
    // currentMood = ''; // Не сбрасываем
    
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
        // Сохраняем выбор таймера
        localStorage.setItem('selectedTimerMinutes', selectedMinutes);
        
        timerDisplay.textContent = `Готов к запуску: ${selectedMinutes} мин`;
    });
});


// // Обработчик фильтра по городу
// cityFilterSelect.addEventListener('change', function() {
//     selectedCity = this.value;
//     loadStationsMap();
//     loadRequests();
// });

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

// Обновите window.load для запуска глобального обновления при необходимости
window.addEventListener('load', function() {
    initializeStations();
    
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
    
    if (cityFilterSelect) {
        cityFilterSelect.value = selectedCity;
    }
    
    // Если пользователь уже авторизован, запускаем обновление
    if (userId) {
        startGlobalRefresh();
    }
    
    console.log('🚇 Приложение "Из метро" инициализировано');
    console.log('🔄 Глобальное обновление каждые 5 секунд');
});


// Обновите beforeunload для остановки обновления
window.addEventListener('beforeunload', async function() {
    stopGlobalRefresh(); // Останавливаем обновление
    
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