import { useState, useEffect } from 'react';
import { Dashboard } from '../pages/Dashboard';
import { Streams } from '../pages/Streams';
import { Logs } from '../pages/Logs';
import { Metrics } from '../pages/Metrics';
import { Config } from '../pages/Config';
import { Diagnostics } from '../pages/Diagnostics';
import { Settings } from '../pages/Settings';
import { usePermissions } from '../api/ApiContext';
import { ADMIN_ITEMS } from '../config/permissions';

type Route = 'dashboard' | 'streams' | 'logs' | 'metrics' | 'config' | 'diagnostics' | 'settings';

const NAV_ITEMS: { route: Route; label: string }[] = [
  { route: 'dashboard', label: 'Dashboard' },
  { route: 'streams', label: 'Streams' },
  { route: 'logs', label: 'Logs' },
  { route: 'metrics', label: 'Metrics' },
  { route: 'config', label: 'Config' },
  { route: 'diagnostics', label: 'Diagnostics' },
  { route: 'settings', label: 'Settings' },
];

const PAGE_MAP: Record<string, React.FC> = {
  dashboard: Dashboard,
  streams: Streams,
  logs: Logs,
  metrics: Metrics,
  config: Config,
  diagnostics: Diagnostics,
  settings: Settings,
};

function resolveRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '') || 'dashboard';
  return NAV_ITEMS.some((n) => n.route === raw) ? (raw as Route) : 'dashboard';
}

/* ---- inline styles ---- */

const SIDEBAR_W = 220;

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: SIDEBAR_W,
    minWidth: SIDEBAR_W,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem 0',
  },
  sidebarBrand: {
    padding: '0 1.25rem 1rem',
    borderBottom: '1px solid var(--border)',
    marginBottom: '0.75rem',
  },
  sidebarTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  sidebarSubtitle: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
  },
  navList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  navItem: {
    display: 'block',
  },
  navLink: {
    display: 'block',
    padding: '0.6rem 1.25rem',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    transition: 'color 0.15s, background 0.15s, border-color 0.15s',
  },
  navLinkActive: {
    color: 'var(--text)',
    background: 'rgba(79, 140, 255, 0.08)',
    borderLeftColor: 'var(--accent)',
    fontWeight: 500,
  },
  adminSectionHeader: {
    padding: '0.75rem 1.25rem 0.4rem',
    marginTop: '0.75rem',
    borderTop: '1px solid var(--border)',
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  content: {
    flex: 1,
    padding: '1.5rem 2rem',
    overflowY: 'auto',
    maxWidth: 'calc(100vw - 220px)',
  },
};

export function SidebarLayout() {
  const permissions = usePermissions();
  const [route, setRoute] = useState<Route>(() => resolveRoute(window.location.hash));

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace(/^#/, '');

      // Route guard: if hash targets an admin action, check the corresponding permission flag.
      // If the flag is false, silently redirect to dashboard.
      const adminMatch = ADMIN_ITEMS.find((item) => item.route === hash);
      if (adminMatch && !permissions[adminMatch.permission]) {
        window.location.hash = 'dashboard';
        return;
      }

      setRoute(resolveRoute(window.location.hash));
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, [permissions]);

  const Page = PAGE_MAP[route];

  const visibleAdminItems = ADMIN_ITEMS.filter((item) => permissions[item.permission]);

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <div style={styles.sidebarTitle}>MediaMTX Admin</div>
          <div style={styles.sidebarSubtitle}>Read-only operations</div>
        </div>
        <nav>
          <ul style={styles.navList}>
            {NAV_ITEMS.map((item) => {
              const isActive = route === item.route;
              const linkStyle: React.CSSProperties = {
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              };
              return (
                <li key={item.route} style={styles.navItem}>
                  <a
                    style={linkStyle}
                    href={`#${item.route}`}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.hash = item.route;
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* ---- Admin section (mutation gate) ----
               Only rendered when at least one admin flag is `true`.
               In the MVP, ALL flags are `false` → this section is hidden.
               Future: set a flag to `true` in src/config/permissions.ts
               and the corresponding nav item will appear here automatically. */}
          {visibleAdminItems.length > 0 && (
            <>
              <div style={styles.adminSectionHeader}>Admin</div>
              <ul style={styles.navList}>
                {visibleAdminItems.map((item) => {
                  const isActive = `#${item.route}` === window.location.hash;
                  const linkStyle: React.CSSProperties = {
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : {}),
                  };
                  return (
                    <li key={item.route} style={styles.navItem}>
                      <a
                        style={linkStyle}
                        href={`#${item.route}`}
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.hash = item.route;
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>
      </aside>
      <main style={styles.content}>
        <Page />
      </main>
    </div>
  );
}
