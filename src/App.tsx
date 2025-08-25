import React, { useState, FormEvent } from 'react';

const App = () => {
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // тут будет реальный логин
      window.location.reload(); // заглушка
    }, 1000);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-28 h-28 rounded-full bg-[#FF6B00] flex items-center justify-center">
            <svg
              className="w-14 h-14 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Клиника доктора Денисенко
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Портал сотрудников клиники
        </p>

        {/* Login Card */}
        <form onSubmit={handleLogin} className="card space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Имя пользователя
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="input-field"
              placeholder="Введите имя пользователя"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input-field"
              placeholder="Введите пароль"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Загрузка...' : 'Войти'}
          </button>

          {loginError && (
            <p className="text-sm text-red-600 text-center">{loginError}</p>
          )}
        </form>

        {/* Demo hint */}
        <p className="text-xs text-center text-gray-500 mt-6">
          Демо-режим: любые учетные данные работают <br />
          Админ: admin / admin
        </p>
      </div>
    </div>
  );
};

export default App;