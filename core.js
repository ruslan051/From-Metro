// Глобальные флаги для проверки загрузки модулей
window.optionalModulesLoaded = false;
window.optionalModulesLoading = false;

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
let globalRefreshInterval = null;

// Сказочные имена для мужчин и женщин
const maleNames = ['Иван-Царевич', 'Кощей Бессмертный', 'Добрыня Никитич', 'Леший', 'Водяной', 'Бабай', 'Соловей-Разбойник', 'Змей Горыныч'];
const femaleNames = ['Василиса Премудрая', 'Баба Яга', 'Царевна-Лягушка', 'Снегурочка', 'Марья-Искусница', 'Аленушка', 'Кикимора', 'Русалка'];

// API endpoints
const API_BASE = 'https://metro-backend-xlkt.onrender.com/api';

// Глобальные переменные для DOM элементов
let setupScreen, waitingRoomScreen, joinedRoomScreen;
let backToSetupBtn, backToWaitingBtn, leaveGroupBtn;
let enterWaitingRoomBtn, confirmStationBtn;
let wagonSelect, colorSelect, waitingTimer, waitingTimerDisplay, waitingTimerStatus;
let waitingStartTimerBtn, waitingStopTimerBtn, waitingTimerOptions, waitingTimerExpanded;
let positionCards, moodCards;
let groupMembersContainer, metroMap, requestsContainer;

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

// Добавьте уникальный идентификатор устройства
function generateDeviceId() {
    let deviceId = localStorage.getItem('metroDeviceId');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('metroDeviceId', deviceId);
    }
    return deviceId;
}

const currentDeviceId = generateDeviceId();

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
    
    // Основные кнопки навигации
    backToSetupBtn = getElementSafe('back-to-setup');
    backToWaitingBtn = getElementSafe('back-to-waiting');
    leaveGroupBtn = getElementSafe('leave-group');
    enterWaitingRoomBtn = getElementSafe('enter-waiting-room');
    confirmStationBtn = getElementSafe('confirm-station');
    
    // Элементы таймера и форм
    wagonSelect = getElementSafe('wagon-select');
    colorSelect = getElementSafe('color-select');
    waitingTimer = getElementSafe('waiting-room-timer');
    waitingTimerDisplay = getElementSafe('waiting-timer-display');
    waitingTimerStatus = getElementSafe('waiting-timer-status');
    waitingStartTimerBtn = getElementSafe('waiting-start-timer');
    waitingStopTimerBtn = getElementSafe('waiting-stop-timer');
    waitingTimerExpanded = getElementSafe('waiting-timer-expanded');
    
    // Контейнеры контента
    groupMembersContainer = getElementSafe('group-members');
    metroMap = getElementSafe('metro-map');
    requestsContainer = getElementSafe('requests-container');
    
    // Карточки состояний
    positionCards = document.querySelectorAll('#position-cards .state-card');
    moodCards = document.querySelectorAll('#mood-cards .state-card');
    
    console.log('✅ DOM элементы инициализированы');
}

