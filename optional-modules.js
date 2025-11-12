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
            
            const stateInfo = [];
            if (user.position) stateInfo.push(`📍 ${user.position}`);
            if (user.mood) stateInfo.push(`😊 ${user.mood}`);

            if (user.status && user.status.includes('⏰')) {
                const timerParts = user.status.split('⏰');
                if (timerParts.length > 1) {
                    const timerText = timerParts[1].trim();
                    stateInfo.push(`⏰ ${timerText}`);
                }
            }
            
            const additionalInfo = [];
            if (user.color) additionalInfo.push(`🎨 ${user.color}`);
            if (user.wagon && user.wagon !== '' && user.wagon !== 'Не указан') {
                additionalInfo.push(`🚇 Вагон ${user.wagon}`);
            }
            
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
        
        const activePosition = currentPosition;
        const activeMood = currentMood;
        
        groupMembersContainer.innerHTML = '';
        
        if (groupUsers.length === 0) {
            groupMembersContainer.innerHTML = '<div class="no-requests">Нет участников на этой станции</div>';
            return;
        }
        
        groupUsers.forEach(user => {
            const isCurrentUser = userId && user.id === userId;
            const memberElement = document.createElement('div');
            memberElement.className = `user-state-display ${isCurrentUser ? 'current-user' : ''}`;
            
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
            
            let timerInfo = '';
            if (user.status && user.status.includes('⏰')) {
                const timerParts = user.status.split('⏰');
                if (timerParts.length > 1) {
                    const timerText = timerParts[1].trim();
                    if (user.status.includes('запущен')) {
                        timerInfo = ` • <span class="timer-highlight">⏰ ${timerText}</span>`;
                    } else if (user.status.includes('истекло') || user.status.includes('остановлен')) {
                        timerInfo = ` • <span class="timer-highlight">⏰ ${timerText}</span>`;
                    } else {
                        timerInfo = ` • <span class="timer-waiting">⏰ ${timerText}</span>`;
                    }
                }
            }
            
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
                        ${stateDetails}${timerInfo}
                        ${additionalInfo ? `<div style="margin-top: 5px; font-size: 12px; color: #666;">${additionalInfo}</div>` : ''}
                    </div>
                </div>
            `;
            groupMembersContainer.appendChild(memberElement);
        });
        
        if (activePosition || activeMood) {
            setTimeout(() => {
                restoreSelectedStates();
                safeUserUpdateStateDisplay();
            }, 100);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки участников группы:', error);
        if (groupMembersContainer) {
            groupMembersContainer.innerHTML = '<div class="no-requests">Ошибка загрузки участников</div>';
        }
    }
}

// Инициализация таймера
function initializeWaitingRoomTimer() {
    console.log('⏰ Инициализация таймера...');
    
    if (!waitingTimer) {
        console.error('❌ Таймер не найден');
        return;
    }
    
    if (!waitingTimerExpanded) {
        console.error('❌ Расширенная часть таймера не найдена');
        return;
    }
    
    waitingTimer.addEventListener('click', function(event) {
        console.log('🎯 Клик по таймеру!');
        waitingTimerExpanded.classList.toggle('active');
    });
    
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

// Управление таймером
function startTimer(event) {
    console.log('🎯 Запуск таймера');
    
    if (event) event.stopPropagation();
    
    if (timerInterval) {
        console.log('⏹️ Таймер уже запущен');
        return;
    }
    
    timerSeconds = selectedMinutes * 60;
    updateTimerDisplay();
    
    console.log('🔄 Запуск таймера на', selectedMinutes, 'минут');
    
    if (userId) {
        const positionPart = currentPosition ? currentPosition : '';
        const moodPart = currentMood ? currentMood : '';
        
        let newStatus = '';
        if (positionPart && moodPart) {
            newStatus = `${positionPart} | ${moodPart} | ⏰ Таймер: ${selectedMinutes} мин`;
        } else if (positionPart || moodPart) {
            const statePart = positionPart || moodPart;
            newStatus = `${statePart} | ⏰ Таймер: ${selectedMinutes} мин`;
        } else {
            newStatus = `⏰ Таймер: ${selectedMinutes} мин`;
        }
        
        safeUserUpdate(userId, {
            status: newStatus,
            timer: formatTime(timerSeconds),
            timer_total: selectedMinutes * 60
        }).then((result) => {
            console.log('✅ Статус с таймером обновлен:', newStatus);
            forceRefreshUserDisplay();
        }).catch(error => {
            console.error('❌ Ошибка обновления статуса:', error);
        });
    }
    
    timerInterval = setInterval(function() {
        timerSeconds--;
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            stopTimer();
            alert('Время ожидания истекло!');
            
            if (userId) {
                const positionPart = currentPosition ? currentPosition : '';
                const moodPart = currentMood ? currentMood : '';
                
                let newStatus = '';
                if (positionPart && moodPart) {
                    newStatus = `${positionPart} | ${moodPart} | ⏰ Время истекло`;
                } else if (positionPart || moodPart) {
                    const statePart = positionPart || moodPart;
                    newStatus = `${statePart} | ⏰ Время истекло`;
                } else {
                    newStatus = '⏰ Время истекло';
                }
                
                safeUserUpdate(userId, {
                    status: newStatus,
                    timer: "00:00",
                    timer_total: 0
                });
            }
        }
    }, 1000);
    
    if (waitingStartTimerBtn) waitingStartTimerBtn.disabled = true;
    if (waitingStopTimerBtn) waitingStopTimerBtn.disabled = false;
}

function stopTimer(event) {
    console.log('🎯 Остановка таймера');
    
    if (event) {
        event.stopPropagation();
    }
    
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
            const positionPart = currentPosition ? currentPosition : '';
            const moodPart = currentMood ? currentMood : '';
            
            let newStatus = '';
            if (positionPart && moodPart) {
                newStatus = `${positionPart} | ${moodPart}`;
            } else if (positionPart || moodPart) {
                newStatus = positionPart || moodPart;
            } else {
                newStatus = 'Ожидание';
            }
            
            safeUserUpdate(userId, { 
                timer: "00:00",
                timer_total: 0,
                status: newStatus
            }).then(() => {
                forceRefreshUserDisplay();
            });
        } catch (error) {
            console.error('Ошибка при остановке таймера:', error);
        }
    }
    
    console.log('✅ Таймер остановлен, остается открытым');
    forceRefreshUserDisplay();
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
    localStorage.setItem('selectedPosition', position);
    
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
    localStorage.setItem('selectedMood', mood);
    
    safeUserUpdateStateDisplay();
    
    console.log('✅ Настроение установлено:', mood);
}

function initializeStateCards() {
    console.log('🎯 Восстановление состояний карточек...');
    restoreSelectedStates();
    console.log('✅ Состояния карточек восстановлены');
}

function restoreSelectedStates() {
    const savedPosition = localStorage.getItem('selectedPosition');
    const savedMood = localStorage.getItem('selectedMood');
    const savedStation = localStorage.getItem('selectedStation');

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

    const savedTimerMinutes = localStorage.getItem('selectedTimerMinutes');
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
    
    safeUserUpdateStateDisplay();
}

function safeUserUpdateStateDisplay() {
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
    
    const userStateDisplay = document.querySelector('.user-state-display.current-user');
    if (userStateDisplay) {
        userStateDisplay.classList.add('updating');
        setTimeout(() => {
            userStateDisplay.classList.remove('updating');
        }, 800);
    }
}

function updateStatusIndicators() {
    const positionIndicator = document.getElementById('position-indicator');
    const moodIndicator = document.getElementById('mood-indicator');
    const currentPositionSpan = document.getElementById('current-position');
    const currentMoodSpan = document.getElementById('current-mood');
    
    console.log('🔄 Обновление индикаторов:', { currentPosition, currentMood });
    
    if (currentPositionSpan) {
        currentPositionSpan.textContent = currentPosition || 'не выбрана';
        if (positionIndicator && currentPosition) {
            positionIndicator.classList.add('highlighted');
            positionIndicator.style.background = '#e8f5e8';
            positionIndicator.style.borderColor = '#28a745';
            positionIndicator.style.color = '#155724';
        }
    }
    
    if (currentMoodSpan) {
        currentMoodSpan.textContent = currentMood || 'не выбрано';
        if (moodIndicator && currentMood) {
            moodIndicator.classList.add('highlighted');
            moodIndicator.style.background = '#e8f5e8';
            moodIndicator.style.borderColor = '#28a745';
            moodIndicator.style.color = '#155724';
        }
    }
}

// Вспомогательные функции
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

function updateStationTitle(stationName) {
    const titleElement = document.querySelector('#joined-room-screen h2');
    if (titleElement) {
        titleElement.innerHTML = `Вы выбрали станцию <span class="station-name-highlight">${stationName}</span>`;
        console.log('✅ Заголовок обновлен:', stationName);
    } else {
        console.warn('❌ Элемент заголовка не найден');
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
        forceApplyStyles();
    }, 200);
    
    setTimeout(() => {
        if (typeof loadGroupMembers === 'function') {
            console.log('🔄 Принудительная загрузка участников группы');
            loadGroupMembers();
        }
        if (typeof loadRequests === 'function') {
            console.log('🔄 Принудительная загрузка запросов');
            loadRequests();
        }
    }, 500);
    
    console.log('✅ Joined room инициализирован');
}

function forceApplyStyles() {
    console.log('🎨 Принудительное применение стилей...');
    
    document.querySelectorAll('.state-card.active').forEach(card => {
        card.style.borderColor = '#28a745';
        card.style.backgroundColor = '#f8fff9';
        card.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
    });
    
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

function forceRefreshUserDisplay() {
    console.log('🔄 Принудительное обновление отображения пользователей');
    
    if (typeof loadGroupMembers === 'function') {
        console.log('🎯 Вызов loadGroupMembers');
        loadGroupMembers();
    }
    if (typeof loadRequests === 'function') {
        console.log('🎯 Вызов loadRequests');
        loadRequests();
    }
    
    if (waitingRoomScreen && waitingRoomScreen.classList.contains('active')) {
        if (typeof loadStationsMap === 'function') {
            console.log('🎯 Вызов loadStationsMap');
            loadStationsMap();
        }
    }
}

// Функция загрузки дополнительных модулей
async function loadOptionalModules() {
    if (window.optionalModulesLoaded || window.optionalModulesLoading) return;
    
    window.optionalModulesLoading = true;
    console.log('📦 Загрузка дополнительных модулей...');
    
    try {
        await loadScript('optional-modules.js');
        window.optionalModulesLoaded = true;
        window.optionalModulesLoading = false;
        console.log('✅ Дополнительные модули загружены');
    } catch (error) {
        console.error('❌ Ошибка загрузки модулей:', error);
        window.optionalModulesLoading = false;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

console.log('✅ Дополнительные модули загружены');