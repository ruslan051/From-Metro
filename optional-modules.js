// =============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ
// =============================================

// Константы станций метро
const STATIONS = {
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

// Глобальные переменные для DOM элементов
let wagonSelect, colorSelect, waitingTimer, waitingTimerDisplay, waitingTimerStatus;
let waitingStartTimerBtn, waitingStopTimerBtn, waitingTimerOptions, waitingTimerExpanded;
let positionCards, moodCards;
let groupMembersContainer, metroMap, requestsContainer;

// Стили для мобильной оптимизации
const MOBILE_TOUCH_STYLES = `
.station-map-item.touch-active {
    transform: scale(0.95);
    opacity: 0.9;
}

@media (max-width: 768px) {
    .station-map-item:active {
        transform: scale(0.98);
        transition: transform 0.1s;
    }
}
`;

// =============================================
// ИНИЦИАЛИЗАЦИЯ И УТИЛИТЫ
// =============================================

/**
 * Инициализация дополнительных DOM элементов
 */
function initializeOptionalDOMElements() {
    console.log('🔧 Инициализация дополнительных DOM элементов...');
    
    try {
        // Основные элементы интерфейса
        wagonSelect = document.getElementById('wagon-select');
        colorSelect = document.getElementById('color-select');
        waitingTimer = document.getElementById('waiting-room-timer');
        waitingTimerDisplay = document.getElementById('waiting-timer-display');
        waitingTimerStatus = document.getElementById('waiting-timer-status');
        waitingStartTimerBtn = document.getElementById('waiting-start-timer');
        waitingStopTimerBtn = document.getElementById('waiting-stop-timer');
        waitingTimerExpanded = document.getElementById('waiting-timer-expanded');
        
        // Элементы с проверкой на существование
        waitingTimerOptions = document.querySelectorAll('#waiting-timer-expanded .timer-option') || [];
        
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

/**
 * Инициализация мобильной оптимизации
 */
function initMobileOptimizations() {
    const metroMap = document.querySelector('.metro-map');
    
    // Добавляем индикатор скролла если есть много станций
    if (metroMap && metroMap.scrollHeight > metroMap.clientHeight) {
        metroMap.classList.add('scrollable');
    }
    
    // Оптимизация касаний для мобильных
    if ('ontouchstart' in window) {
        document.addEventListener('touchstart', function(e) {
            if (e.target.closest('.station-map-item')) {
                e.target.closest('.station-map-item').classList.add('touch-active');
            }
        }, { passive: true });
        
        document.addEventListener('touchend', function(e) {
            const touched = document.querySelector('.station-map-item.touch-active');
            if (touched) {
                setTimeout(() => touched.classList.remove('touch-active'), 150);
            }
        }, { passive: true });
    }
    
    // Вставка стилей для touch-улучшений
    const styleSheet = document.createElement('style');
    styleSheet.textContent = MOBILE_TOUCH_STYLES;
    document.head.appendChild(styleSheet);
}

/**
 * Инициализация дополнительных модулей
 */
function initializeOptionalModules() {
    initializeOptionalDOMElements();
    initializeWaitingRoomTimer();
    initializeStateCards();
    console.log('🎯 Дополнительные модули инициализированы');
}

// =============================================
// УПРАВЛЕНИЕ СОСТОЯНИЯМИ ПОЛЬЗОВАТЕЛЯ
// =============================================

/**
 * Выбор позиции пользователя
 */
function selectPosition(position, element) {
    console.log('📍 Выбрана позиция:', position, element);
    
    // Снимаем выделение со всех карточек позиций
    const allPositionCards = document.querySelectorAll('#position-cards .state-card');
    allPositionCards.forEach(card => resetCardStyles(card));
    
    // Выделяем текущую карточку
    applyActiveCardStyles(element);
    
    currentPosition = position;
    localStorage.setItem('selectedPosition', position);
    
    // Немедленно сохраняем состояние
    updateUserState();
    updateUserStateDisplay();
    
    console.log('✅ Позиция установлена:', position);
}

/**
 * Выбор настроения пользователя
 */
function selectMood(mood, element) {
    console.log('😊 Выбрано настроение:', mood, element);
    
    // Снимаем выделение со всех карточек настроений
    const allMoodCards = document.querySelectorAll('#mood-cards .state-card');
    allMoodCards.forEach(card => resetCardStyles(card));
    
    // Выделяем текущую карточку
    applyActiveCardStyles(element);
    
    currentMood = mood;
    localStorage.setItem('selectedMood', mood);
    
    // Немедленно сохраняем состояние
    updateUserState();
    updateUserStateDisplay();
    
    console.log('✅ Настроение установлено:', mood);
}

/**
 * Сброс стилей карточки
 */
function resetCardStyles(card) {
    card.classList.remove('active');
    card.style.borderColor = '';
    card.style.backgroundColor = '';
    card.style.boxShadow = '';
}

/**
 * Применение стилей активной карточки
 */
function applyActiveCardStyles(element) {
    element.classList.add('active');
    element.style.borderColor = '#28a745';
    element.style.backgroundColor = '#f8fff9';
    element.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
}

/**
 * Обновление состояния пользователя на сервере
 */
async function updateUserState() {
    if (!userId) return;
    
    try {
        const users = await getUsers();
        const currentUserData = users.find(u => u.id === userId);
        
        if (!currentUserData) return;

        // Проверяем, есть ли активный таймер в статусе
        const hasActiveTimer = currentUserData.status && currentUserData.status.includes('⏰');
        
        let newStatus = '';
        const stateParts = [];
        
        if (currentPosition) stateParts.push(currentPosition);
        if (currentMood) stateParts.push(currentMood);
        
        // Если есть активный таймер, сохраняем его
        if (hasActiveTimer) {
            const timerMatch = currentUserData.status.match(/⏰\s*(.+)/);
            if (timerMatch) {
                stateParts.push(`⏰ ${timerMatch[1].trim()}`);
            }
        }
        
        newStatus = stateParts.join(' | ');
        
        // Если ничего нет, ставим стандартный статус
        if (!newStatus) {
            newStatus = 'Ожидание';
        }

        // Обновляем пользователя только если статус изменился
        if (newStatus !== currentUserData.status) {
            await updateUser(userId, { 
                status: newStatus,
                position: currentPosition,
                mood: currentMood
            });
            console.log('✅ Состояние обновлено:', newStatus);
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления состояния:', error);
    }
}

/**
 * Явное сохранение состояния пользователя
 */
async function saveUserState() {
    console.log('💾 Явное сохранение состояния пользователя');
    
    if (!userId) {
        console.warn('❌ userId не установлен');
        return;
    }
    
    try {
        await updateUser(userId, {
            position: currentPosition,
            mood: currentMood,
            status: [currentPosition, currentMood].filter(Boolean).join(' | ') || 'Ожидание'
        });
        
        console.log('✅ Состояние сохранено на сервере');
        
        // Принудительное обновление отображения
        if (typeof loadGroupMembers === 'function') await loadGroupMembers();
        if (typeof loadRequests === 'function') await loadRequests();
        
    } catch (error) {
        console.error('❌ Ошибка сохранения состояния:', error);
    }
}

// =============================================
// ОТОБРАЖЕНИЕ СОСТОЯНИЙ ПОЛЬЗОВАТЕЛЯ
// =============================================

/**
 * Обновление отображения состояния пользователя
 */
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

/**
 * Обновление индикаторов текущего состояния
 */
function updateStatusIndicators() {
    const positionIndicator = document.getElementById('position-indicator');
    const moodIndicator = document.getElementById('mood-indicator');
    const currentPositionSpan = document.getElementById('current-position');
    const currentMoodSpan = document.getElementById('current-mood');
    
    console.log('🔄 Обновление индикаторов:', { currentPosition, currentMood });
    
    if (currentPositionSpan) {
        currentPositionSpan.textContent = currentPosition || 'не выбрана';
        if (positionIndicator) {
            updateIndicatorStyles(positionIndicator, currentPosition);
        }
    }
    
    if (currentMoodSpan) {
        currentMoodSpan.textContent = currentMood || 'не выбрано';
        if (moodIndicator) {
            updateIndicatorStyles(moodIndicator, currentMood);
        }
    }
}

/**
 * Обновление стилей индикатора
 */
function updateIndicatorStyles(indicator, hasValue) {
    if (hasValue) {
        indicator.classList.add('highlighted');
        indicator.style.background = '#e8f5e8';
        indicator.style.borderColor = '#28a745';
        indicator.style.color = '#155724';
    } else {
        indicator.classList.remove('highlighted');
        indicator.style.background = '';
        indicator.style.borderColor = '';
        indicator.style.color = '';
    }
}

// =============================================
// УПРАВЛЕНИЕ ТАЙМЕРОМ
// =============================================

/**
 * Инициализация таймера в комнате ожидания
 */
function initializeWaitingRoomTimer() {
    console.log('⏰ Инициализация таймера...');
    
    // Перезагружаем элементы
    waitingTimer = document.getElementById('waiting-room-timer');
    waitingTimerExpanded = document.getElementById('waiting-timer-expanded');
    waitingStartTimerBtn = document.getElementById('waiting-start-timer');
    waitingStopTimerBtn = document.getElementById('waiting-stop-timer');
    waitingTimerDisplay = document.getElementById('waiting-timer-display');
    waitingTimerStatus = document.getElementById('waiting-timer-status');
    
    console.log('📍 Найденные элементы:', {
        timer: !!waitingTimer,
        expanded: !!waitingTimerExpanded,
        startBtn: !!waitingStartTimerBtn,
        stopBtn: !!waitingStopTimerBtn,
        display: !!waitingTimerDisplay,
        status: !!waitingTimerStatus
    });
    
    if (!waitingTimer || !waitingTimerExpanded) {
        console.error('❌ Таймер не найден');
        return;
    }
    
    // Обработчик клика на заголовок таймера
    waitingTimer.addEventListener('click', function(event) {
        console.log('🎯 Клик по таймеру!');
        waitingTimerExpanded.classList.toggle('active');
        console.log('✅ Класс active:', waitingTimerExpanded.classList.contains('active'));
    });
    
    // Обработчики кнопок таймера
    if (waitingStartTimerBtn) {
        waitingStartTimerBtn.addEventListener('click', function() {
            console.log('🎯 Клик по кнопке запуска таймера');
            startTimer();
        });
    }
    
    if (waitingStopTimerBtn) {
        waitingStopTimerBtn.addEventListener('click', function() {
            console.log('🎯 Клик по кнопке остановки таймера');
            stopTimer();
        });
    }
    
    // Обработчики опций таймера
    const timerOptions = document.querySelectorAll('#waiting-timer-expanded .timer-option');
    console.log('📍 Найдено опций таймера:', timerOptions.length);
    
    timerOptions.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('🎯 Клик по опции таймера:', this.getAttribute('data-minutes'));
            timerOptions.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedMinutes = parseInt(this.getAttribute('data-minutes'));
            if (waitingTimerDisplay) {
                waitingTimerDisplay.textContent = `Готов к запуску: ${selectedMinutes} мин`;
            }
        });
    });
    
    console.log('✅ Таймер инициализирован');
}

