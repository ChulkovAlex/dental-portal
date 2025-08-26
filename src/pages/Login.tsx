import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDark } from '../hooks/useDark';

export default function Login() {
  const [dark, toggleDark] = useDark();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  // запускаем анимацию после монтирования
  useEffect(() => {
    setVisible(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user', JSON.stringify({ email }));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-page text-page">
      {/* кнопка темы */}
      <button
        onClick={toggleDark}
        className="absolute top-4 right-4 p-2 rounded-full bg-card border border-page"
      >
        <span className="text-xl">{dark ? '🌙' : '☀️'}</span>
      </button>

      {/* карточка с анимацией */}
      <form
        onSubmit={handleLogin}
        className={`bg-card border border-page rounded-2xl shadow-xl w-full max-w-sm p-8 space-y-6 transition-all duration-700 transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="flex justify-center mb-4">
         <img src="/logo.png"  alt="Doc Denisenko" className="h-20 w-auto rounded-2xl shadow-lg"/>
        </div>

        <h1 className="text-2xl font-bold text-center">Клиника доктора Денисенко</h1>

        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-card border border-page rounded-lg px-4 py-3 text-page focus:ring-2 focus:ring-orange-500"
        />

        <input
          type="password"
          required
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-card border border-page rounded-lg px-4 py-3 text-page focus:ring-2 focus:ring-orange-500"
        />

<button
  type="submit"
  className="
    w-full
    bg-gradient-to-r
    from-orange-500
    to-yellow-500
    text-white
    font-semibold
    rounded-lg
    shadow-md
    hover:from-orange-600
    hover:to-yellow-600
    transition-all
    duration-300
    focus:outline-none
    focus:ring-4
    focus:ring-orange-300
    active:scale-95
    animate-pulse
  "
>
  Войти
</button>

        <p className="text-xs text-center text-page/60">Демо-режим: любые данные работают</p>
      </form>
    </div>
  );
}