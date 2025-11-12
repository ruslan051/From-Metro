// Функции для inline обработчиков карточек состояний
function selectPosition(position, element) {
    console.log('📍 Выбрана позиция:', position, element);
    
    // Снимаем выделение со всех карточек позиций
    const allPositionCards = document.querySelectorAll('#position-cards .state-card');
    allPositionCards.forEach(card => {
        card.classList.remove('active');
        card.style.borderColor = '';
        card.style.backgroundColor = '';
        card.style.boxShadow = '';
    });
    
    // Выделяем текущую карточку
    element.classList.add('active');
    element.style.borderColor = '#28a745';
    element.style.backgroundColor = '#f8fff9';
    element.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
    
    currentPosition = position;
    localStorage.setItem('selectedPosition', position);
    
    updateUserState();
    updateUserStateDisplay();
    
    console.log('✅ Позиция установлена:', position);
}
// Тестовая функция для проверки работы
function testSelection() {
    console.log('🧪 Тестирование выбора...');
    
    // Находим и кликаем первую карточку позиции
    const firstPos = document.querySelector('#position-cards .state-card');
    if (firstPos) {
        console.log('📍 Тестируем:', firstPos.getAttribute('data-position'));
        selectPosition(firstPos.getAttribute('data-position'), firstPos);
    }
    
    // Находим и кликаем первую карточку настроения
    const firstMood = document.querySelector('#mood-cards .state-card');
    if (firstMood) {
        console.log('😊 Тестируем:', firstMood.getAttribute('data-mood'));
        selectMood(firstMood.getAttribute('data-mood'), firstMood);
    }
}

// Добавьте в глобальную область
window.testSelection = testSelection;
window.selectPosition = selectPosition;
window.selectMood = selectMood;
function selectMood(mood, element) {
    console.log('😊 Выбрано настроение:', mood, element);
    
    // Снимаем выделение со всех карточек настроений
    const allMoodCards = document.querySelectorAll('#mood-cards .state-card');
    allMoodCards.forEach(card => {
        card.classList.remove('active');
        card.style.borderColor = '';
        card.style.backgroundColor = '';
        card.style.boxShadow = '';
    });
    
    // Выделяем текущую карточку
    element.classList.add('active');
    element.style.borderColor = '#28a745';
    element.style.backgroundColor = '#f8fff9';
    element.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
    
    currentMood = mood;
    localStorage.setItem('selectedMood', mood);
    
    updateUserState();
    updateUserStateDisplay();
    
    console.log('✅ Настроение установлено:', mood);
}
// Станции метро (редко используемые данные)
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
// Удаляем глобальную переменную если она существует
if (typeof totalUsers !== 'undefined') {
    console.warn('⚠️ Удаляем глобальную переменную totalUsers');
    delete window.totalUsers;
}
// Глобальные переменные для DOM элементов
let wagonSelect, colorSelect, waitingTimer, waitingTimerDisplay, waitingTimerStatus;
let waitingStartTimerBtn, waitingStopTimerBtn, waitingTimerOptions, waitingTimerExpanded;
let positionCards, moodCards;
let groupMembersContainer, metroMap, requestsContainer;
// Регистрируем функции в глобальной области
window.loadStationsMap = loadStationsMap;
window.loadRequests = loadRequests;
window.loadGroupMembers = loadGroupMembers;
window.initializeWaitingRoomTimer = initializeWaitingRoomTimer;
window.initializeStateCards = initializeStateCards;
window.restoreSelectedStation = restoreSelectedStation;
window.joinStation = joinStation;
window.updateUserState = updateUserState;
window.startTimer = startTimer;
window.stopTimer = stopTimer;

// Функция инициализации после загрузки
function initializeOptionalModules() {
    initializeOptionalDOMElements();
    initializeWaitingRoomTimer();
    initializeStateCards();
    console.log('🎯 Дополнительные модули инициализированы');
}



