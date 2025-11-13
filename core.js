// =============================================
// БЛОК 1: ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ
// =============================================

/**
 * Глобальные флаги для управления загрузкой модулей
 * optionalModulesLoaded - флаг завершения загрузки дополнительных модулей
 * optionalModulesLoading - флаг процесса загрузки (защита от повторной загрузки)
 */
window.optionalModulesLoaded = false;
window.optionalModulesLoading = false;

/**
 * Переменные состояния приложения
 * currentUser - данные текущего пользователя
 * timerInterval - ссылка на интервал таймера
 * timerSeconds - секунды таймера
 * userId - ID текущего пользователя
 * selectedMinutes - выбранное время ожидания
 * selectedCity - выбранный город
 * selectedGender - выбранный пол
 * currentPosition - текущая позиция в вагоне
 * currentMood - текущее настроение
 * currentGroup - текущая группа/комната
 * currentSelectedStation - выбранная станция
 * globalRefreshInterval - интервал глобального обновления данных
 */
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

/**
 * Базы данных сказочных имен для генерации псевдонимов
 */
const maleNames = ['Иван-Царевич', 'Кощей Бессмертный', 'Добрыня Никитич', 'Леший', 'Водяной', 'Бабай', 'Соловей-Разбойник', 'Змей Горыныч'];
const femaleNames = ['Василиса Премудрая', 'Баба Яга', 'Царевна-Лягушка', 'Снегурочка', 'Марья-Искусница', 'Аленушка', 'Кикимора', 'Русалка'];

/**
 * API endpoints для взаимодействия с бэкендом
 */
const API_BASE = 'https://metro-backend-xlkt.onrender.com/api';

/**
 * Глобальные ссылки на DOM элементы основных экранов
 */
let setupScreen, waitingRoomScreen, joinedRoomScreen;

/**
 * Глобальные ссылки на DOM элементы кнопок навигации
 */
let backToSetupBtn, backToWaitingBtn, leaveGroupBtn;
let enterWaitingRoomBtn, confirmStationBtn;

// =============================================
// БЛОК 2: УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

/**
 * Безопасное получение DOM элемента по ID с проверкой существования
 * @param {string} id - ID элемента
 * @returns {HTMLElement|null} Найденный элемент или null
 */
function getElementSafe(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`❌ Элемент ${id} не найден`);
    }
    return element;
}

/**
 * Генерация случайного цвета для пользователя
 * @returns {string} HEX код цвета
 */
function getRandomColor() {
    const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Генерация случайного имени в зависимости от пола
 * @param {string} gender - пол ('male' или 'female')
 * @returns {string} Случайное сказочное имя
 */
function getRandomName(gender) {
    const names = gender === 'male' ? maleNames : femaleNames;
    return names[Math.floor(Math.random() * names.length)];
}

/**
 * Динамическая загрузка JavaScript файлов
 * @param {string} src - путь к файлу скрипта
 * @returns {Promise} Промис загрузки скрипта
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
// БЛОК 3: ИНИЦИАЛИЗАЦИЯ DOM И ИНТЕРФЕЙСА
// =============================================

/**
 * Инициализация основных DOM элементов приложения
 * Находит и сохраняет ссылки на все ключевые элементы интерфейса
 */
function initializeCoreDOMElements() {
    console.log('🔧 Инициализация основных DOM элементов...');
    
    // Основные экраны приложения
    setupScreen = getElementSafe('setup-screen');
    waitingRoomScreen = getElementSafe('waiting-room-screen');
    joinedRoomScreen = getElementSafe('joined-room-screen');
    
    // Кнопки навигации между экранами
    backToSetupBtn = getElementSafe('back-to-setup');
    backToWaitingBtn = getElementSafe('back-to-waiting');
    leaveGroupBtn = getElementSafe('leave-group');
    enterWaitingRoomBtn = getElementSafe('enter-waiting-room');
    confirmStationBtn = getElementSafe('confirm-station');
    
    console.log('✅ Основные DOM элементы инициализированы');
}

/**
 * Инициализация выбора города и пола на экране настроек
 * Добавляет обработчики клика для опций выбора
 */
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

// =============================================
// БЛОК 4: ВАЛИДАЦИЯ И ОБРАБОТКА ДАННЫХ
// =============================================

/**
 * Валидация данных пользователя перед отправкой на сервер
 * Проверяет обязательные поля и устанавливает значения по умолчанию
 * @param {Object} userData - данные пользователя
 * @returns {Object} Валидированные и нормализованные данные
 * @throws {Error} Если отсутствуют обязательные поля
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

// =============================================
// БЛОК 5: API ИНТЕГРАЦИЯ И РАБОТА С СЕРВЕРОМ
// =============================================

// Кэш для пользователей с временной меткой
let usersCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10000; // 10 секунд

// Переменная для экспоненциальной задержки при ошибках
let retryDelay = 3000;

// Время последнего пинга активности
let lastPingTime = 0;
const PING_INTERVAL = 15000; // 15 секунд

/**
 * Создание нового пользователя в системе
 * @param {Object} userData - данные пользователя
 * @returns {Promise<Object>} Созданный пользователь
 */
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
}

