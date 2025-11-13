// =============================================
// КОНФИГУРАЦИЯ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =============================================

// Глобальные флаги для проверки загрузки модулей
window.optionalModulesLoaded = false;
window.optionalModulesLoading = false;

// API endpoints
const API_BASE = 'https://metro-backend-xlkt.onrender.com/api';

// Константы приложения
const CONSTANTS = {
    MALE_NAMES: ['Иван-Царевич', 'Кощей Бессмертный', 'Добрыня Никитич', 'Леший', 'Водяной', 'Бабай', 'Соловей-Разбойник', 'Змей Горыныч'],
    FEMALE_NAMES: ['Василиса Премудрая', 'Баба Яга', 'Царевна-Лягушка', 'Снегурочка', 'Марья-Искусница', 'Аленушка', 'Кикимора', 'Русалка'],
    COLORS: ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'],
    REFRESH_INTERVAL: 3000
};

// Текущее состояние приложения
const AppState = {
    currentUser: null,
    userId: null,
    selectedCity: 'spb',
    selectedGender: 'male',
    selectedMinutes: 5,
    currentPosition: '',
    currentMood: '',
    currentGroup: null,
    currentSelectedStation: null,
    timerInterval: null,
    timerSeconds: 0,
    globalRefreshInterval: null
};

// Глобальные ссылки на DOM элементы
const DOM = {
    setupScreen: null,
    waitingRoomScreen: null,
    joinedRoomScreen: null,
    backToSetupBtn: null,
    backToWaitingBtn: null,
    leaveGroupBtn: null,
    enterWaitingRoomBtn: null,
    confirmStationBtn: null
};

// =============================================
// УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

/**
 * Безопасное получение элемента по ID
 */
function getElementSafe(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`❌ Элемент ${id} не найден`);
    }
    return element;
}

/**
 * Генерация случайного цвета
 */
function getRandomColor() {
    return CONSTANTS.COLORS[Math.floor(Math.random() * CONSTANTS.COLORS.length)];
}

/**
 * Загрузка внешнего скрипта
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ DOM И ОБРАБОТЧИКОВ СОБЫТИЙ
// =============================================

/**
 * Инициализация основных DOM элементов
 */
function initializeCoreDOMElements() {
    console.log('🔧 Инициализация основных DOM элементов...');
    
    // Основные экраны
    DOM.setupScreen = getElementSafe('setup-screen');
    DOM.waitingRoomScreen = getElementSafe('waiting-room-screen');
    DOM.joinedRoomScreen = getElementSafe('joined-room-screen');
    
    // Основные кнопки навигации
    DOM.backToSetupBtn = getElementSafe('back-to-setup');
    DOM.backToWaitingBtn = getElementSafe('back-to-waiting');
    DOM.leaveGroupBtn = getElementSafe('leave-group');
    DOM.enterWaitingRoomBtn = getElementSafe('enter-waiting-room');
    DOM.confirmStationBtn = getElementSafe('confirm-station');
    
    console.log('✅ Основные DOM элементы инициализированы');
}

/**
 * Инициализация выбора города и пола
 */
function initializeCityAndGenderSelection() {
    // Обработчики выбора города
    const cityOptions = document.querySelectorAll('.city-option');
    cityOptions.forEach(option => {
        option.addEventListener('click', function() {
            cityOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            AppState.selectedCity = this.getAttribute('data-city');
            console.log('📍 Выбран город:', AppState.selectedCity);
        });
    });

    // Обработчики выбора пола
    const genderOptions = document.querySelectorAll('.gender-option');
    genderOptions.forEach(option => {
        option.addEventListener('click', function() {
            genderOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            AppState.selectedGender = this.getAttribute('data-gender');
            console.log('👤 Выбран пол:', AppState.selectedGender);
        });
    });
}

/**
 * Инициализация обработчиков событий
 */
function initializeEventHandlers() {
    if (DOM.enterWaitingRoomBtn) {
        DOM.enterWaitingRoomBtn.addEventListener('click', handleEnterWaitingRoom);
    }
    
    if (DOM.backToSetupBtn) {
        DOM.backToSetupBtn.addEventListener('click', handleBackToSetup);
    }
    
    if (DOM.backToWaitingBtn) {
        DOM.backToWaitingBtn.addEventListener('click', handleBackToWaiting);
    }
    
    if (DOM.leaveGroupBtn) {
        DOM.leaveGroupBtn.addEventListener('click', handleLeaveGroup);
    }
    
    if (DOM.confirmStationBtn) {
        DOM.confirmStationBtn.addEventListener('click', handleConfirmStation);
    }
}