// Основные обработчики событий
async function handleEnterWaitingRoom() {
    console.log('🚪 Вход в комнату ожидания');
    
    const getRandomName = (gender) => {
        const names = gender === 'male' ? maleNames : femaleNames;
        const baseName = names[Math.floor(Math.random() * names.length)];
        return `${baseName}#${currentDeviceId.substr(-4)}`;
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
        isConnected: false,
        deviceId: currentDeviceId
    };
    
    console.log('📍 Данные для создания пользователя:', userData);

    try {
        const validatedData = validateUserData(userData);
        const createdUser = await createUser(validatedData);
        
        if (createdUser) {
            currentUser = createdUser;
            userId = createdUser.id;
            
            if (setupScreen && waitingRoomScreen) {
                setupScreen.classList.remove('active');
                waitingRoomScreen.classList.add('active');
                
                loadOptionalModules().then(() => {
                    initializeWaitingRoomTimer();
                    initializeStateCards();
                    startGlobalRefresh();
                });
                
                console.log('✅ Пользователь создан:', createdUser.name);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка создания пользователя:', error);
        
        const errorMessage = error.message.includes('Failed to fetch')
            ? 'Ошибка подключения к серверу. Проверьте интернет-соединение.'
            : `Ошибка создания профиля: ${error.message}`;
        
        alert(errorMessage);
        
        const retry = confirm('Не удалось подключиться к серверу. Попробовать снова?');
        if (retry) {
            handleEnterWaitingRoom();
        }
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
    
    let colorValue = '';
    if (colorSelect && colorSelect.value) {
        colorValue = colorSelect.value;
    }
    
    if (!colorValue) {
        alert('Пожалуйста, укажите цвет верхней одежды');
        return;
    }
    
    if (!currentSelectedStation) {
        alert('Пожалуйста, выберите станцию на карте');
        return;
    }
    
    let wagonValue = '';
    if (wagonSelect && wagonSelect.value) {
        wagonValue = wagonSelect.value;
    }
    
    if (userId) {
        try {
            await safeUserUpdate(userId, {
                station: currentSelectedStation,
                wagon: wagonValue,
                color: colorValue,
                is_waiting: false,
                is_connected: true,
                status: 'Выбрал станцию: ' + currentSelectedStation
            });

            updateStationTitle(currentSelectedStation);

            if (typeof joinStation === 'function') {
                await joinStation(currentSelectedStation);
            }
            
        } catch (error) {
            console.error('Ошибка при обновлении параметров:', error);
            alert('Ошибка: ' + error.message);
        }
    }
}

async function handleLeaveGroup() {
    console.log('🚪 Покидаем группу');
    
    currentPosition = '';
    currentMood = '';
    
    if (userId) {
        try {
            await safeUserUpdate(userId, { 
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

// Инициализация выбора города и пола
function initializeCityAndGenderSelection() {
    const cityOptions = document.querySelectorAll('.city-option');
    cityOptions.forEach(option => {
        option.addEventListener('click', function() {
            cityOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedCity = this.getAttribute('data-city');
            console.log('📍 Выбран город:', selectedCity);
        });
    });

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

// Валидация данных пользователя
function validateUserData(userData) {
    const required = ['name', 'city', 'gender'];
    const missing = required.filter(field => !userData[field]);
    
    if (missing.length > 0) {
        throw new Error(`Отсутствуют обязательные поля: ${missing.join(', ')}`);
    }
    
    return {
        ...userData,
        name: userData.name.trim() || 'Аноним',
        station: userData.station || '',
        wagon: userData.wagon || '',
        color: userData.color || 'Синий',
        status: userData.status || 'Ожидание'
    };
}

// API функции
async function createUser(userData) {
    try {
        console.log('📍 Отправка данных пользователя:', userData);
        
        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        console.log('📍 Статус ответа:', response.status);
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
                console.error('📍 Детали ошибки от сервера:', errorData);
            } catch (e) {
                console.error('📍 Не удалось прочитать тело ошибки');
            }
            
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('✅ Пользователь создан успешно:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка создания пользователя:', error);
        
        // Fallback: сохраняем данные локально
        const fallbackUser = {
            id: Math.floor(Math.random() * 10000) + 1,
            name: userData.name || 'Аноним',
            station: userData.station || '',
            wagon: userData.wagon || '',
            color: userData.color || 'Синий',
            color_code: userData.colorCode || getRandomColor(),
            status: userData.status || 'Ожидание',
            city: userData.city || 'spb',
            gender: userData.gender || 'male',
            online: true,
            isFallback: true
        };
        
        try {
            const localUsers = JSON.parse(localStorage.getItem('metroUsers') || '[]');
            localUsers.push(fallbackUser);
            localStorage.setItem('metroUsers', JSON.stringify(localUsers));
            console.log('✅ Пользователь сохранен локально');
        } catch (e) {
            console.error('❌ Ошибка локального сохранения:', e);
        }
        
        return fallbackUser;
    }
}

async function getUsers() {
    try {
        console.log('🔄 Запрос пользователей с сервера...');
        const response = await fetch(`${API_BASE}/users`);
        
        console.log('📡 Статус ответа:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const users = await response.json();
        console.log('✅ Получены пользователи:', users.length);
        return users.map((user, index) => ({
            ...user,
            id: user.id || index + 1
        }));
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        return [];
    }
}

async function safeUserUpdate(userId, updates) {
    try {
        console.log('📍 Отправка обновления пользователя:', { userId, updates });
        
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Пользователь обновлен:', result);
        return result;
    } catch (error) {
        console.error('❌ Ошибка обновления пользователя:', error);
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

// Управление глобальным обновлением
function startGlobalRefresh() {
    if (globalRefreshInterval) {
        clearInterval(globalRefreshInterval);
    }
    
    globalRefreshInterval = setInterval(async () => {
        console.log('🔄 Глобальное обновление данных...');
        
        if (waitingRoomScreen && waitingRoomScreen.classList.contains('active')) {
            if (typeof loadStationsMap === 'function') await loadStationsMap();
            if (typeof loadRequests === 'function') await loadRequests();
            if (typeof restoreSelectedStation === 'function') restoreSelectedStation();
        } else if (joinedRoomScreen && joinedRoomScreen.classList.contains('active')) {
            if (typeof loadGroupMembers === 'function') await loadGroupMembers();
            if (typeof loadRequests === 'function') await loadRequests();
        }
        
        await pingActivity();
        
    }, 5000);
    
    console.log('✅ Глобальное обновление запущено каждые 5 секунды');
}

function stopGlobalRefresh() {
    if (globalRefreshInterval) {
        clearInterval(globalRefreshInterval);
        globalRefreshInterval = null;
        console.log('⏹️ Глобальное обновление остановлено');
    }
}

// Функции навигации
function showSetup() {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    setupScreen.classList.add('active');
    stopGlobalRefresh();
}

function showWaitingRoom() {
    if (!userId) {
        alert('Сначала создайте профиль');
        return showSetup();
    }
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    waitingRoomScreen.classList.add('active');
    
    loadOptionalModules().then(() => {
        startGlobalRefresh();
    });
}

function showJoinedRoom() {
    if (!currentGroup) {
        alert('Сначала выберите станцию');
        return;
    }
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    joinedRoomScreen.classList.add('active');
    
    setTimeout(() => {
        forceInitializeJoinedRoom();
    }, 100);
    
    loadOptionalModules().then(() => {
        startGlobalRefresh();
    });
}

// Вспомогательные функции
function getRandomColor() {
    const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Основная инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚇 DOM загружен, инициализация приложения...');
    
    initializeDOMElements();
    
    // Инициализация основных обработчиков
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
    
    initializeCityAndGenderSelection();
    
    console.log('✅ Приложение инициализировано');
});

// Обработчики активности и закрытия
let lastPingTime = 0;
const PING_COOLDOWN = 5000;

async function pingActivity() {
    if (userId) {
        const now = Date.now();
        if (now - lastPingTime < PING_COOLDOWN) {
            return false;
        }
        
        lastPingTime = now;
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

document.addEventListener('click', pingActivity);
document.addEventListener('keypress', pingActivity);