// Инициализация дополнительных DOM элементов
function initializeOptionalDOMElements() {
    console.log('🔧 Инициализация дополнительных DOM элементов...');
    
    try {
        // Безопасная инициализация с проверкой элементов
        wagonSelect = document.getElementById('wagon-select');
        colorSelect = document.getElementById('color-select');
        waitingTimer = document.getElementById('waiting-room-timer');
        waitingTimerDisplay = document.getElementById('waiting-timer-display');
        waitingTimerStatus = document.getElementById('waiting-timer-status');
        waitingStartTimerBtn = document.getElementById('waiting-start-timer');
        waitingStopTimerBtn = document.getElementById('waiting-stop-timer');
        waitingTimerExpanded = document.getElementById('waiting-timer-expanded');
        
        // Элементы с проверкой на существование
        if (document.querySelectorAll('#waiting-timer-expanded .timer-option').length > 0) {
            waitingTimerOptions = document.querySelectorAll('#waiting-timer-expanded .timer-option');
        } else {
            waitingTimerOptions = [];
        }
        
        // Карта и группы
        metroMap = document.getElementById('metro-map');
        groupMembersContainer = document.getElementById('group-members');
        requestsContainer = document.getElementById('requests-container');
        
        // Карточки состояний
        positionCards = document.querySelectorAll('#position-cards .state-card');
        moodCards = document.querySelectorAll('#mood-cards .state-card');
        
        console.log('✅ Дополнительные DOM элементы инициализированы');
    } catch (error) {
        console.error('❌ Ошибка инициализации DOM элементов:', error);
    }
}
// Функция для отладки - проверяет наличие всех необходимых элементов
function debugStateElements() {
    console.log('🔍 Отладка элементов состояний:');
    
    const elements = {
        'position-cards': document.querySelectorAll('#position-cards .state-card').length,
        'mood-cards': document.querySelectorAll('#mood-cards .state-card').length,
        'position-indicator': document.getElementById('position-indicator') ? 'найден' : 'не найден',
        'mood-indicator': document.getElementById('mood-indicator') ? 'найден' : 'не найден',
        'current-position': document.getElementById('current-position') ? 'найден' : 'не найден',
        'current-mood': document.getElementById('current-mood') ? 'найден' : 'не найден',
        'group-members': document.getElementById('group-members') ? 'найден' : 'не найден'
    };
    
    console.table(elements);
    console.log('📍 Текущая позиция:', currentPosition);
    console.log('😊 Текущее настроение:', currentMood);
}

