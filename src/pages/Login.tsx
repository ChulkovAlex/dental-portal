import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth, AuthError } from '../context/AuthContext';
import { AuthUser } from '../services/authDb';
import { useDark } from '../hooks/useDark';

export default function Login() {
  const [dark, toggleDark] = useDark();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [setupUser, setSetupUser] = useState<AuthUser | null>(null);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  const navigate = useNavigate();
  const { login, completeAdminSetup } = useAuth();

  React.useEffect(() => setVisible(true), []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof AuthError && err.code === 'needs-password-setup' && err.user) {
        setSetupUser(err.user);
        setSetupPassword('');
        setSetupPasswordConfirm('');
        setSetupError(null);
      } else if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError('Не удалось выполнить вход. Попробуйте ещё раз.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!setupUser?.id) {
      setSetupError('Не удалось определить пользователя для настройки.');
      return;
    }

    if (setupPassword.length < 6) {
      setSetupError('Пароль должен содержать не менее 6 символов.');
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      setSetupError('Пароли не совпадают.');
      return;
    }

    setSetupError(null);
    setIsSavingSetup(true);

    try {
      await completeAdminSetup(setupUser.id, setupPassword);
      setSetupUser(null);
      setSetupPassword('');
      setSetupPasswordConfirm('');
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof AuthError) {
        setSetupError(err.message);
      } else {
        setSetupError('Не удалось сохранить пароль. Попробуйте позже.');
      }
    } finally {
      setIsSavingSetup(false);
    }
  };

  const closeSetupDialog = () => {
    setSetupUser(null);
    setSetupPassword('');
    setSetupPasswordConfirm('');
    setSetupError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-page text-page relative">
      <button
        onClick={toggleDark}
        className="absolute top-4 right-4 p-2 rounded-full bg-card border border-page"
      >
        <span className="text-xl">{dark ? '🌙' : '☀️'}</span>
      </button>

      <form
        onSubmit={handleLogin}
        className={`bg-card border border-page rounded-2xl shadow-xl w-full max-w-sm p-8 space-y-6 transition-all duration-700 transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="Doc Denisenko" className="h-20 w-auto rounded-2xl shadow-lg" />
        </div>

        <h1 className="text-2xl font-bold text-center">Клиника доктора Денисенко</h1>

        {error ? <p className="text-sm text-red-500 text-center">{error}</p> : null}

        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full bg-card border border-page rounded-lg px-4 py-3 text-page focus:ring-2 focus:ring-orange-500"
        />

        <input
          type="password"
          required
          placeholder="Пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full bg-card border border-page rounded-lg px-4 py-3 text-page focus:ring-2 focus:ring-orange-500"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg shadow-md hover:from-orange-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Входим...' : 'Войти'}
        </button>

        <p className="text-xs text-center text-page/60">
          Для входа используйте e-mail администратора клиники.
        </p>
      </form>

      {setupUser ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
          <form
            onSubmit={handleCompleteSetup}
            className="w-full max-w-md space-y-4 rounded-2xl border border-page bg-card p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold text-page text-center">Установка пароля администратора</h2>
            <p className="text-sm text-page/70 text-center">
              Завершите настройку аккаунта {setupUser.email}, придумайте надёжный пароль и сохраните его.
            </p>

            {setupError ? <p className="text-sm text-red-500 text-center">{setupError}</p> : null}

            <input
              type="password"
              required
              placeholder="Новый пароль"
              value={setupPassword}
              onChange={(event) => setSetupPassword(event.target.value)}
              className="w-full bg-card border border-page rounded-lg px-4 py-3 text-page focus:ring-2 focus:ring-orange-500"
            />

            <input
              type="password"
              required
              placeholder="Повторите пароль"
              value={setupPasswordConfirm}
              onChange={(event) => setSetupPasswordConfirm(event.target.value)}
              className="w-full bg-card border border-page rounded-lg px-4 py-3 text-page focus:ring-2 focus:ring-orange-500"
            />

            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={closeSetupDialog}
                className="flex-1 rounded-lg border border-page px-4 py-2 text-sm font-medium text-page hover:bg-page/10"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSavingSetup}
                className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-orange-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSetup ? 'Сохраняем...' : 'Сохранить пароль'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