// =============================================
// ОБРАБОТЧИКИ ПОЛЬЗОВАТЕЛЬСКИХ ДЕЙСТВИЙ
// =============================================

/**
 * Обработчик входа в комнату ожидания
 */
async function handleEnterWaitingRoom() {
    console.log('🚪 Вход в комнату ожидания');
    
    const userData = createUserData();
    console.log('📍 Данные для создания пользователя:', userData);

    try {
        const validatedData = validateUserData(userData);
        const createdUser = await createUser(validatedData);
        
        if (createdUser) {
            AppState.currentUser = createdUser;
            AppState.userId = createdUser.id;
            
            if (DOM.setupScreen && DOM.waitingRoomScreen) {
                DOM.setupScreen.classList.remove('active');
                DOM.waitingRoomScreen.classList.add('active');
                
                // Загружаем дополнительные модули по требованию
                loadOptionalModules().then(() => {
                    if (typeof loadStationsMap === 'function') loadStationsMap();
                    if (typeof loadRequests === 'function') loadRequests();
                    startGlobalRefresh();
                });
                
                console.log('✅ Пользователь создан:', createdUser.name);
            } else {
                console.error('❌ Экраны не найдены');
                initializeCoreDOMElements();
            }
        }
    } catch (error) {
        console.error('❌ Ошибка создания пользователя:', error);
        handleUserCreationError(error);
    }
}

/**
 * Обработчик возврата к настройкам
 */
function handleBackToSetup() {
    console.log('🔙 Назад к настройкам');
    DOM.setupScreen.classList.add('active');
    DOM.waitingRoomScreen.classList.remove('active');
    stopGlobalRefresh();
}

/**
 * Обработчик возврата к ожиданию
 */
function handleBackToWaiting() {
    console.log('🔙 Назад к ожиданию');
    DOM.waitingRoomScreen.classList.add('active');
    DOM.joinedRoomScreen.classList.remove('active');
}

/**
 * Обработчик подтверждения станции
 */
async function handleConfirmStation() {
    console.log('✅ Подтверждаем станцию');
    
    const colorValue = getSelectedColor();
    if (!colorValue) {
        alert('Пожалуйста, укажите цвет верхней одежды');
        return;
    }
    
    if (!AppState.currentSelectedStation) {
        alert('Пожалуйста, выберите станцию на карте');
        return;
    }
    
    const wagonValue = getSelectedWagon();
    
    if (AppState.userId) {
        try {
            await updateUser(AppState.userId, {
                station: AppState.currentSelectedStation,
                wagon: wagonValue,
                color: colorValue,
                is_waiting: false,
                is_connected: true,
                status: 'Выбрал станцию: ' + AppState.currentSelectedStation
            });

            updateStationTitle(AppState.currentSelectedStation);

            if (typeof joinStation === 'function') {
                await joinStation(AppState.currentSelectedStation);
            }
            
        } catch (error) {
            console.error('Ошибка при обновлении параметров:', error);
            alert('Ошибка: ' + error.message);
        }
    }
}

/**
 * Обработчик выхода из группы
 */
async function handleLeaveGroup() {
    console.log('🚪 Покидаем группу');
    
    // Сбрасываем состояния при выходе из группы
    AppState.currentPosition = '';
    AppState.currentMood = '';
    
    if (AppState.userId) {
        try {
            await updateUser(AppState.userId, { 
                status: 'Ожидание',
                is_waiting: true,
                is_connected: false,
            });
        } catch (error) {
            console.error('Ошибка при обновлении пользователя:', error);
        }
    }
    
    AppState.currentGroup = null;
    DOM.joinedRoomScreen.classList.remove('active');
    DOM.waitingRoomScreen.classList.add('active');
    
    console.log('✅ Вышли из группы');
}

// =============================================
// ФУНКЦИИ РАБОТЫ С ДАННЫМИ ПОЛЬЗОВАТЕЛЯ
// =============================================

/**
 * Создание данных пользователя
 */
function createUserData() {
    const getRandomName = (gender) => {
        const names = gender === 'male' ? CONSTANTS.MALE_NAMES : CONSTANTS.FEMALE_NAMES;
        return names[Math.floor(Math.random() * names.length)];
    };

    const randomName = getRandomName(AppState.selectedGender);
    
    return {
        name: randomName,
        station: '',
        wagon: '',
        color: '',
        colorCode: getRandomColor(),
        status: 'В режиме ожидания',
        timer: "00:00",
        online: true,
        city: AppState.selectedCity,
        gender: AppState.selectedGender,
        position: '',
        mood: '',
        isWaiting: true,
        isConnected: false
    };
}