/**
 * Получение списка пользователей с кэшированием
 * @returns {Promise<Array>} Массив пользователей
 */
async function getUsers() {
    const now = Date.now();
    
    // Возвращаем кэшированные данные если они свежие
    if (usersCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return usersCache;
    }
    
    try {
        const response = await fetch(`${API_BASE}/users`);
        
        if (response.status === 429) {
            // Используем старые данные при 429 ошибке
            console.warn('⚠️ 429 ошибка, используем кэш');
            return usersCache || [];
        }
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const users = await response.json();
        usersCache = users.map((user, index) => ({
            ...user,
            id: user.id || index + 1
        }));
        cacheTimestamp = now;
        
        return usersCache;
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        return usersCache || []; // Возвращаем кэш при ошибке
    }
}

/**
 * Обновление данных пользователя
 * @param {string} userId - ID пользователя
 * @param {Object} updates - объект с обновляемыми полями
 * @returns {Promise<Object|null>} Обновленный пользователь или null при ошибке
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
 * Удаление пользователя из системы
 * @param {string} userId - ID пользователя
 */
async function deleteUser(userId) {
    try {
        await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
    }
}

/**
 * Обновление времени последней активности пользователя
 * @returns {Promise<boolean>} Успешность выполнения
 */
async function pingActivity() {
    if (!userId) return false;
    
    const now = Date.now();
    if (now - lastPingTime < PING_INTERVAL) {
        return false; // Слишком рано для следующего ping
    }
    
    try {
        await fetch(`${API_BASE}/users/${userId}/ping`, { method: 'POST' });
        lastPingTime = now;
        console.log('✅ Активность обновлена');
        return true;
    } catch (error) {
        console.error('Ошибка пинга активности:', error);
        return false;
    }
}

// =============================================
// БЛОК 6: УПРАВЛЕНИЕ СОСТОЯНИЕМ ПРИЛОЖЕНИЯ
// =============================================

/**
 * Запуск периодического обновления данных приложения
 * Интеллектуально обновляет только нужные данные для текущего экрана
 */
