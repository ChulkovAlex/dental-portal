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
      <div className={`max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-48 h-48 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
            </svg>
          </div>
          <h1 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Клиника доктора Денисенко</h1>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Портал сотрудников клиники</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Имя пользователя</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 transition-all ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-orange-300'}`}
              placeholder="Введите имя пользователя"
            />
          </div>
          <div>
            <label htmlFor="password" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Пароль</label>
            <input
              type="password"
              id="password"
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
                    <path d="M17.293 13.293A8 8 0 