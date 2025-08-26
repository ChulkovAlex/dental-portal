import React, { useState, FormEvent } from 'react';
import { LogIn, User, Lock, Sun, Moon } from 'lucide-react';
import { useDark } from '../hooks/useDark';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [dark, toggleDark] = useDark();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('user', JSON.stringify({ name: 'Админ', role: 'admin' }));
      window.location.href = '/dashboard';
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-page text-page transition-colors">
      {/* Переключатель темы */}
      <button
        onClick={toggleDark}
        className="absolute top-4 right-4 p-2 rounded-full bg-card border border-page"
      >
        {dark ? <Sun className="accent" /> : <Moon className="accent" />}
      </button>

      {/* Логотип */}
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
            <LogIn className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center text-page">
          Клиника доктора Денисенко
        </h1>
        <p className="text-center text-page/70">
          Портал сотрудников клиники
        </p>

        <form
          onSubmit={handleLogin}
          className="bg-card border border-page rounded-2xl shadow-xl p-8 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium mb-1 text-page">
              Имя пользователя
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 accent" />
              <input
                required
                className="w-full bg-card border border-page rounded-lg px-4 py-3 pl-10 text-page focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="Введите имя пользователя"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-page">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 accent" />
              <input
                required
                type="password"
                className="w-full bg-card border border-page rounded-lg px-4 py-3 pl-10 text-page focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="Введите пароль"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg shadow-md hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : 'Войти'}
          </button>

          <p className="text-xs text-center text-page/60">
            Демо-режим: любые учетные данные работают<br />
            <span className="font-semibold">Админ: admin / admin</span>
          </p>
        </form>
      </div>
    </div>
  );
}