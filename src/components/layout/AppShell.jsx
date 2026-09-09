import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { ApplicationModalProvider } from '../../context/ApplicationModalContext';

function AppShellContent() {
  return (
    <div
      id="app-shell"
      className="min-h-screen flex bg-surface text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed"
    >
      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Fixed Header */}
        <Header />

        {/* Scrollable Content View */}
        <main
          id="app-main-content"
          className="w-full pt-16 md:pl-64 pb-28 md:pb-space-3xl flex-1 bg-surface min-h-screen transition-colors"
        >
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-space-md md:px-space-xl py-space-md sm:py-space-lg">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}

export default function AppShell() {
  return (
    <ApplicationModalProvider>
      <AppShellContent />
    </ApplicationModalProvider>
  );
}