/**
 * Запуск таймера
 */
function startTimer(event) {
    console.log('🎯 Запуск таймера');
    
    if (event) event.stopPropagation();
    
    if (timerInterval) {
        console.log('⏹️ Таймер уже запущен');
        return;
    }
    
    timerSeconds = selectedMinutes * 60;
    const timerEnd = new Date(Date.now() + timerSeconds * 1000);
    
    updateTimerDisplay();
    
    console.log('🔄 Запуск таймера на', selectedMinutes, 'минут');
    
    // Сохраняем таймер на сервере
    if (userId) {
        updateUser(userId, {
            timer_seconds: timerSeconds,
            timer_end: timerEnd.toISOString(),
            show_timer: true,
            status: generateUserStatus()
        }).then((result) => {
            console.log('✅ Таймер сохранен на сервере');
            forceRefreshUserDisplay();
        }).catch(error => {
            console.error('❌ Ошибка сохранения таймера:', error);
        });
    }
    
    timerInterval = setInterval(async function() {
        timerSeconds--;
        updateTimerDisplay();
        
        // Обновляем оставшееся время на сервере каждые 30 секунд
        if (timerSeconds % 30 === 0 && userId) {
            try {
                await updateUser(userId, { 
                    timer_seconds: timerSeconds
                });
            } catch (error) {
                console.error('Ошибка обновления таймера на сервере:', error);
            }
        }
        
        if (timerSeconds <= 0) {
            stopTimer();
            alert('Время ожидания истекло!');
        }
        
    }, 1000);
    
    if (waitingStartTimerBtn) waitingStartTimerBtn.disabled = true;
    if (waitingStopTimerBtn) waitingStopTimerBtn.disabled = false;
}