/**
 * Валидация данных пользователя
 */
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

/**
 * Обработка ошибок создания пользователя
 */
function handleUserCreationError(error) {
    const errorMessage = error.message.includes('Failed to fetch')
        ? 'Ошибка подключения к серверу. Проверьте интернет-соединение.'
        : `Ошибка создания профиля: ${error.message}`;
    
    alert(errorMessage);
    
    const retry = confirm('Не удалось подключиться к серверу. Попробовать снова?');
    if (retry) {
        handleEnterWaitingRoom();
    }
}

/**
 * Получение выбранного цвета
 */
function getSelectedColor() {
    if (window.colorSelect && window.colorSelect.value) {
        return window.colorSelect.value;
    } else {
        const colorInput = document.getElementById('color-select');
        return colorInput ? colorInput.value : '';
    }
}

/**
 * Получение выбранного вагона
 */
function getSelectedWagon() {
    if (window.wagonSelect && window.wagonSelect.value) {
        return window.wagonSelect.value;
    } else {
        const wagonSelect = document.getElementById('wagon-select');
        return wagonSelect ? wagonSelect.value : '';
    }
}

// =============================================
// API ФУНКЦИИ
// =============================================

/**
 * Создание пользователя через API
 */
async function createUser(userData) {
    try {
        console.log('📍 Отправка данных пользователя:', userData);
        console.log('📍 Отправка запроса на:', `${API_BASE}/users`);
        
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
        return createFallbackUser(userData);
    }
}

/**
 * Создание резервного пользователя (оффлайн режим)
 */
