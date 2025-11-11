// Глобальные флаги для проверки загрузки модулей
window.optionalModulesLoaded = false;
window.optionalModulesLoading = false;
// Глобальные переменные для индикатора
let usersIndicator = null;
let usersIndicatorCount = null;
let usersIndicatorTooltip = null;

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

// Безопасное получение элементов
function getElementSafe(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`❌ Элемент ${id} не найден`);
    }
    return element;
}
function initializeUsersIndicator() {

// Несколько попыток найти элемент
    let attempts = 0;
    const maxAttempts = 10;

     const tryInitialize = () => {
    

    usersIndicator = document.getElementById('users-indicator');
    if (!usersIndicator) {
        console.warn('❌ Индикатор пользователей не найден');
        return;
    }}
    
    usersIndicatorCount = usersIndicator.querySelector('.indicator-count');
    usersIndicatorTooltip = usersIndicator.querySelector('.indicator-tooltip');
    
    console.log('✅ Индикатор пользователей инициализирован');
       // ЗАПУСТИТЬ функцию
    tryInitialize();
}
// Функция обновления индикатора пользователей
async function updateUsersIndicator() {
    if (!usersIndicator || !usersIndicatorCount || !usersIndicatorTooltip) {
        setTimeout(() => {
            const indicator = document.getElementById('users-indicator');
            if (indicator) {
                const countElement = indicator.querySelector('.indicator-count');
                const tooltipElement = indicator.querySelector('.indicator-tooltip');
                if (countElement) countElement.textContent = '1';
                if (tooltipElement) tooltipElement.textContent = 'Вы в сети';
                indicator.classList.add('active');
            }
        }, 1000);
        return;
    }
    
    try {
        const users = await getUsers();
        
        // Фильтруем только онлайн пользователей в выбранном городе
        const onlineUsers = users.filter(user => 
            user.online === true && 
            user.city === selectedCity
        );
        
        // ВКЛЮЧАЕМ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ДАЖЕ ЕСЛИ ОН ЕЩЕ НЕ СОХРАНЕН НА СЕРВЕРЕ
        let userCount = onlineUsers.length;

        // Если текущий пользователь еще не в списке, но мы на сайте - добавляем его
        if (userId) {
            // Проверяем, есть ли текущий пользователь в списке
            const currentUserInList = onlineUsers.some(user => user.id === userId);
            if (!currentUserInList) {
                userCount += 1;
            }
        } else {
            // Если пользователь еще не создан, но находится на сайте - считаем его
            userCount += 1;
        }
        
        // Обновляем счетчик
        usersIndicatorCount.textContent = userCount;
        
        // Обновляем подсказку с детальной информацией
        if (userCount === 0) {
            usersIndicatorTooltip.textContent = 'Нет активных пользователей';
            usersIndicator.classList.remove('active');
        } else {
            // Группируем по станциям
            const usersByStation = {};
            
            // Добавляем текущего пользователя если он есть
            if (currentUser && !userId) {
                if (!usersByStation['Настройка профиля']) {
                    usersByStation['Настройка профиля'] = [];
                }
                usersByStation['Настройка профиля'].push({
                    name: 'Вы',
                    status: 'Настройка профиля'
                });
            }

            // Добавляем остальных пользователей
            onlineUsers.forEach(user => {
                const station = user.station || 'Ожидание выбора';
                if (!usersByStation[station]) {
                    usersByStation[station] = [];
                }
                usersByStation[station].push(user);
            });
            
            // Сортируем станции по количеству пользователей
            const sortedStations = Object.keys(usersByStation)
                .filter(station => station) // убираем пустые станции
                .sort((a, b) => usersByStation[b].length - usersByStation[a].length)
                .slice(0, 5); // показываем топ-5 станций
            
            let tooltipText = `Всего: ${userCount} пользователей\n`;
            
            if (sortedStations.length > 0) {
                tooltipText += '\nТоп станций:\n';
                sortedStations.forEach(station => {
                    const count = usersByStation[station].length;
                    tooltipText += `• ${station}: ${count}\n`;
                });
                
                if (Object.keys(usersByStation).length > 5) {
                    tooltipText += `... и еще ${Object.keys(usersByStation).length - 5} станций`;
                }
            } else {
                tooltipText += '\nПользователи в режиме ожидания';
            }
            
            usersIndicatorTooltip.textContent = tooltipText;
            usersIndicator.classList.add('active');
        }
        
        console.log(`👥 Индикатор обновлен: ${userCount} пользователей`);
        
    } catch (error) {
        console.error('❌ Ошибка обновления индикатора:', error);
        usersIndicatorCount.textContent = '1'; // Минимум 1 - текущий пользователь
        usersIndicatorTooltip.textContent = 'Вы в сети';
        usersIndicator.classList.add('active');
    }
}
// Инициализация основных DOM элементов
function initializeCoreDOMElements() {
    console.log('🔧 Инициализация основных DOM элементов...');
    
    // Основные экраны
    setupScreen = getElementSafe('setup-screen');
    waitingRoomScreen = getElementSafe('waiting-room-screen');
    joinedRoomScreen = getElementSafe('joined-room-screen');
    
     // Если элементы не найдены, попробуем найти их снова
    if (!setupScreen || !waitingRoomScreen || !joinedRoomScreen) {
        console.warn('❌ Основные экраны не найдены, повторная попытка...');
        setupScreen = document.getElementById('setup-screen');
        waitingRoomScreen = document.getElementById('waiting-room-screen');
        joinedRoomScreen = document.getElementById('joined-room-screen');
    }
    // Основные кнопки навигации
    backToSetupBtn = getElementSafe('back-to-setup');
    backToWaitingBtn = getElementSafe('back-to-waiting');
    leaveGroupBtn = getElementSafe('leave-group');
    enterWaitingRoomBtn = getElementSafe('enter-waiting-room');
    confirmStationBtn = getElementSafe('confirm-station');
    
    console.log('✅ Основные DOM элементы инициализированы');
}