/**
 * Остановка таймера
 */
function stopTimer(event) {
    console.log('🎯 Остановка таймера');
    
    if (event) event.stopPropagation();
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    timerSeconds = 0;
    updateTimerDisplay();
    
    if (waitingStartTimerBtn) waitingStartTimerBtn.disabled = false;
    if (waitingStopTimerBtn) waitingStopTimerBtn.disabled = true;
    
    // Убираем таймер на сервере
    if (userId) {
        updateUser(userId, {
            timer_seconds: 0,
            show_timer: false,
            status: generateUserStatus()
        }).then(() => {
            console.log('✅ Таймер остановлен на сервере');
            forceRefreshUserDisplay();
        }).catch(error => {
            console.error('Ошибка при остановке таймера:', error);
        });
    }
}

/**
 * Обновление отображения таймера
 */
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

// =============================================
// КАРТА СТАНЦИЙ И ГРУППЫ
// =============================================

/**
 * Загрузка карты станций
 */
async function loadStationsMap() {
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
        const allStations = STATIONS[selectedCity];
        const stationsMap = {};
        
        data.stationStats.forEach(station => {
            stationsMap[station.station] = station;
        });
        
        allStations.forEach(stationName => {
            const stationData = stationsMap[stationName];
            const stationElement = createStationElement(stationName, stationData);
            metroMap.appendChild(stationElement);
        });

        // Обновление легенды
        updateStationsLegend(data.totalStats);
        
    } catch (error) {
        console.error('Ошибка загрузки карты станций:', error);
        showMapError();
    }
}