function createFallbackUser(userData) {
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
    
    // Сохраняем в localStorage
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

/**
 * Получение списка пользователей
 */
async function getUsers() {
    try {
        console.log('🔄 Запрос пользователей с сервера...');
        const response = await fetch(`${API_BASE}/users`);
        
        console.log('📡 Статус ответа:', response.status);
        console.log('📡 URL:', `${API_BASE}/users`);
        
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

/**
 * Обновление данных пользователя
 */
async function updateUser(userId, updates) {
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

/**
 * Удаление пользователя
 */
async function deleteUser(userId) {
    try {
        await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
    }
}

/**
 * Обновление активности пользователя
 */
async function pingActivity() {
    if (AppState.userId) {
        try {
            await fetch(`${API_BASE}/users/${AppState.userId}/ping`, { method: 'POST' });
            console.log('✅ Активность обновлена');
            return true;
        } catch (error) {
            console.error('Ошибка пинга активности:', error);
            return false;
        }
    }
}

// =============================================
// СИСТЕМА ОБНОВЛЕНИЯ ДАННЫХ
// =============================================

/**
 * Запуск глобального обновления данных
 */
function startGlobalRefresh() {
    if (AppState.globalRefreshInterval) {
        clearInterval(AppState.globalRefreshInterval);
    }
    
    AppState.globalRefreshInterval = setInterval(async () => {
        console.log('🔄 Глобальное обновление данных...');
        
        if (DOM.setupScreen && DOM.setupScreen.classList.contains('active')) {
            // На первом экране ничего не обновляем
        } else if (DOM.waitingRoomScreen && DOM.waitingRoomScreen.classList.contains('active')) {
            // На втором экране обновляем карту станций и запросы
            if (typeof loadStationsMap === 'function') await loadStationsMap();
            if (typeof loadRequests === 'function') await loadRequests();
            if (typeof restoreSelectedStation === 'function') restoreSelectedStation();
        } else if (DOM.joinedRoomScreen && DOM.joinedRoomScreen.classList.contains('active')) {
            // На третьем экране обновляем участников группы и запросы
            if (typeof loadGroupMembers === 'function') {
                console.log('🔄 Автообновление участников группы');
                await loadGroupMembers();
            }
            if (typeof loadRequests === 'function') {
                console.log('🔄 Автообновление запросов');
                await loadRequests();
            }
        }

        // Автоматически обновляем отображение таймеров
        if (DOM.joinedRoomScreen && DOM.joinedRoomScreen.classList.contains('active')) {
            if (typeof loadGroupMembers === 'function') {
                await loadGroupMembers();
            }
        }
        
        await pingActivity();
        
    }, CONSTANTS.REFRESH_INTERVAL);
    
    console.log('✅ Глобальное обновление запущено каждые 3 секунды');
}

/**
 * Остановка глобального обновления
 */
function stopGlobalRefresh() {
    if (AppState.globalRefreshInterval) {
        clearInterval(AppState.globalRefreshInterval);
        AppState.globalRefreshInterval = null;
        console.log('⏹️ Глобальное обновление остановлено');
    }
}

// =============================================
// СИСТЕМА МОДУЛЕЙ И ДОПОЛНИТЕЛЬНЫХ ФУНКЦИЙ
// =============================================

/**
 * Загрузка дополнительных модулей
 */
async function loadOptionalModules() {
    if (window.optionalModulesLoaded || window.optionalModulesLoading) return;
    
    window.optionalModulesLoading = true;
    console.log('📦 Загрузка дополнительных модулей...');
    
    try {
        initializeCoreDOMElements();
        await loadScript('optional-modules.js');

        if (typeof initializeOptionalDOMElements === 'function') {
            initializeOptionalDOMElements();
        }
        
        window.optionalModulesLoaded = true;
        window.optionalModulesLoading = false;
        console.log('✅ Дополнительные модули загружены');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки модулей:', error);
        window.optionalModulesLoading = false;
    }
}

/**
 * Принудительная инициализация joined room
 */
function forceInitializeJoinedRoom() {
    console.log('🔄 Принудительная инициализация joined room...');
    
    // Переинициализируем элементы
    if (typeof initializeOptionalDOMElements === 'function') {
        initializeOptionalDOMElements();
    }

    // Восстанавливаем заголовок станции если есть
    if (AppState.currentGroup && AppState.currentGroup.station) {
        updateStationTitle(AppState.currentGroup.station);
    } else if (AppState.currentSelectedStation) {
        updateStationTitle(AppState.currentSelectedStation);
    }

    // Восстанавливаем состояния
    if (typeof restoreSelectedStates === 'function') {
        restoreSelectedStates();
    }

    // Инициализируем карточки
    if (typeof initializeStateCards === 'function') {
        initializeStateCards();
    }

    // Обновляем индикаторы
    if (typeof updateStatusIndicators === 'function') {
        updateStatusIndicators();
    }
    if (typeof updateUserStateDisplay === 'function') {
        updateUserStateDisplay();
    }
    
    // Загружаем участников
    if (typeof loadGroupMembers === 'function') {
        loadGroupMembers();
    }
    
    console.log('✅ Joined room инициализирован');
}

// =============================================
// СИСТЕМА НАВИГАЦИИ
// =============================================

/**
 * Показать экран настроек
 */
function showSetup() {
    if (!DOM.setupScreen) initializeCoreDOMElements();
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    DOM.setupScreen.classList.add('active');
    stopGlobalRefresh();
}

/**
 * Показать комнату ожидания
 */
function showWaitingRoom() {
    if (!AppState.userId) {
        alert('Сначала создайте профиль');
        return showSetup();
    }
    if (!DOM.waitingRoomScreen) initializeCoreDOMElements();
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    DOM.waitingRoomScreen.classList.add('active');
    
    loadOptionalModules().then(() => {
        startGlobalRefresh();
    });
}

/**
 * Показать экран присоединенной комнаты
 */
function showJoinedRoom() {
    if (!AppState.currentGroup) {
        alert('Сначала выберите станцию');
        return;
    }
    if (!DOM.joinedRoomScreen) initializeCoreDOMElements();
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    DOM.joinedRoomScreen.classList.add('active');
    
    // Принудительная инициализация и обновление
    setTimeout(() => {
        forceInitializeJoinedRoom();
        
        // Дополнительное обновление данных
        setTimeout(() => {
            if (typeof loadGroupMembers === 'function') {
                console.log('🔄 Принудительное обновление при переходе на страницу');
                loadGroupMembers();
            }
            if (typeof loadRequests === 'function') {
                loadRequests();
            }
        }, 1000);
    }, 100);
    
    loadOptionalModules().then(() => {
        startGlobalRefresh();
    });
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =============================================

/**
 * Основная инициализация при загрузке DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚇 DOM загружен, инициализация ядра...');
    
    // Инициализируем основные DOM элементы
    initializeCoreDOMElements();
    
    // Инициализация обработчиков событий
    initializeEventHandlers();
    
    // Инициализация выбора города и пола
    initializeCityAndGenderSelection();
    
    console.log('✅ Ядро приложения инициализировано');
});

/**
 * Запуск при полной загрузке страницы
 */
window.addEventListener('load', function() {
    console.log('🚇 Ядро приложения "Из метро" полностью загружено');
});

/**
 * Остановка при закрытии страницы
 */
window.addEventListener('beforeunload', async function() {
    stopGlobalRefresh();
    
    if (AppState.userId) {
        try {
            await deleteUser(AppState.userId);
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
        }
    }
});