// Основные обработчики событий
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
    } catch (error) { // ИСПРАВЛЕНО: заменил err на error
        console.error('❌ Ошибка создания пользователя:', error); // ИСПРАВЛЕНО
        
        // Показываем понятное сообщение об ошибке
        const errorMessage = error.message.includes('Failed to fetch')  // ИСПРАВЛЕНО
            ? 'Ошибка подключения к серверу. Проверьте интернет-соединение.'
            : `Ошибка создания профиля: ${error.message}`; // ИСПРАВЛЕНО
        
        alert(errorMessage);
        
        // Показываем кнопку для повторной попытки
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
    
    // ПРОВЕРКА ЦВЕТА - исправленная логика
    let colorValue = '';
    
    // Проверяем, есть ли элемент colorSelect на текущей странице
    if (window.colorSelect && window.colorSelect.value) {
        colorValue = window.colorSelect.value;
    } else {
        // Если на 3 странице, ищем элемент по-другому
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
    
    // Проверяем вагон
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
            
            if (typeof joinStation === 'function') {
                await joinStation(currentSelectedStation);
            }
            
        } catch (error) {
            console.error('Ошибка при обновлении параметров:', error);
            alert('Ошибка: ' + error.message);
        }
    }
}

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
async function handleLeaveGroup() {
    console.log('🚪 Покидаем группу');
      // СБРАСЫВАЕМ СОСТОЯНИЯ ПРИ ВЫХОДЕ ИЗ ГРУППЫ
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

// Инициализация выбора города и пола
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

// Основные функции API
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
      id: Date.now(),
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

// Функция для запуска глобального обновления каждые 5 секунд
function startGlobalRefresh() {
    if (globalRefreshInterval) {
        clearInterval(globalRefreshInterval);
    }
    
    globalRefreshInterval = setInterval(async () => {
        console.log('🔄 Глобальное обновление данных...');
        // ВСЕГДА обновляем индикатор пользователей независимо от страницы
        await updateUsersIndicator(); 
        if (setupScreen && setupScreen.classList.contains('active')) {
            // На первом экране ничего не обновляем
        } else if (waitingRoomScreen && waitingRoomScreen.classList.contains('active')) {
            // На втором экране обновляем карту станций и запросы
            if (typeof loadStationsMap === 'function') await loadStationsMap();
            if (typeof loadRequests === 'function') await loadRequests();
            if (typeof restoreSelectedStation === 'function') restoreSelectedStation();
        } else if (joinedRoomScreen && joinedRoomScreen.classList.contains('active')) {
            // На третьем экране обновляем участников группы и запросы
            if (typeof loadGroupMembers === 'function') await loadGroupMembers();
            if (typeof loadRequests === 'function') await loadRequests();
            if (typeof restoreSelectedStates === 'function') restoreSelectedStates();
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

// Функция загрузки дополнительных модулей
async function loadOptionalModules() {
    if (window.optionalModulesLoaded || window.optionalModulesLoading) return;
    
    window.optionalModulesLoading = true;
    console.log('📦 Загрузка дополнительных модулей...');
    
    try {
         // Сначала инициализируем основные DOM элементы
        initializeCoreDOMElements();
          
        // Затем загружаем скрипт
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
// Вспомогательная функция для загрузки скриптов
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Функции навигации (ДОБАВЛЕНО для HTML)
function showSetup() {
    if (!setupScreen) initializeCoreDOMElements();
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    setupScreen.classList.add('active');
    stopGlobalRefresh();
      // Но индикатор продолжаем обновлять
    updateUsersIndicator();
}

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

function showJoinedRoom() {
    if (!currentGroup) {
        alert('Сначала выберите станцию');
        return;
    }
    if (!joinedRoomScreen) initializeCoreDOMElements();
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    joinedRoomScreen.classList.add('active');
     // СБРАСЫВАЕМ СОСТОЯНИЯ ПЕРЕД ПОКАЗОМ СТРАНИЦЫ
    currentPosition = '';
    currentMood = '';
     // СБРАСЫВАЕМ ВЫБРАННЫЕ КАРТОЧКИ
    if (positionCards.length > 0) {
        positionCards.forEach(card => card.classList.remove('active'));
    }
    if (moodCards.length > 0) {
        moodCards.forEach(card => card.classList.remove('active'));
    }
    
    // Загружаем модули если нужно
    loadOptionalModules().then(() => {
          // ИНИЦИАЛИЗИРУЕМ КАРТОЧКИ СОСТОЯНИЙ (СБРОШЕННЫЕ)
        setTimeout(() => {
            if (typeof initializeStateCards === 'function') {
                initializeStateCards();
            }
        }, 100);
        startGlobalRefresh();
    });
}

// Вспомогательные функции
function getRandomColor() {
    const colors = ['#dc3545', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#e83e8c', '#fd7e14', '#20c997'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Основная инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚇 DOM загружен, инициализация ядра...');
    
    // Инициализируем основные DOM элементы
    initializeCoreDOMElements();
        // Инициализируем индикатор пользователей
    setTimeout(() => {
        initializeUsersIndicator();
    })
    // СРАЗУ показываем, что есть минимум 1 пользователь (текущий)
    setTimeout(() => {
        if (usersIndicatorCount) {
            usersIndicatorCount.textContent = '1';
            usersIndicatorTooltip.textContent = 'Вы в сети';
            usersIndicator.classList.add('active');
        }
         // Затем обновляем реальными данными
        updateUsersIndicator();
    }, 100);

    
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
    
    // Инициализация выбора города и пола
    initializeCityAndGenderSelection();
    
    console.log('✅ Ядро приложения инициализировано');
});

// Запуск при полной загрузке страницы
window.addEventListener('load', function() {
    
    
    console.log('🚇 Ядро приложения "Из метро" полностью загружено');
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