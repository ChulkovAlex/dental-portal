import React from 'react';
import { LogOut, Moon, Sun, UsersRound, ClipboardCheck, Ban } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useDark } from '../hooks/useDark';
import { useAuth } from '../context/AuthContext';

interface PortalHeaderProps {
  title: string;
  subtitle?: string;
}

const navItems = [
  { to: '/dashboard', label: 'Дашборд', icon: UsersRound },
  { to: '/approve', label: 'Заявки', icon: ClipboardCheck },
  { to: '/reject', label: 'Отказы', icon: Ban },
];

const linkBaseClasses =
  'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors';

export default function PortalHeader({ title, subtitle }: PortalHeaderProps) {
  const [dark, toggleDark] = useDark();
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-page bg-card/80 backdrop-blur-lg shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-semibold text-page sm:text-xl">{title}</h1>
          {subtitle ? (
            <p className="hidden text-xs text-page/60 sm:block">{subtitle}</p>
          ) : null}
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${linkBaseClasses} ${
                    isActive
                      ? 'bg-page/20 text-page'
                      : 'text-page/70 hover:bg-page/20 hover:text-page'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <span className="hidden text-xs text-page/60 sm:block">
              {currentUser.name ?? currentUser.email}
            </span>
          ) : null}
          <button
            onClick={toggleDark}
            className="rounded-full border border-page bg-card p-2"
            title="Переключить тему"
            type="button"
          >
            {dark ? <Moon className="h-4 w-4 text-page" /> : <Sun className="h-4 w-4 text-page" />}
          </button>
          <button
            onClick={handleLogout}
            className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-orange-600 hover:to-yellow-600 sm:flex"
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-page/60 px-4 py-2 md:hidden">
        <div className="text-xs text-page/70">{currentUser?.name ?? currentUser?.email}</div>
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
                    : 'border border-page text-page'
                } flex items-center gap-1 rounded-full px-3 py-1 text-xs`}
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </NavLink>
            );
          })}
          <button
            onClick={handleLogout}
            className="rounded-full border border-page px-3 py-1 text-xs text-page"
            type="button"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
