import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const nav = useNavigate();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    // demo: always log in
    localStorage.setItem('user', JSON.stringify({ name: 'Админ', role: 'admin' }));
    nav('/dashboard');
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="card w-full max-w-sm space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Клиника доктора Денисенко
        </h1>
        <input className="input-field" placeholder="Имя пользователя" required />
        <input className="input-field" type="password" placeholder="Пароль" required />
        <button type="submit" className="btn-primary w-full">Войти</button>
        <p className="text-xs text-center text-gray-500">
          Демо: любые данные работают
        </p>
      </form>
    </div>
  );
}