// Вызовите эту функцию в консоли браузера для отладки
window.debugStateElements = debugStateElements;
// Функция загрузки карты станций
async function loadStationsMap() {
  // Проверяем инициализацию
    if (!metroMap) {
        metroMap = document.getElementById('metro-map');
        if (!metroMap) {
            console.warn('❌ metroMap не найден');
            return;
        }
    }
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
    userCount = stationData.totalUsers || 0;  // ← ДОБАВЬ || 0
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
        if (metroMap) {
            metroMap.innerHTML = `
                <div class="no-requests">
                    <p>Ошибка загрузки карты</p>
                    <button class="btn" onclick="loadStationsMap()">Попробовать снова</button>
                </div>
            `;
        }
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

// Функция загрузки запросов
async function loadRequests() {
    // Проверяем инициализацию
    if (!requestsContainer) {
        requestsContainer = document.getElementById('requests-container');
        if (!requestsContainer) {
            console.log('ℹ️ Контейнер requests-container не найден, пропускаем загрузку запросов');
            return;
        }
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
        
        // Исправленная часть функции loadRequests
                stationUsers.forEach(user => {
                    const requestCard = document.createElement('div');
                    requestCard.className = 'request-card';
                    const isCurrentUser = userId && user.id === userId;
                    
                    // Формируем информацию о состоянии пользователя
                    const stateInfo = [];
                    if (user.position) stateInfo.push(`📍 ${user.position}`);
                    if (user.mood) stateInfo.push(`😊 ${user.mood}`);
                    
                    // Формируем дополнительную информацию
                    const additionalInfo = [];
                    if (user.color) additionalInfo.push(`🎨 ${user.color}`);
                    if (user.wagon && user.wagon !== '' && user.wagon !== 'Не указан') {
                        additionalInfo.push(`🚇 Вагон ${user.wagon}`);
                    }
                    
                    // ИСПРАВЛЕНО: используем const вместо повторного объявления
                    const stateText = stateInfo.join(' • ');
                    const additionalText = additionalInfo.join(' • ');
                    
                    requestCard.innerHTML = `
                        <div class="request-header">
                            <div class="user-info-compact">
                                <div class="user-avatar-small">${user.name.charAt(0)}</div>
                                <div class="user-details">
                                    <div class="user-name">${user.name} ${isCurrentUser ? '(Вы)' : ''}</div>
                                    <div class="user-status">
                                        <span class="color-indicator" style="background-color: ${user.color_code || '#007bff'}"></span>
                                        ${user.is_waiting ? '⏳ Ожидает присоединения' : '✅ На станции'}
                                    </div>
                                </div>
                            </div>
                            ${user.wagon && user.wagon !== 'Не указан' ? `<div class="wagon">Вагон ${user.wagon}</div>` : ''}
                        </div>
                        
                        ${stateText ? `<div class="user-state-info" style="margin: 10px 0; padding: 8px; background: #f8f9fa; border-radius: 5px; font-size: 14px;">
                            <strong>Состояние:</strong> ${stateText}
                        </div>` : ''}
                        
                        ${additionalText ? `<div style="font-size: 13px; color: #666; margin-top: 5px;">
                            ${additionalText}
                        </div>` : ''}
                    `;
                    
                    requestsContainer.appendChild(requestCard);
                });
    });
}
// Обновленная функция загрузки участников группы с подсветкой состояний
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
            const isCurrentUser = userId && user.id === userId;
            const memberElement = document.createElement('div');
            memberElement.className = `user-state-display ${isCurrentUser ? 'current-user' : ''}`;
            
            // Форматируем информацию о состоянии с подсветкой
            let stateDetails = '';
            if (user.position || user.mood) {
                if (user.position) {
                    stateDetails += `<span class="state-highlight">${user.position}</span>`;
                }
                if (user.mood) {
                    if (user.position) stateDetails += ' • ';
                    stateDetails += `<span class="state-highlight">${user.mood}</span>`;
                }
            } else {
                stateDetails = 'Позиция не указана • Настроение не указано';
            }
            // ДОБАВЛЯЕМ ИНФОРМАЦИЮ О ЦВЕТЕ ОДЕЖДЫ И ВАГОНЕ
            let additionalInfo = '';
            if (user.color) {
                additionalInfo += `🎨 ${user.color}`;
            }
            if (user.wagon && user.wagon !== '' && user.wagon !== 'Не указан') {
                if (additionalInfo) additionalInfo += ' • ';
                additionalInfo += `🚇 Вагон ${user.wagon}`;
            }
            memberElement.innerHTML = `
                <div style="width: 50px; height: 50px; border-radius: 50%; background: ${user.color_code || '#007bff'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">
                    ${user.name.charAt(0)}
                </div>
                <div class="user-state-info">
                    <div class="user-state-name">${user.name} ${isCurrentUser ? '(Вы)' : ''}</div>
                    <div class="user-state-details">
                        ${stateDetails}
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
// Функция обновления индикаторов текущего состояния
function updateStatusIndicators() {
    const positionIndicator = document.getElementById('position-indicator');
    const moodIndicator = document.getElementById('mood-indicator');
    const currentPositionSpan = document.getElementById('current-position');
    const currentMoodSpan = document.getElementById('current-mood');
    
    console.log('🔄 Обновление индикаторов:', { currentPosition, currentMood });
    
    if (currentPositionSpan) {
        currentPositionSpan.textContent = currentPosition || 'не выбрана';
        if (positionIndicator) {
            if (currentPosition) {
                positionIndicator.classList.add('highlighted');
                positionIndicator.style.background = '#e8f5e8';
                positionIndicator.style.borderColor = '#28a745';
                positionIndicator.style.color = '#155724';
            } else {
                positionIndicator.classList.remove('highlighted');
                positionIndicator.style.background = '';
                positionIndicator.style.borderColor = '';
                positionIndicator.style.color = '';
            }
        }
    }
    
    if (currentMoodSpan) {
        currentMoodSpan.textContent = currentMood || 'не выбрано';
        if (moodIndicator) {
            if (currentMood) {
                moodIndicator.classList.add('highlighted');
                moodIndicator.style.background = '#e8f5e8';
                moodIndicator.style.borderColor = '#28a745';
                moodIndicator.style.color = '#155724';
            } else {
                moodIndicator.classList.remove('highlighted');
                moodIndicator.style.background = '';
                moodIndicator.style.borderColor = '';
                moodIndicator.style.color = '';
            }
        }
    }
}
// Инициализация таймера в комнате ожидания
function initializeWaitingRoomTimer() {
      if (!waitingTimer) {
        waitingTimer = document.getElementById('waiting-room-timer');
    }
     if (!waitingTimerExpanded) {
        waitingTimerExpanded = document.getElementById('waiting-timer-expanded');
    }
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

// Инициализация карточек состояний (только восстановление)
function initializeStateCards() {
    console.log('🎯 Восстановление состояний карточек...');
    
    // Просто восстанавливаем выбранные состояния
    restoreSelectedStates();
    
    console.log('✅ Состояния карточек восстановлены');
}
// Функция восстановления выбранных состояний
function restoreSelectedStates() {
    const savedPosition = localStorage.getItem('selectedPosition');
    const savedMood = localStorage.getItem('selectedMood');
    
    console.log('🔄 Восстановление состояний:', { savedPosition, savedMood });
    
    if (savedPosition) {
        currentPosition = savedPosition;
        const positionCard = document.querySelector(`[data-position="${savedPosition}"]`);
        if (positionCard) {
            positionCard.classList.add('active');
            positionCard.style.borderColor = '#28a745';
            positionCard.style.backgroundColor = '#f8fff9';
            positionCard.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
            console.log('✅ Восстановлена позиция:', savedPosition);
        }
    }
    
    if (savedMood) {
        currentMood = savedMood;
        const moodCard = document.querySelector(`[data-mood="${savedMood}"]`);
        if (moodCard) {
            moodCard.classList.add('active');
            moodCard.style.borderColor = '#28a745';
            moodCard.style.backgroundColor = '#f8fff9';
            moodCard.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
            console.log('✅ Восстановлено настроение:', savedMood);
        }
    }
    
    updateUserStateDisplay();
}
// Функция обновления отображения состояния пользователя
function updateUserStateDisplay() {
    console.log('🔄 Обновление отображения состояния:', { currentPosition, currentMood });
    
    updateStatusIndicators();
    
    const userStateDetails = document.querySelector('.user-state-details');
    if (!userStateDetails) {
        console.warn('❌ user-state-details не найден');
        return;
    }
    
    let detailsHTML = '';
    
    if (currentPosition || currentMood) {
        if (currentPosition) {
            detailsHTML += `<span class="state-highlight">${currentPosition}</span>`;
        }
        if (currentMood) {
            if (currentPosition) detailsHTML += ' • ';
            detailsHTML += `<span class="state-highlight">${currentMood}</span>`;
        }
    } else {
        detailsHTML = 'Позиция не указана • Настроение не указано';
    }
    
    userStateDetails.innerHTML = detailsHTML;
    console.log('✅ Обновлен user-state-details:', detailsHTML);
    
    // Добавляем анимацию обновления
    const userStateDisplay = document.querySelector('.user-state-display.current-user');
    if (userStateDisplay) {
        userStateDisplay.classList.add('updating');
        setTimeout(() => {
            userStateDisplay.classList.remove('updating');
        }, 800);
    }
}
 // Добавляем анимацию обновления
    const userStateDisplay = document.querySelector('.user-state-display.current-user');
    if (userStateDisplay) {
        userStateDisplay.classList.add('updating');
        setTimeout(() => {
            userStateDisplay.classList.remove('updating');
        }, 800);
    }

// Функция обновления состояния пользователя
async function updateUserState() {
    if (userId && (currentPosition || currentMood)) {
        const stateText = [currentPosition, currentMood].filter(Boolean).join(' | ');
        
        try {
            await updateUser(userId, { 
                status: stateText || 'Ожидание',
                position: currentPosition,
                mood: currentMood
            });
            
            if (typeof loadGroupMembers === 'function') await loadGroupMembers();
            if (typeof loadRequests === 'function') await loadRequests();
            
            console.log('✅ Состояние обновлено на сервере:', stateText);
        } catch (error) {
            console.error('❌ Ошибка обновления состояния:', error);
        }
    }
}

// Функция восстановления выбранной станции
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



// Вспомогательные функции
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// API функция для присоединения к станции
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
             // ОБНОВЛЯЕМ ЗАГОЛОВОК ПЕРЕД ПОКАЗОМ ЭКРАНА
            updateStationTitle(station);

            waitingRoomScreen.classList.remove('active');
            joinedRoomScreen.classList.add('active');
            
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
// Функция обновления заголовка с названием станции
function updateStationTitle(stationName) {
    const titleElement = document.querySelector('#joined-room-screen h2');
    if (titleElement) {
        titleElement.innerHTML = `Вы выбрали станцию <span class="station-name-highlight">${stationName}</span>`;
        console.log('✅ Заголовок обновлен:', stationName);
    } else {
        console.warn('❌ Элемент заголовка не найден');
    }
}
// Инициализация дополнительных модулей при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Отложенная инициализация дополнительных элементов
    setTimeout(() => {
        initializeOptionalDOMElements();
        initializeWaitingRoomTimer();
        initializeStateCards();
    }, 100);
});
// Принудительное применение стилей
function forceApplyStyles() {
    console.log('🎨 Принудительное применение стилей...');
    
    // Применяем стили к активным карточкам
    document.querySelectorAll('.state-card.active').forEach(card => {
        card.style.borderColor = '#28a745';
        card.style.backgroundColor = '#f8fff9';
        card.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
    });
    
    // Применяем стили к выделенным индикаторам
    if (currentPosition) {
        const positionIndicator = document.getElementById('position-indicator');
        if (positionIndicator) {
            positionIndicator.classList.add('highlighted');
            positionIndicator.style.background = '#e8f5e8';
            positionIndicator.style.borderColor = '#28a745';
        }
    }
    
    if (currentMood) {
        const moodIndicator = document.getElementById('mood-indicator');
        if (moodIndicator) {
            moodIndicator.classList.add('highlighted');
            moodIndicator.style.background = '#e8f5e8';
            moodIndicator.style.borderColor = '#28a745';
        }
    }
    
    console.log('✅ Стили применены');
}

// Обновите forceInitializeJoinedRoom
function forceInitializeJoinedRoom() {
    console.log('🔄 Принудительная инициализация joined room...');
    
    // Переинициализируем элементы
    initializeOptionalDOMElements();
    
    // Восстанавливаем состояния
    restoreSelectedStates();
    
    // Инициализируем карточки
    initializeStateCards();
    
    // Обновляем индикаторы
    updateStatusIndicators();
    updateUserStateDisplay();
    
    // Применяем стили
    setTimeout(forceApplyStyles, 200);
    
    // Загружаем участников
    if (typeof loadGroupMembers === 'function') {
        loadGroupMembers();
    }
    
    console.log('✅ Joined room инициализирован');
}
// Тестовая функция для проверки кликов
function testStateSelection() {
    console.log('🧪 Тестирование выбора состояний...');
    
    // Находим первую карточку позиции и имитируем клик
    const firstPositionCard = document.querySelector('#position-cards .state-card');
    if (firstPositionCard) {
        console.log('📍 Тестируем клик по позиции:', firstPositionCard.getAttribute('data-position'));
        firstPositionCard.click();
    }
    
    // Находим первую карточку настроения и имитируем клик
    const firstMoodCard = document.querySelector('#mood-cards .state-card');
    if (firstMoodCard) {
        console.log('😊 Тестируем клик по настроению:', firstMoodCard.getAttribute('data-mood'));
        firstMoodCard.click();
    }
}

// Добавьте в глобальную область для тестирования
window.testStateSelection = testStateSelection;

console.log('✅ Дополнительные модули загружены');