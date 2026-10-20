import { LogOut, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Button } from '@/components/ui/Button';
import { signOutCurrentUser } from '@/features/auth/api';
import { cn } from '@/lib/cn';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { NAV_ITEMS } from './navigation';

export function AppShell() {
  const online = useOnlineStatus();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutCurrentUser();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop / tablet: компактный sidebar */}
      <aside className="border-line bg-surface sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r px-3 py-5 md:flex">
        <p className="px-3 text-lg font-semibold tracking-tight">Вместе</p>
        <nav aria-label="Разделы" className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-control flex min-h-10 items-center gap-3 px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-soft text-accent-strong'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                )
              }
            >
              <Icon aria-hidden className="size-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Button
          variant="ghost"
          size="sm"
          pending={signingOut}
          onClick={onSignOut}
          className="mt-auto justify-start"
        >
          <LogOut aria-hidden className="size-4" />
          Выйти
        </Button>
      </aside>

      {/* Mobile: верхняя панель */}
      <header className="border-line bg-canvas/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur-sm md:hidden">
        <p className="text-lg font-semibold tracking-tight">Вместе</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Выйти"
          pending={signingOut}
          onClick={onSignOut}
          className="-mr-2"
        >
          {!signingOut && <LogOut aria-hidden className="size-5" />}
        </Button>
      </header>

      <div className="min-w-0 flex-1">
        {!online && (
          <div
            role="status"
            className="bg-warn-soft text-warn flex items-center gap-2 px-4 py-2 text-sm md:px-8"
          >
            <WifiOff aria-hidden className="size-4 shrink-0" />
            Нет соединения. Изменения не будут сохранены, пока сеть не вернётся.
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile: нижняя навигация */}
      <nav
        aria-label="Разделы"
        className="border-line bg-surface fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                isActive ? 'text-accent-strong' : 'text-ink-muted',
              )
            }
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