/**
 * Создание элемента станции
 */
function createStationElement(stationName, stationData) {
    const stationElement = document.createElement('div');
    stationElement.className = 'station-map-item';
    
    let userCount = 0;
    let waitingCount = 0;
    let connectedCount = 0;
    let stationClass = 'empty';

    if (stationData) {
        userCount = stationData.totalUsers || 0;
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
    
    return stationElement;
}

/**
 * Выбор станции
 */
function selectStation(stationName, stationData) {
    currentSelectedStation = stationName;
    localStorage.setItem('selectedStation', stationName);
    
    // Снимаем выделение со всех станций
    document.querySelectorAll('.station-map-item').forEach(item => {
        resetStationStyles(item);
    });
    
    // Выделяем выбранную станцию
    const selectedElement = document.querySelector(`[data-station="${stationName}"]`);
    if (selectedElement) {
        applySelectedStationStyles(selectedElement);
    }
    
    console.log('📍 Выбрана станция:', stationName);
}

/**
 * Сброс стилей станции
 */
function resetStationStyles(item) {
    item.style.borderWidth = '2px';
    item.style.borderColor = '';
    item.style.boxShadow = '';
    item.classList.remove('selected');
}

/**
 * Применение стилей выбранной станции
 */
function applySelectedStationStyles(element) {
    element.style.borderWidth = '4px';
    element.style.borderColor = '#0057b8';
    element.style.boxShadow = '0 0 10px rgba(0, 87, 184, 0.5)';
    element.classList.add('selected');
}

/**
 * Присоединение к станции
 */
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
            
            updateStationTitle(station);
            switchToJoinedRoom();
            
            console.log(`✅ Успешно присоединились к станции ${station}`);
        }
        
    } catch (error) {
        console.error('Ошибка при присоединении к станции:', error);
        alert('Ошибка при присоединении к станции: ' + error.message);
    }
}

/**
 * Переключение на экран присоединенной комнаты
 */
function switchToJoinedRoom() {
    waitingRoomScreen.classList.remove('active');
    joinedRoomScreen.classList.add('active');
    
    setTimeout(async () => {
        await loadGroupMembers();
        await loadRequests();
    }, 100);
}

