import React, { useState, FormEvent } from 'react';
import { LogIn, User, Lock, Sun, Moon } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('user', JSON.stringify({ name: 'Админ' }));
      window.location.href = '/dashboard';
    }, 800);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        dark ? 'bg-gray-900' : 'bg-gradient-to-br from-orange-50 via-white to-yellow-50'
      }`}
    >
      <div className="w-full max-w-md">
        {/* Логотип */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
            <LogIn className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Заголовок */}
        <h1 className={`text-4xl font-bold text-center mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
          Клиника доктора Денисенко
        </h1>
        <p className={`text-center mb-8 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
          Портал сотрудников клиники
        </p>

        {/* Форма */}
        <form
          onSubmit={handleLogin}
          className={`bg-white rounded-2xl shadow-xl border border-orange-100 p-8 space-y-6 ${
            dark ? 'bg-gray-800 border-gray-700' : ''
          }`}
        >
          {/* Поле логин */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
              Имя пользователя
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                className={`input-field pl-10 ${dark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                placeholder="Введите имя пользователя"
              />
            </div>
          </div>

          {/* Поле пароль */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                type="password"
                className={`input-field pl-10 ${dark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                placeholder="Введите пароль"
              />
            </div>
          </div>

          {/* Кнопка входа */}
          <button
            type="submit"
            disabled={loading}
            className={`btn-primary w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Загрузка...' : 'Войти'}
          </button>

          {/* Подсказка */}
          <p className={`text-xs text-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            Демо-режим: любые учетные данные работают
            <br />
            <span className="font-semibold">Админ: admin / admin</span>
          </p>
        </form>

        {/* Переключатель темы */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setDark(!dark)}
            className={`p-2 rounded-full transition-colors ${
              dark ? 'bg-gray-700 text-yellow-400' : 'bg-orange-100 text-orange-600'
            }`}
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}