function startGlobalRefresh() {
    if (globalRefreshInterval) {
        clearInterval(globalRefreshInterval);
    }
    
    globalRefreshInterval = setInterval(async () => {
        console.log('🔄 Глобальное обновление данных...');
        
        // Стратегия обновления в зависимости от активного экрана
        if (setupScreen && setupScreen.classList.contains('active')) {
            // На первом экране ничего не обновляем
        } else if (waitingRoomScreen && waitingRoomScreen.classList.contains('active')) {
            // На втором экране обновляем карту станций и запросы
            if (typeof loadStationsMap === 'function') await loadStationsMap();
            if (typeof loadRequests === 'function') await loadRequests();
            if (typeof restoreSelectedStation === 'function') restoreSelectedStation();
        } else if (joinedRoomScreen && joinedRoomScreen.classList.contains('active')) {
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
        if (joinedRoomScreen && joinedRoomScreen.classList.contains('active')) {
            if (typeof loadGroupMembers === 'function') {
                await loadGroupMembers();
            }
        }
        
        await pingActivity();
        
    }, 10000); // интервал 10 секунд обновления
    
    console.log('✅ Глобальное обновление запущено каждые 10 секунд');
}

/**
 * Остановка глобального обновления данных
 */
function stopGlobalRefresh() {
    if (globalRefreshInterval) {
        clearInterval(globalRefreshInterval);
        globalRefreshInterval = null;
        console.log('⏹️ Глобальное обновление остановлено');
    }
}

/**
 * Принудительная инициализация экрана присоединенной комнаты
 * Вызывается при переходе на экран для восстановления состояния
 */
function forceInitializeJoinedRoom() {
    console.log('🔄 Принудительная инициализация joined room...');
    
    // Переинициализируем элементы
    if (typeof initializeOptionalDOMElements === 'function') {
        initializeOptionalDOMElements();
    }

    // Восстанавливаем заголовок станции если есть
    if (currentGroup && currentGroup.station) {
        updateStationTitle(currentGroup.station);
    } else if (currentSelectedStation) {
        updateStationTitle(currentSelectedStation);
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
// БЛОК 7: ДИНАМИЧЕСКАЯ ЗАГРУЗКА МОДУЛЕЙ
// =============================================

/**
 * Загрузка дополнительных функциональных модулей приложения
 * Использует ленивую загрузку для оптимизации начальной загрузки
 */
async function loadOptionalModules() {
    if (window.optionalModulesLoaded || window.optionalModulesLoading) return;
    
    window.optionalModulesLoading = true;
    console.log('📦 Загрузка дополнительных модулей...');
    
    try {
        // Сначала инициализируем основные DOM элементы
        initializeCoreDOMElements();
        
        // Затем загружаем скрипт дополнительных модулей
        await loadScript('optional-modules.js');

        // Затем инициализируем дополнительные элементы
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

// =============================================
// БЛОК 8: ОБРАБОТЧИКИ ПОЛЬЗОВАТЕЛЬСКИХ ДЕЙСТВИЙ
// =============================================

/**
 * Обработчик входа в комнату ожидания
 * Создает пользователя и переключает на экран ожидания
 */
async function handleEnterWaitingRoom() {
    console.log('🚪 Вход в комнату ожидания');
    
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
        
        // Показываем понятное сообщение об ошибке
        const errorMessage = error.message.includes('Failed to fetch')
            ? 'Ошибка подключения к серверу. Проверьте интернет-соединение.'
            : `Ошибка создания профиля: ${error.message}`;
        
        alert(errorMessage);
        
        // Показываем кнопку для повторной попытки
        const retry = confirm('Не удалось подключиться к серверу. Попробовать снова?');
        if (retry) {
            handleEnterWaitingRoom();
        }
    }
}

/**
 * Обработчик возврата к экрану настроек
 */
function handleBackToSetup() {
    console.log('🔙 Назад к настройкам');
    setupScreen.classList.add('active');
    waitingRoomScreen.classList.remove('active');
    stopGlobalRefresh();
}

/**
 * Обработчик возврата к экрану ожидания
 */
function handleBackToWaiting() {
    console.log('🔙 Назад к ожиданию');
    waitingRoomScreen.classList.add('active');
    joinedRoomScreen.classList.remove('active');
}

/**
 * Обработчик подтверждения выбора станции
 * Обновляет данные пользователя и присоединяет к станции
 */
async function handleConfirmStation() {
    console.log('✅ Подтверждаем станцию');
    
    // Проверяем выбор цвета верхней одежды
    let colorValue = '';
    if (window.colorSelect && window.colorSelect.value) {
        colorValue = window.colorSelect.value;
    } else {
        const colorInput = document.getElementById('color-select');
        if (colorInput) {
            colorValue = colorInput.value;
        }
    }
    
    if (!colorValue) {
        alert('Пожалуйста, укажите цвет верхней одежды');
        return;
    }
    
    if (!currentSelectedStation) {
        alert('Пожалуйста, выберите станцию на карте');
        return;
    }
    
    // Проверяем выбор вагона
    let wagonValue = '';
    if (window.wagonSelect && window.wagonSelect.value) {
        wagonValue = window.wagonSelect.value;
    } else {
        const wagonSelect = document.getElementById('wagon-select');
        if (wagonSelect) {
            wagonValue = wagonSelect.value;
        }
    }
    
    if (userId) {
        try {
            await updateUser(userId, {
                station: currentSelectedStation,
                wagon: wagonValue,
                color: colorValue,
                is_waiting: false,
                is_connected: true,
                status: 'Выбрал станцию: ' + currentSelectedStation
            });

            // Обновляем заголовок перед переходом
            if (typeof updateStationTitle === 'function') {
                updateStationTitle(currentSelectedStation);
            }

            if (typeof joinStation === 'function') {
                await joinStation(currentSelectedStation);
            }
            
        } catch (error) {
            console.error('Ошибка при обновлении параметров:', error);
            alert('Ошибка: ' + error.message);
        }
    }
}

/**
 * Обработчик выхода из группы
 * Сбрасывает состояние пользователя и возвращает в комнату ожидания
 */
async function handleLeaveGroup() {
    console.log('🚪 Покидаем группу');
    
    // Сбрасываем состояния при выходе из группы
    currentPosition = '';
    currentMood = '';
    
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

// =============================================
// БЛОК 9: УПРАВЛЕНИЕ НАВИГАЦИЕЙ МЕЖДУ ЭКРАНАМИ
// =============================================

/**
 * Показать экран настроек (первый экран)
 */
function showSetup() {
    if (!setupScreen) initializeCoreDOMElements();
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    setupScreen.classList.add('active');
    stopGlobalRefresh();
}

/**
 * Показать экран комнаты ожидания (второй экран)
 */
function showWaitingRoom() {
    if (!userId) {
        alert('Сначала создайте профиль');
        return showSetup();
    }
    if (!waitingRoomScreen) initializeCoreDOMElements();
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    waitingRoomScreen.classList.add('active');
    
    // Загружаем модули если нужно
    loadOptionalModules().then(() => {
        startGlobalRefresh();
    });
}

/**
 * Показать экран присоединенной комнаты (третий экран)
 */
function showJoinedRoom() {
    if (!currentGroup) {
        alert('Сначала выберите станцию');
        return;
    }
    if (!joinedRoomScreen) initializeCoreDOMElements();
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    joinedRoomScreen.classList.add('active');
    
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
    
    // Загружаем модули если нужно
    loadOptionalModules().then(() => {
        startGlobalRefresh();
    });
}

// =============================================
// БЛОК 10: ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =============================================

/**
 * Основная инициализация при загрузке DOM
 * Настраивает все обработчики событий и элементы интерфейса
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚇 DOM загружен, инициализация ядра...');
    
    // Инициализируем основные DOM элементы
    initializeCoreDOMElements();
    
    // Инициализация обработчиков событий для кнопок навигации
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
    
    console.log('✅ Ядро приложения инициализировано');
});

/**
 * Запуск при полной загрузке страницы
 */
window.addEventListener('load', function() {
    console.log('🚇 Ядро приложения "Из метро" полностью загружено');
});

/**
 * Очистка ресурсов при закрытии страницы
 * Останавливает обновления и удаляет пользователя
 */
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