// =============================================
// ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ
// =============================================

/**
 * Загрузка участников группы
 */
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
            const memberElement = createGroupMemberElement(user);
            groupMembersContainer.appendChild(memberElement);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки участников группы:', error);
        showGroupMembersError();
    }
}

/**
 * Создание элемента участника группы
 */
function createGroupMemberElement(user) {
    const isCurrentUser = userId && user.id === userId;
    const memberElement = document.createElement('div');
    memberElement.className = `user-state-display ${isCurrentUser ? 'current-user' : ''}`;
    
    const stateDetails = formatUserStateDetails(user);
    const additionalInfo = formatAdditionalUserInfo(user);
    
    memberElement.innerHTML = `
        <div class="user-avatar" style="background: ${user.color_code || '#007bff'};">
            ${user.name.charAt(0)}
        </div>
        <div class="user-state-info">
            <div class="user-state-name">${user.name} ${isCurrentUser ? '(Вы)' : ''}</div>
            <div class="user-state-details">
                ${stateDetails}
                ${additionalInfo ? `<div style="margin-top: 5px; font-size: 12px; color: #666;">${additionalInfo}</div>` : ''}
            </div>
        </div>
        ${user.show_timer && user.timer_seconds > 0 ? `
            <div class="user-timer-display">
                <div class="timer-label">⏰ Осталось:</div>
                <div class="timer-value">${formatTime(user.timer_seconds)}</div>
            </div>
        ` : ''}
    `;
    
    return memberElement;
}

/**
 * Загрузка запросов пользователей
 */
async function loadRequests() {
    if (!requestsContainer) {
        requestsContainer = document.getElementById('requests-container');
        if (!requestsContainer) {
            console.log('ℹ️ Контейнер requests-container не найден, пропускаем загрузку запросов');
            return;
        }
    }
    
    const users = await getUsers();
    requestsContainer.innerHTML = '';
    
    // Фильтрация пользователей
    let filteredUsers = users.filter(user => 
        user.city === selectedCity && 
        user.online === true
    );
    
    // Если мы на третьей странице, показываем только пользователей текущей станции
    if (joinedRoomScreen && joinedRoomScreen.classList.contains('active') && currentGroup) {
        filteredUsers = filteredUsers.filter(user => 
            user.station === currentGroup.station
        );
    }
    
    if (filteredUsers.length === 0) {
        showNoUsersMessage();
        return;
    }
    
    displayUsersByStation(filteredUsers);
}

// =============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

/**
 * Форматирование времени
 */
function formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Генерация статуса пользователя
 */
function generateUserStatus() {
    const positionPart = currentPosition ? currentPosition : '';
    const moodPart = currentMood ? currentMood : '';
    
    if (positionPart && moodPart) {
        return `${positionPart} | ${moodPart}`;
    } else if (positionPart || moodPart) {
        return positionPart || moodPart;
    } else {
        return 'Ожидание';
    }
}

/**
 * Принудительное обновление отображения
 */
function forceRefreshUserDisplay() {
    console.log('🔄 Принудительное обновление отображения пользователей');
    
    if (typeof loadGroupMembers === 'function') {
        loadGroupMembers();
    }
    if (typeof loadRequests === 'function') {
        loadRequests();
    }
    
    if (waitingRoomScreen && waitingRoomScreen.classList.contains('active')) {
        if (typeof loadStationsMap === 'function') {
            loadStationsMap();
        }
    }
}

// =============================================
// ВОССТАНОВЛЕНИЕ СОСТОЯНИЙ
// =============================================

/**
 * Инициализация карточек состояний
 */
function initializeStateCards() {
    console.log('🎯 Восстановление состояний карточек...');
    restoreSelectedStates();
    console.log('✅ Состояния карточек восстановлены');
}

/**
 * Восстановление выбранных состояний
 */
