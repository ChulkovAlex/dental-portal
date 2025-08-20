import React, { useState, useEffect, useMemo } from 'react';

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [viewMode, setViewMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Данные из IDent
  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);

  // Мок-данные для админа (позже заменю на данные из IDent)
  const [users, setUsers] = useState([
    { id: 1, username: 'admin', name: 'Администратор', role: 'admin', email: 'admin@clinic.ru', phone: '+7 912 345-67-00' },
    { id: 2, username: 'reception', name: 'Регистратура', role: 'reception', email: 'reception@clinic.ru', phone: '+7 912 345-67-01' }
  ]);

  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [newSchedule, setNewSchedule] = useState({
    doctorId: '',
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '17:00',
    status: 'available',
    confirmed: false
  });

  const [selectedDoctorForConfirmation, setSelectedDoctorForConfirmation] = useState('');

  // Форматирование даты
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateTime = (dateString, timeString) => {
    const [year, month, day] = dateString.split('-');
    const [hours, minutes] = timeString.split(':');
    return new Date(year, month - 1, day, hours, minutes);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} дн. назад`;
    if (diffHours > 0) return `${diffHours} ч. назад`;
    if (diffMins > 0) return `${diffMins} мин. назад`;
    return 'только что';
  };

  // Загрузка данных из IDent API
  const fetchDataFromIdent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Загружаем все данные параллельно
      const [doctorsRes, branchesRes, scheduleRes, leadsRes, callsRes] = await Promise.all([
        fetch('https://ident-proxy.onrender.com/api/doctors'),
        fetch('https://ident-proxy.onrender.com/api/branches'),
        fetch(`https://ident-proxy.onrender.com/api/schedule?date=${formatDate(selectedDate)}`),
        fetch('https://ident-proxy.onrender.com/api/leads'),
        fetch('https://ident-proxy.onrender.com/api/calls')
      ]);
      
      // Парсим ответы
      const [doctorsData, branchesData, scheduleData, leadsData, callsData] = await Promise.all([
        doctorsRes.json(),
        branchesRes.json(),
        scheduleRes.json(),
        leadsRes.json(),
        callsRes.json()
      ]);
      
      // Сохраняем данные
      setDoctors(doctorsData.map(d => ({
        id: d.Id,
        name: d.Name,
        role: 'doctor',
        avatar: `https://placehold.co/300x400/${Math.floor(Math.random()*16777215).toString(16)}/ffffff?text=${encodeURIComponent(d.Name)}`
      })));
      
      setBranches(branchesData);
      
      // Преобразуем слоты расписания в наш формат
      setSchedule(scheduleData.map(slot => {
        const startDate = new Date(slot.StartDateTime);
        const endDate = new Date(startDate.getTime() + slot.LengthInMinutes * 60000);
        
        return {
          id: `${slot.DoctorId}-${slot.StartDateTime}`,
          doctorId: slot.DoctorId,
          branchId: slot.BranchId,
          date: slot.StartDateTime.split('T')[0],
          startTime: startDate.toTimeString().substring(0, 5),
          endTime: endDate.toTimeString().substring(0, 5),
          status: slot.IsBusy ? 'busy' : 'available',
          confirmed: true, // В IDent все слоты уже подтверждены
          confirmedBy: 'system',
          confirmedAt: slot.StartDateTime
        };
      }));
      
      setLeads(leadsData);
      setCalls(callsData);
      
      // Генерируем уведомления
      generateTomorrowNotifications();
      
      setIsLoading(false);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные из системы IDent. Проверьте подключение.');
      setIsLoading(false);
    }
  };

  // Уведомления
  const generateTomorrowNotifications = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);
    
    const tomorrowSchedule = schedule.filter(item => 
      item.date === tomorrowStr && !item.confirmed
    );
    
    if (tomorrowSchedule.length > 0) {
      const uniqueDoctors = [...new Set(tomorrowSchedule.map(s => s.doctorId))];
      const doctorNames = uniqueDoctors.map(id => {
        const doctor = doctors.find(d => d.id === id);
        return doctor ? doctor.name : '';
      }).filter(name => name);
      
      if (doctorNames.length > 0) {
        const notification = {
          id: Date.now(),
          title: 'Подтверждение расписания',
          message: `Необходимо подтвердить расписание на завтра для: ${doctorNames.join(', ')}`,
          type: 'warning',
          timestamp: new Date().toISOString(),
          read: false,
          action: 'confirm_schedule'
        };
        setNotifications(prev => [notification, ...prev]);
      }
    }
  };

  // Аутентификация
  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (username && password) {
      // Здесь будет запрос к вашему бэкенду для аутентификации
      // Пока используем мок
      const foundUser = users.find(u => u.username === username);
      if (foundUser) {
        setUser({ 
          ...foundUser,
          isAuthenticated: true
        });
        
        // После входа загружаем данные из IDent
        await fetchDataFromIdent();
      } else {
        setError('Неверное имя пользователя или пароль');
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('schedule');
    setIsMobileMenuOpen(false);
    setDoctors([]);
    setSchedule([]);
  };

  // Переключение темы
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Навигация по датам
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction * 7));
    } else if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() + direction);
    }
    setSelectedDate(newDate);
    
    // При смене даты перезагружаем расписание
    if (user) {
      fetchDataFromIdent();
    }
  };

  // Отправка данных в Telegram
  const sendTelegramNotification = async (message, chatId = null) => {
    try {
      // Здесь будет запрос к вашему API для отправки в Telegram
      console.log('Отправка в Telegram:', message, 'Chat ID:', chatId);
      
      // Пример реализации:
      // await fetch('/api/telegram/send', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message, chatId })
      // });
      
      return true;
    } catch (err) {
      console.error('Ошибка отправки в Telegram:', err);
      return false;
    }
  };

  // Запрос подтверждения от врача
  const handleRequestConfirmation = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);
    
    const tomorrowSchedule = schedule.filter(item => 
      item.date === tomorrowStr && !item.confirmed
    );
    
    if (tomorrowSchedule.length > 0) {
      const uniqueDoctors = [...new Set(tomorrowSchedule.map(s => s.doctorId))];
      
      for (const doctorId of uniqueDoctors) {
        const doctor = doctors.find(d => d.id === doctorId);
        if (doctor && doctor.telegram) {
          const chatId = doctor.telegram.replace('@', '');
          await sendTelegramNotification(
            `Добрый день, ${doctor.name}!\n\nПожалуйста, подтвердите ваше расписание на завтра в портале клиники.`,
            chatId
          );
        }
      }
      
      // Добавляем уведомление в интерфейс
      const notification = {
        id: Date.now(),
        title: 'Уведомление отправлено',
        message: `Запрос подтверждения отправлен врачам через Telegram`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => [notification, ...prev]);
    }
    
    setShowAdminSettings(false);
  };

  // Инициализация
  useEffect(() => {
    // Проверяем сохраненную тему
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    // Если пользователь уже авторизован, загружаем данные
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUser(user);
        fetchDataFromIdent();
      } catch (e) {
        console.error('Ошибка восстановления сессии:', e);
      }
    }
  }, []);

  // Следим за изменениями темы
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Следим за изменениями пользователя
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Следим за изменениями даты
  useEffect(() => {
    if (user) {
      fetchDataFromIdent();
    }
  }, [selectedDate]);

  // Компоненты UI

  const LoginScreen = () => (
    <div className={`min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : ''}`}>
      <div className={`bg-white rounded-2xl shadow-xl border border-orange-200 p-8 w-full max-w-md transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Клиника доктора Денисенко</h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Портал сотрудников клиники</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Имя пользователя</label>
            <input
              type="text"
              name="username"
              required
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
              placeholder="Введите имя пользователя"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Пароль</label>
            <input
              type="password"
              name="password"
              required
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
              placeholder="Введите пароль"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Войти
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>Демо-режим: любые учетные данные работают</p>
          <p className="mt-1">Админ: admin / admin</p>
        </div>
      </div>
    </div>
  );

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );

  const ErrorDisplay = ({ message, onRetry }) => (
    <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6 mb-6">
      <div className="text-center py-8">
        <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки данных</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );

  const NotificationModal = () => {
    if (!showNotificationModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`bg-white rounded-xl shadow-xl max-w-md w-full max-h-96 overflow-hidden transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-orange-200'}`}>
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">Уведомления</h3>
            <button
              onClick={() => setShowNotificationModal(false)}
              className={darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className={darkMode ? 'text-gray-400 text-center py-8' : 'text-gray-500 text-center py-8'}>Нет активных уведомлений</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`p-4 rounded-lg border-l-4 ${
                    notification.type === 'warning' ? 'border-orange-500 bg-orange-50' : 
                    notification.type === 'success' ? 'border-green-500 bg-green-50' : 
                    notification.type === 'info' ? 'border-blue-500 bg-blue-50' : 'border-gray-500 bg-gray-50'
                  } ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{notification.title}</h4>
                        <p className={darkMode ? 'text-gray-300 mt-1' : 'text-gray-700 mt-1'}>{notification.message}</p>
                        <p className={darkMode ? 'text-gray-400 mt-2 text-xs' : 'text-gray-500 mt-2 text-xs'}>
                          {formatTimeAgo(notification.timestamp)} • {new Date(notification.timestamp).toLocaleTimeString('ru-RU')}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div>
                      )}
                    </div>
                    {notification.action === 'confirm_request' && notification.doctorId && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => {
                            // Здесь будет отправка подтверждения в IDent
                            handleConfirmSchedule(notification.doctorId);
                            setShowNotificationModal(false);
                          }}
                          className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
                        >
                          Подтвердить
                        </button>
                        <button
                          onClick={() => setShowNotificationModal(false)}
                          className={darkMode ? 'text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors' : 'text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors'}
                        >
                          Отложить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 border-t">
            <button
              onClick={() => setShowNotificationModal(false)}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AddScheduleModal = () => {
    if (!showAddModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`bg-white rounded-xl shadow-xl max-w-md w-full transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-orange-200'}`}>
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Добавить новый слот</h3>
          </div>
          
          <form className="p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Врач/Ассистент</label>
              <select
                value={newSchedule.doctorId}
                onChange={(e) => setNewSchedule({...newSchedule, doctorId: parseInt(e.target.value)})}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
              >
                <option value="">Выберите персонал</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Дата</label>
              <input
                type="date"
                value={newSchedule.date}
                onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Начало</label>
                <input
                  type="time"
                  value={newSchedule.startTime}
                  onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Конец</label>
                <input
                  type="time"
                  value={newSchedule.endTime}
                  onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Статус</label>
              <select
                value={newSchedule.status}
                onChange={(e) => setNewSchedule({...newSchedule, status: e.target.value})}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
              >
                <option value="available">Свободно</option>
                <option value="busy">Занято</option>
              </select>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={`flex-1 px-4 py-3 border rounded-lg font-medium hover:bg-orange-50 transition-colors ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-orange-300 text-gray-700'}`}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  // Здесь будет отправка в IDent
                  console.log('Создание слота:', newSchedule);
                  setShowAddModal(false);
                }}
              >
                Добавить
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const AdminSettingsModal = () => {
    if (!showAdminSettings) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-96 overflow-hidden transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-orange-200'}`}>
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Настройки подтверждения расписания</h3>
          </div>
          
          <div className="p-6 space-y-6 overflow-y-auto">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Выберите врача для запроса подтверждения</label>
              <select
                value={selectedDoctorForConfirmation}
                onChange={(e) => setSelectedDoctorForConfirmation(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
              >
                <option value="">Все врачи</option>
                {doctors.filter(d => d.role === 'doctor').map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-orange-900/30 border-orange-700/50' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-start">
                <svg className={`w-5 h-5 mt-0.5 mr-3 ${darkMode ? 'text-orange-300' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className={`font-medium ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Что произойдет:</h4>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                    Будет отправлен запрос на подтверждение расписания на завтра для выбранных врачей. 
                    Уведомление будет отправлено через Telegram.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t flex space-x-3">
            <button
              onClick={() => setShowAdminSettings(false)}
              className={`flex-1 px-4 py-3 border rounded-lg font-medium hover:bg-orange-50 transition-colors ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-orange-300 text-gray-700'}`}
            >
              Отмена
            </button>
            <button
              onClick={handleRequestConfirmation}
              className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Отправить запрос
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CalendarHeader = () => {
    const formatTitle = () => {
      const date = selectedDate;
      if (viewMode === 'day') {
        return date.toLocaleDateString('ru-RU', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } else if (viewMode === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `Неделя: ${startOfWeek.getDate()} ${startOfWeek.toLocaleDateString('ru-RU', { month: 'short' })} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('ru-RU', { month: 'short' })}`;
      } else {
        return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
      }
    };

    return (
      <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-orange-200'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatTitle()}</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Филиал: {branches.length > 0 ? branches[0].Name : 'Основной'}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNotificationModal(true)}
              className={`relative px-4 py-2 rounded-lg font-medium flex items-center ${darkMode ? 'bg-orange-900/30 text-orange-200 hover:bg-orange-900/50' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2h-4l-4 4z" />
              </svg>
              Уведомления
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            
            {user.role === 'admin' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transform hover:scale-105 transition-all shadow-lg"
              >
                Добавить слот
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mt-4">
          <div className="flex space-x-2">
            {['day', 'week', 'month'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-orange-600 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                {mode === 'day' ? 'День' : mode === 'week' ? 'Неделя' : 'Месяц'}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate(-1)}
              className={`p-2 rounded-lg hover:bg-orange-100 transition-colors ${darkMode ? 'bg-gray-700 text-white' : 'bg-orange-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-4 py-2 rounded-lg font-medium hover:bg-orange-200 transition-colors ${darkMode ? 'bg-gray-700 text-white' : 'bg-orange-100'}`}
            >
              Сегодня
            </button>
            <button
              onClick={() => navigateDate(1)}
              className={`p-2 rounded-lg hover:bg-orange-100 transition-colors ${darkMode ? 'bg-gray-700 text-white' : 'bg-orange-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DayView = () => {
    const dailySchedule = schedule.filter(item => item.date === formatDate(selectedDate));
    
    return (
      <div className="space-y-6">
        {doctors.map((doctor) => {
          const doctorSchedule = dailySchedule.filter(item => item.doctorId === doctor.id);
          if (doctorSchedule.length === 0) return null;

          return (
            <div key={doctor.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-orange-200'}`}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-orange-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img src={doctor.avatar} alt={doctor.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{doctor.name}</h3>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Врач</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                    doctor.role === 'doctor' ? (darkMode ? 'bg-orange-900/30 text-orange-200' : 'bg-orange-100 text-orange-800') : (darkMode ? 'bg-green-900/30 text-green-200' : 'bg-green-100 text-green-800')
                  }`}>
                    {doctor.role === 'doctor' ? 'Врач' : 'Ассистент'}
                  </span>
                </div>
              </div>
              
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-orange-200'}`}>
                {doctorSchedule.map((slot) => (
                  <div key={slot.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        slot.status === 'available' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{slot.startTime} - {slot.endTime}</p>
                        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {slot.status === 'available' ? 'Свободно' : `Занято`}
                        </p>
                        {!slot.confirmed && (
                          <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                            darkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            Не подтверждено
                          </span>
                        )}
                        {slot.confirmedBy && (
                          <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                            darkMode ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-100 text-blue-800'
                          }`}>
                            Подтверждено {slot.confirmedBy} {formatTimeAgo(slot.confirmedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {!slot.confirmed && (
                        <button
                          onClick={() => {
                            // Здесь будет отправка подтверждения в IDent
                            console.log('Подтверждение слота:', slot.id);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            user.role === 'admin' ? 'bg-orange-600 text-white hover:bg-orange-700' : 
                            'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {user.role === 'admin' ? 'Подтвердить' : 'Подтвердить себя'}
                        </button>
                      )}
                      {user.role === 'admin' && (
                        <button
                          onClick={() => {
                            // Здесь будет удаление слота в IDent
                            console.log('Удаление слота:', slot.id);
                          }}
                          className={darkMode ? 'text-red-400 hover:text-red-300 font-medium text-sm transition-colors' : 'text-red-600 hover:text-red-800 font-medium text-sm transition-colors'}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const WeekView = () => {
    const weekData = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekData.push({
        date: day,
        schedule: schedule.filter(s => s.date === formatDate(day))
      });
    }
    
    return (
      <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-orange-200'}`}>
        <div className="grid grid-cols-8 border-b">
          <div className={`p-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Время</div>
          {weekData.map(({date}) => (
            <div key={date.toISOString()} className={`p-4 text-center border-l ${darkMode ? 'border-gray-700' : 'border-orange-200'}`}>
              <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
              </div>
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {Array.from({ length: 16 }, (_, i) => {
            const hour = 8 + i;
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
            
            return (
              <div key={timeLabel} className={`grid grid-cols-8 border-b ${darkMode ? 'border-gray-700' : 'border-orange-100'}`}>
                <div className={`p-3 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} border-r ${darkMode ? 'border-gray-700' : 'border-orange-200'}`}>
                  {timeLabel}
                </div>
                {weekData.map(({date, schedule: daySchedule}) => {
                  const dateStr = formatDate(date);
                  const slots = daySchedule.filter(slot => 
                    slot.date === dateStr && 
                    parseInt(slot.startTime.split(':')[0]) === hour
                  );
                  
                  return (
                    <div key={dateStr} className={`p-2 border-l ${darkMode ? 'border-gray-700' : 'border-orange-200'} min-h-12`}>
                      {slots.map(slot => {
                        const doctor = doctors.find(d => d.id === slot.doctorId);
                        return (
                          <div
                            key={slot.id}
                            className={`p-2 rounded text-xs text-white mb-1 cursor-pointer transition-transform hover:scale-105 ${
                              slot.status === 'available' ? 'bg-green-500' : 'bg-red-500'
                            } ${!slot.confirmed ? 'opacity-75' : ''}`}
                            title={`${doctor?.name} - ${slot.status === 'available' ? 'Свободно' : 'Занято'}${!slot.confirmed ? ' (Не подтверждено)' : ''}`}
                          >
                            <div className="font-medium">{doctor?.name.split(' ')[1]}</div>
                            <div>{slot.startTime} - {slot.endTime}</div>
                            {!slot.confirmed && (
                              <div className="text-xs mt-1">⚠️</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const MonthView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthData = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month, i);
      monthData.push({
        date: day,
        schedule: schedule.filter(s => s.date === formatDate(day))
      });
    }
    
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    days.push(...monthData.map(item => item.date));
    
    return (
      <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-orange-200'}`}>
        <div className="grid grid-cols-7 border-b">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
            <div key={day} className={`p-4 text-center font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 divide-x divide-y">
          {Array.from({ length: Math.ceil(days.length / 7) * 7 }).map((_, index) => {
            const day = days[index];
            const daySchedule = day ? schedule.filter(s => s.date === formatDate(day)) : null;
            const hasAppointments = daySchedule ? daySchedule.length > 0 : false;
            const hasUnconfirmed = daySchedule ? daySchedule.some(s => !s.confirmed) : false;
            
            return (
              <div
                key={index}
                className={`min-h-32 p-2 ${
                  day ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-900' : 'bg-orange-50')
                } ${hasUnconfirmed ? 'border-l-4 border-yellow-500' : ''}`}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-medium ${
                        day.getDay() === 0 ? 'text-red-600' : day.getDay() === 6 ? 'text-blue-600' : (darkMode ? 'text-gray-300' : 'text-gray-900')
                      }`}>
                        {day.getDate()}
                      </span>
                      {hasAppointments && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {daySchedule?.slice(0, 3).map(slot => {
                        const doctor = doctors.find(d => d.id === slot.doctorId);
                        return (
                          <div
                            key={slot.id}
                            className={`text-xs p-1 rounded truncate ${
                              slot.status === 'available' 
                                ? darkMode ? 'bg-green-900/30 text-green-200' : 'bg-green-100 text-green-800' 
                                : darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-800'
                            } ${!slot.confirmed ? 'opacity-75' : ''}`}
                            title={`${doctor?.name} - ${slot.startTime}`}
                          >
                            {doctor?.name.split(' ')[1]} {slot.startTime}
                          </div>
                        );
                      })}
                      {daySchedule && daySchedule.length > 3 && (
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>+{daySchedule.length - 3} еще</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const MainInterface = () => (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900 text-white' : 'bg-orange-50'}`}>
      {/* Шапка */}
      <header className={`bg-white shadow-sm border-b transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-orange-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Клиника доктора Денисенко</h1>
                <p className="text-sm text-gray-500">Портал сотрудников клиники</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {darkMode ? (
                  <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707-.707a1 1 0 011.414 0zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              <div className="text-right">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Навигация */}
      <nav className={`bg-white border-b transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-orange-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'schedule', label: 'Расписание', icon: 'Calendar' },
              { id: 'doctors', label: 'Персонал', icon: 'Users' },
              { id: 'analytics', label: 'Аналитика', icon: 'BarChart2' },
              { id: 'admin', label: 'Админка', icon: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-600 text-orange-600'
                    : darkMode
                      ? 'border-transparent text-gray-300 hover:text-white hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-orange-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Основное содержимое */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorDisplay message={error} onRetry={fetchDataFromIdent} />
        ) : activeTab === 'schedule' && (
          <div className="space-y-6">
            <CalendarHeader />
            
            {viewMode === 'day' && <DayView />}
            {viewMode === 'week' && <WeekView />}
            {viewMode === 'month' && <MonthView />}
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Персонал клиники</h2>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Управление врачами и ассистентами</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doctor) => (
                <div key={doctor.id} className={`bg-white rounded-xl shadow-sm border p-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-orange-200'}`}>
                  <div className="flex items-center space-x-4 mb-4">
                    <img src={doctor.avatar} alt={doctor.name} className="w-16 h-16 rounded-full" />
                    <div>
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{doctor.name}</h3>
                      <p className={`text-sm font-medium px-3 py-1 rounded-full mt-1 ${
                        doctor.role === 'doctor' 
                          ? darkMode ? 'bg-orange-900/30 text-orange-200' : 'bg-orange-100 text-orange-800' 
                          : darkMode ? 'bg-green-900/30 text-green-200' : 'bg-green-100 text-green-800'
                      }`}>
                        {doctor.role === 'doctor' ? 'Врач' : 'Ассистент'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium">Специальность:</span> {doctor.specialty || 'Не указана'}</p>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium">Телефон:</span> {doctor.phone || 'Не указан'}</p>
                    {doctor.telegram && (
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium">Telegram:</span> {doctor.telegram}</p>
                    )}
                  </div>
                  
                  {user.role === 'admin' && (
                    <button className={`mt-4 w-full py-2 rounded-lg font-medium transition-colors ${
                      darkMode ? 'bg-orange-900/30 text-orange-200 hover:bg-orange-900/50' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}>
                      Редактировать
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Аналитика и отчеты</h2>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Статистика загруженности персонала</p>
              </div>
              
              <select
                value={formatDate(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
              >
                <option value="2024-01-15">15 января 2024</option>
                <option value="2024-01-16">16 января 2024</option>
                <option value="2024-01-17">17 января 2024</option>
              </select>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className={`rounded-xl shadow-sm border p-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Всего врачей</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{doctors.length}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    darkMode ? 'bg-orange-900/30 text-orange-200' : 'bg-orange-100 text-orange-600'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl shadow-sm border p-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Свободных слотов</p>
                    <p className="text-3xl font-bold text-green-600">{schedule.filter(s => s.status === 'available').length}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    darkMode ? 'bg-green-900/30 text-green-200' : 'bg-green-100 text-green-600'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl shadow-sm border p-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Заявок за неделю</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{leads.length}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    darkMode ? 'bg-purple-900/30 text-purple-200' : 'bg-purple-100 text-purple-600'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-xl shadow-sm border p-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Загруженность персонала</h3>
              <div className="space-y-4">
                {doctors.map((doctor) => {
                  const doctorSlots = schedule.filter(s => s.doctorId === doctor.id);
                  const busySlots = doctorSlots.filter(s => s.status === 'busy').length;
                  const totalSlots = doctorSlots.length;
                  const occupancy = totalSlots > 0 ? Math.round((busySlots / totalSlots) * 100) : 0;
                  
                  return (
                    <div key={doctor.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img src={doctor.avatar} alt={doctor.name} className="w-8 h-8 rounded-full" />
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{doctor.name}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-32 rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-orange-200'}`}>
                          <div 
                            className={`h-2 rounded-full ${
                              occupancy > 70 ? 'bg-red-500' : occupancy > 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${occupancy}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium w-12 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{occupancy}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Административная панель</h2>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Управление системой и настройки</p>
            </div>

            <div className="grid gap-6">
              <div className={`rounded-xl shadow-sm border p-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Управление пользователями</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-orange-200'}`}>
                        <th className={`text-left py-3 px-4 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Имя</th>
                        <th className={`text-left py-3 px-4 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Роль</th>
                        <th className={`text-left py-3 px-4 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Email</th>
                        <th className={`text-left py-3 px-4 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Телефон</th>
                        <th className={`text-left py-3 px-4 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userItem) => (
                        <tr key={userItem.id} className={`border-b ${darkMode ? 'border-gray-700' : 'border-orange-100'}`}>
                          <td className={`py-3 px-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{userItem.name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              userItem.role === 'admin' 
                                ? darkMode ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-800' 
                                : userItem.role === 'reception' 
                                  ? darkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-100 text-yellow-800' 
                                  : darkMode ? 'bg-blue-900/30 text-blue-200' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {userItem.role === 'admin' ? 'Админ' :
                               userItem.role === 'reception' ? 'Регистратура' : 'Врач'}
                            </span>
                          </td>
                          <td className={`py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{userItem.email}</td>
                          <td className={`py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{userItem.phone}</td>
                          <td className="py-3 px-4">
                            <button className={`text-orange-600 hover:text-orange-800 text-sm font-medium ${darkMode ? 'text-orange-400 hover:text-orange-300' : ''}`}>
                              Редактировать
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`rounded-xl shadow-sm border p-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-200'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Рабочие часы клиники</h3>
                  <button className="text-sm bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">
                    Сохранить изменения
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'].map((day, index) => (
                    <div key={day} className={`p-4 border rounded-lg transition-colors ${darkMode ? 'border-gray-700' : 'border-orange-200'}`}>
                      <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {day}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Открытие</label>
                          <input
                            type="time"
                            defaultValue="08:00"
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Закрытие</label>
                          <input
                            type="time"
                            defaultValue="20:00"
                            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl shadow-sm border p-6 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-orange-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Подтверждение расписания</h3>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-orange-900/30 border-orange-700/50' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex items-start">
                      <svg className={`w-5 h-5 mt-0.5 mr-3 ${darkMode ? 'text-orange-300' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className={`font-medium ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Запрос подтверждения</h4>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                          Отправляйте запросы врачам для подтверждения их расписания на следующий день. 
                          Уведомления будут отправлены через Telegram.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowAdminSettings(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transform hover:scale-105 transition-all shadow-lg"
                  >
                    Запросить подтверждение на завтра
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  return user ? (
    <>
      <MainInterface />
      <NotificationModal />
      <AddScheduleModal />
      <AdminSettingsModal />
    </>
  ) : (
    <LoginScreen />
  );
};

export default App;