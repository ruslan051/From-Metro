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

// Глобальные переменные для DOM элементов
let wagonSelect, colorSelect, waitingTimer, waitingTimerDisplay, waitingTimerStatus;
let waitingStartTimerBtn, waitingStopTimerBtn, waitingTimerOptions, waitingTimerExpanded;
let positionCards, moodCards;
let groupMembersContainer, metroMap;
// УДАЛЕНО: requestsContainer;

// Регистрируем функции в глобальной области
window.loadStationsMap = loadStationsMap;
window.loadGroupMembers = loadGroupMembers;
window.initializeWaitingRoomTimer = initializeWaitingRoomTimer;
window.initializeStateCards = initializeStateCards;
window.restoreSelectedStation = restoreSelectedStation;
window.joinStation = joinStation;
window.updateUserState = updateUserState;
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.restoreSelectedStates = restoreSelectedStates; // ДОБАВЛЕНО

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
        // УДАЛЕНО: requestsContainer = document.getElementById('requests-container');
        
        // Карточки состояний
        positionCards = document.querySelectorAll('#position-cards .state-card');
        moodCards = document.querySelectorAll('#mood-cards .state-card');
        
        console.log('✅ Дополнительные DOM элементы инициализированы');
    } catch (error) {
        console.error('❌ Ошибка инициализации DOM элементов:', error);
    }
}

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

// Функция загрузки участников группы
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
            
            // Формируем информацию о состоянии пользователя
            const stateInfo = [];
            if (user.position) stateInfo.push(`Позиция: ${user.position}`);
            if (user.mood) stateInfo.push(`Настроение: ${user.mood}`);
            const stateText = stateInfo.join(' • ');
            
            memberElement.innerHTML = `
                <div style="width: 50px; height: 50px; border-radius: 50%; background: ${user.color_code || '#007bff'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">
                    ${user.name.charAt(0)}
                </div>
                <div class="user-state-info">
                    <div class="user-state-name">${user.name} ${user.id === userId ? '(Вы)' : ''}</div>
                    <div class="user-state-details">
                        ${stateText || 'Состояние не указано'}
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

// Инициализация таймера в комнате ожидания - ИСПРАВЛЕННАЯ ВЕРСИЯ
function initializeWaitingRoomTimer() {
    if (!waitingTimer) {
        waitingTimer = document.getElementById('waiting-room-timer');
    }
    
    // Убираем переключение при клике на весь таймер
    // и делаем только кнопки интерактивными
    
    if (waitingStartTimerBtn) {
        waitingStartTimerBtn.addEventListener('click', startTimer);
    }
    
    if (waitingStopTimerBtn) {
        waitingStopTimerBtn.addEventListener('click', stopTimer);
    }
    
    if (waitingTimerOptions && waitingTimerOptions.length > 0) {
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
    
    console.log('✅ Таймер комнаты ожидания инициализирован');
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

// Инициализация карточек состояний - ИСПРАВЛЕННАЯ ВЕРСИЯ
function initializeStateCards() {
    console.log('🎯 Инициализация карточек состояний...');
    
    // Восстанавливаем выбранные состояния из localStorage
    restoreSelectedStates();
    
    if (positionCards.length === 0) {
        console.warn('❌ Карточки позиций не найдены');
    } else {
        positionCards.forEach(card => {
            card.addEventListener('click', async function() {
                positionCards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                currentPosition = this.getAttribute('data-position');
                
                // Сохраняем в localStorage
                localStorage.setItem('selectedPosition', currentPosition);
                
                await updateUserState();
                console.log('📍 Позиция обновлена:', currentPosition);
            });
        });
    }

    if (moodCards.length === 0) {
        console.warn('❌ Карточки настроений не найдены');
    } else {
        moodCards.forEach(card => {
            card.addEventListener('click', async function() {
                moodCards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                currentMood = this.getAttribute('data-mood');
                
                // Сохраняем в localStorage
                localStorage.setItem('selectedMood', currentMood);
                
                await updateUserState();
                console.log('😊 Настроение обновлено:', currentMood);
            });
        });
    }

    console.log('✅ Карточки состояний инициализированы');
}

// Функция восстановления выбранных состояний
function restoreSelectedStates() {
    const savedPosition = localStorage.getItem('selectedPosition');
    const savedMood = localStorage.getItem('selectedMood');
    
    if (savedPosition) {
        currentPosition = savedPosition;
        positionCards.forEach(card => {
            if (card.getAttribute('data-position') === savedPosition) {
                card.classList.add('active');
            }
        });
    }
    
    if (savedMood) {
        currentMood = savedMood;
        moodCards.forEach(card => {
            if (card.getAttribute('data-mood') === savedMood) {
                card.classList.add('active');
            }
        });
    }
    
    // Обновляем состояние пользователя если есть сохраненные данные
    if (savedPosition || savedMood) {
        updateUserState();
    }
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
            
            // Обновляем заголовок с названием станции
            const roomTitle = document.querySelector('#joined-room-screen h2');
            if (roomTitle) {
                roomTitle.textContent = `Станция: ${station}`;
            }
            
            waitingRoomScreen.classList.remove('active');
            joinedRoomScreen.classList.add('active');
            
            setTimeout(async () => {
                await loadGroupMembers();
            }, 100);
            
            console.log(`✅ Успешно присоединились к станции ${station}`);
        }
        
    } catch (error) {
        console.error('Ошибка при присоединении к станции:', error);
        alert('Ошибка при присоединении к станции: ' + error.message);
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

console.log('✅ Дополнительные модули загружены');