function restoreSelectedStates() {
    const savedPosition = localStorage.getItem('selectedPosition');
    const savedMood = localStorage.getItem('selectedMood');
    const savedTimerMinutes = localStorage.getItem('selectedTimerMinutes');
    
    console.log('🔄 Восстановление состояний:', { savedPosition, savedMood, savedTimerMinutes });
    
    // Восстановление позиции
    if (savedPosition) {
        currentPosition = savedPosition;
        const positionCard = document.querySelector(`[data-position="${savedPosition}"]`);
        if (positionCard) {
            applyActiveCardStyles(positionCard);
            console.log('✅ Восстановлена позиция:', savedPosition);
        }
    }
    
    // Восстановление настроения
    if (savedMood) {
        currentMood = savedMood;
        const moodCard = document.querySelector(`[data-mood="${savedMood}"]`);
        if (moodCard) {
            applyActiveCardStyles(moodCard);
            console.log('✅ Восстановлено настроение:', savedMood);
        }
    }
    
    // Восстановление таймера
    if (savedTimerMinutes) {
        selectedMinutes = parseInt(savedTimerMinutes);
        const timerDisplay = document.getElementById('waiting-timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = `Готов к запуску: ${selectedMinutes} мин`;
        }
        
        const timerOption = document.querySelector(`[data-minutes="${selectedMinutes}"]`);
        if (timerOption) {
            document.querySelectorAll('#waiting-timer-expanded .timer-option').forEach(btn => {
                btn.classList.remove('active');
            });
            timerOption.classList.add('active');
        }
    }
    
    updateUserStateDisplay();
}

/**
 * Восстановление выбранной станции
 */
function restoreSelectedStation() {
    const savedStation = localStorage.getItem('selectedStation');
    if (savedStation) {
        currentSelectedStation = savedStation;
        
        const selectedElement = document.querySelector(`[data-station="${savedStation}"]`);
        if (selectedElement) {
            document.querySelectorAll('.station-map-item').forEach(item => {
                resetStationStyles(item);
            });
            
            applySelectedStationStyles(selectedElement);
        }
    }
}

// =============================================
// ФУНКЦИИ ОТЛАДКИ
// =============================================

/**
 * Отладка элементов состояний
 */
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

/**
 * Полная отладка таймера
 */
function debugTimerFull() {
    console.log('🔍 ПОЛНАЯ ОТЛАДКА ТАЙМЕРА:');
    
    // Проверяем основные переменные
    console.log('📍 Основные переменные:', {
        userId: userId,
        selectedMinutes: selectedMinutes,
        timerSeconds: timerSeconds,
        timerInterval: timerInterval
    });
    
    // Проверяем localStorage
    const savedTimer = localStorage.getItem('selectedTimerMinutes');
    console.log('💾 localStorage selectedTimerMinutes:', savedTimer);
    
    // Проверяем DOM элементы
    const elements = {
        'waiting-timer-display': document.getElementById('waiting-timer-display')?.textContent,
        'waiting-timer-status': document.getElementById('waiting-timer-status')?.textContent,
        'timer-options-active': document.querySelectorAll('.timer-option.active').length
    };
    console.log('🎯 DOM элементы:', elements);
    
    // Проверяем данные текущего пользователя
    if (userId) {
        getUsers().then(users => {
            const currentUserData = users.find(u => u.id === userId);
            console.log('👤 Данные пользователя с сервера:', {
                id: currentUserData?.id,
                name: currentUserData?.name,
                status: currentUserData?.status,
                timer: currentUserData?.timer,
                timer_total: currentUserData?.timer_total,
                position: currentUserData?.position,
                mood: currentUserData?.mood
            });
        });
    }
}

// =============================================
// РЕГИСТРАЦИЯ ГЛОБАЛЬНЫХ ФУНКЦИЙ
// =============================================

// Функции для глобальной области видимости
window.debugTimer = debugTimer;
window.debugUserData = debugUserData;
window.debugTimerFull = debugTimerFull;
window.debugUserStatuses = debugUserStatuses;
window.saveUserState = saveUserState;
window.testSelection = testSelection;
window.selectPosition = selectPosition;
window.selectMood = selectMood;
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
window.debugStateElements = debugStateElements;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeOptionalDOMElements();
        initializeWaitingRoomTimer();
        initializeStateCards();
        initMobileOptimizations();
    }, 100);
});

console.log('✅ Дополнительные модули загружены');