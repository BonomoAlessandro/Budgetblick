import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
}

const LEFT_TABS: Tab[] = [
  { to: '/', label: 'Übersicht', icon: 'home' },
  { to: '/fixkosten', label: 'Fixkosten', icon: 'repeat' },
];

const RIGHT_TABS: Tab[] = [
  { to: '/vertraege', label: 'Verträge', icon: 'contract' },
  { to: '/ausgaben', label: 'Ausgaben', icon: 'list' },
];

function TabLink({ tab }: { tab: Tab }) {
  return (
    <NavLink
      to={tab.to}
      end={tab.to === '/'}
      className={({ isActive }) =>
        `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
          isActive
            ? 'text-brand-700 dark:text-brand-500'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`
      }
    >
      <Icon name={tab.icon} />
      <span>{tab.label}</span>
    </NavLink>
  );
}

interface TabBarProps {
  onQuickAdd: () => void;
}

export function TabBar({ onQuickAdd }: TabBarProps) {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="mx-auto flex max-w-xl items-center px-2">
        {LEFT_TABS.map((tab) => (
          <TabLink key={tab.to} tab={tab} />
        ))}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="Ausgabe erfassen"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg shadow-brand-700/30 hover:bg-brand-800 active:scale-95"
          >
            <Icon name="plus" className="size-7" />
          </button>
        </div>
        {RIGHT_TABS.map((tab) => (
          <TabLink key={tab.to} tab={tab} />
        ))}
      </div>
    </nav>
  );
}
