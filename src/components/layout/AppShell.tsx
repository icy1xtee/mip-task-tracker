import { DropdownMenu } from 'radix-ui';
import { useMemo, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { IconButton } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/ui/Icon';
import { PortalContainerContext } from '@/components/ui/portal';
import { ToastProvider } from '@/components/ui/toast';
import { signOutCurrentUser } from '@/features/auth/api';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { ChromeContext, type PageChrome } from './chrome';
import { NAV_ITEMS } from './navigation';

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        ⊹ ࣪
      </span>
      <span className="brand-text">
        <span className="brand-name">mip</span>
        <br />
        <span className="brand-sub">task tracker</span>
      </span>
    </div>
  );
}

export function AppShell() {
  const online = useOnlineStatus();
  const [shell, setShell] = useState<HTMLDivElement | null>(null);
  const [chrome, setChrome] = useState<PageChrome>({ title: 'mip', sub: '', addLabel: null });
  const addRef = useRef<(() => void) | null>(null);
  const chromeCtx = useMemo(() => ({ setChrome, addRef }), []);

  return (
    <div className="mip">
      <div className="shell" ref={setShell}>
        <PortalContainerContext value={shell}>
          <ChromeContext value={chromeCtx}>
            <ToastProvider>
              <aside className="side" aria-label="Навигация">
                <Brand />
                <nav aria-label="Разделы" style={{ display: 'contents' }}>
                  {NAV_ITEMS.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      title={n.label}
                      className={({ isActive }) => cx('nav-item', isActive && 'is-active')}
                    >
                      <Icon name={n.icon} />
                      <span className="nav-label">{n.label}</span>
                    </NavLink>
                  ))}
                </nav>
                <div className="side-foot">
                  <button
                    type="button"
                    className="nav-item"
                    title="Выйти"
                    onClick={() => void signOutCurrentUser()}
                  >
                    <Icon name="logout" />
                    <span className="nav-label">Выйти</span>
                  </button>
                </div>
              </aside>

              <div className="content">
                <header className="topbar">
                  <div className="tb-titles">
                    <div className="tb-title">{chrome.title}</div>
                    {chrome.sub && <div className="tb-sub">{chrome.sub}</div>}
                  </div>
                  {chrome.addLabel && (
                    <IconButton
                      icon="plus"
                      primary
                      label={chrome.addLabel}
                      onClick={() => addRef.current?.()}
                    />
                  )}
                  <DropdownMenu.Root modal={false}>
                    <DropdownMenu.Trigger asChild>
                      <IconButton icon="more" label="Ещё" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal container={shell ?? undefined}>
                      <DropdownMenu.Content className="menu" align="end" sideOffset={4}>
                        <DropdownMenu.Item
                          className="menu-item"
                          onSelect={() => void signOutCurrentUser()}
                        >
                          <Icon name="logout" />
                          Выйти
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </header>

                {!online && (
                  <div className="offline" role="status">
                    <Icon name="wifiOff" />
                    Нет соединения. Данные могут быть неактуальны, изменения сейчас не сохранятся.
                  </div>
                )}

                <main className="main">
                  <Outlet />
                </main>

                <nav className="tabbar" aria-label="Разделы">
                  {NAV_ITEMS.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      className={({ isActive }) => cx('tab', isActive && 'is-active')}
                    >
                      <span className="tab-ic">
                        <Icon name={n.icon} />
                      </span>
                      {n.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            </ToastProvider>
          </ChromeContext>
        </PortalContainerContext>
      </div>
    </div>
  );
}
