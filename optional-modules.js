// Дополнительные модули - функции интерфейса

// Регистрация функций в глобальной области
window.loadStationsMap = loadStationsMap;
window.loadRequests = loadRequests;
window.loadGroupMembers = loadGroupMembers;
window.initializeWaitingRoomTimer = initializeWaitingRoomTimer;
window.initializeStateCards = initializeStateCards;
window.restoreSelectedStation = restoreSelectedStation;
window.joinStation = joinStation;
window.selectPosition = selectPosition;
window.selectMood = selectMood;
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.forceInitializeJoinedRoom = forceInitializeJoinedRoom;
window.forceRefreshUserDisplay = forceRefreshUserDisplay;

// Получаем ссылки на DOM элементы для карточек состояний
let positionCards, moodCards;

// Функция загрузки карты станций
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
            metroMap.appendChild(stationElement);
        });

        // Обновить легенду
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
    if (!requestsContainer) {
        requestsContainer = document.getElementById('requests-container');
        if (!requestsContainer) {
            console.log('ℹ️ Контейнер requests-container не найден, пропускаем загрузку запросов');
            return;
        }
    }
    
    const users = await getUsers();
    requestsContainer.innerHTML = '';
    
    let filteredUsers = users.filter(user => 
        user.city === selectedCity && 
        user.online === true
    );
    
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
    
    // ... остальная реализация loadRequests
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
        
        // ... остальная реализация loadGroupMembers
    } catch (error) {
        console.error('Ошибка загрузки участников группы:', error);
    }
}

// Инициализация таймера
function initializeWaitingRoomTimer() {
    console.log('⏰ Инициализация таймера...');
    
    if (!waitingTimer) {
        console.error('❌ Таймер не найден');
        return;
    }
    
    // ... остальная реализация initializeWaitingRoomTimer
}

// Управление состояниями пользователя
function selectPosition(position, element) {
    console.log('📍 Выбрана позиция:', position, element);
    
    localStorage.setItem('selectedPosition', position);
    
    const allPositionCards = document.querySelectorAll('#position-cards .state-card');
    allPositionCards.forEach(card => {
        card.classList.remove('active');
        card.style.borderColor = '';
        card.style.backgroundColor = '';
        card.style.boxShadow = '';
    });
    
    element.classList.add('active');
    element.style.borderColor = '#28a745';
    element.style.backgroundColor = '#f8fff9';
    element.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
    
    currentPosition = position;
    
    safeUserUpdateStateDisplay();
    
    console.log('✅ Позиция установлена:', position);
}

function selectMood(mood, element) {
    console.log('😊 Выбрано настроение:', mood, element);
    
    const allMoodCards = document.querySelectorAll('#mood-cards .state-card');
    allMoodCards.forEach(card => {
        card.classList.remove('active');
        card.style.borderColor = '';
        card.style.backgroundColor = '';
        card.style.boxShadow = '';
    });
    
    element.classList.add('active');
    element.style.borderColor = '#28a745';
    element.style.backgroundColor = '#f8fff9';
    element.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
    
    currentMood = mood;
    
    safeUserUpdateStateDisplay();
    
    console.log('✅ Настроение установлено:', mood);
}

function initializeStateCards() {
    console.log('🎯 Инициализация карточек состояний...');
    
    // Получаем актуальные ссылки на карточки
    positionCards = document.querySelectorAll('#position-cards .state-card');
    moodCards = document.querySelectorAll('#mood-cards .state-card');
    
    restoreSelectedStates();
    console.log('✅ Состояния карточек восстановлены');
}

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
    
    safeUserUpdateStateDisplay();
}

function safeUserUpdateStateDisplay() {
    console.log('🔄 Обновление отображения состояния:', { currentPosition, currentMood });
    
    updateStatusIndicators();
    
    const userStateDetails = document.querySelector('.user-state-details');
    if (userStateDetails) {
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
    }
}

function updateStatusIndicators() {
    const currentPositionSpan = document.getElementById('current-position');
    const currentMoodSpan = document.getElementById('current-mood');
    
    if (currentPositionSpan) {
        currentPositionSpan.textContent = currentPosition || 'не выбрана';
    }
    
    if (currentMoodSpan) {
        currentMoodSpan.textContent = currentMood || 'не выбрано';
    }
}

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

function forceInitializeJoinedRoom() {
    console.log('🔄 Принудительная инициализация joined room...');
    
    if (currentGroup && currentGroup.station) {
        updateStationTitle(currentGroup.station);
    } else if (currentSelectedStation) {
        updateStationTitle(currentSelectedStation);
    }

    setTimeout(() => {
        restoreSelectedStates();
        initializeStateCards();
        updateStatusIndicators();
        safeUserUpdateStateDisplay();
    }, 200);
    
    console.log('✅ Joined room инициализирован');
}

function forceRefreshUserDisplay() {
    console.log('🔄 Принудительное обновление отображения пользователей');
    
    if (typeof loadGroupMembers === 'function') {
        loadGroupMembers();
    }
    if (typeof loadRequests === 'function') {
        loadRequests();
    }
}

// Управление таймером
function startTimer(event) {
    if (event) event.stopPropagation();
    
    if (timerInterval) {
        console.log('⏹️ Таймер уже запущен');
        return;
    }
    
    timerSeconds = selectedMinutes * 60;
    updateTimerDisplay();
    
    // ... остальная реализация startTimer
}

function stopTimer(event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // ... остальная реализация stopTimer
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

console.log('✅ Дополнительные модули загружены');