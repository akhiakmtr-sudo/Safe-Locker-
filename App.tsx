
import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import DashboardPage from './components/DashboardPage';

import { 
    FirebaseLogoIcon, DatabaseIcon,
} from './components/icons';

// Fix: Export the Page type to be used by authentication pages.
export type Page = 'login' | 'signup' | 'forgot-password';

const TopHeader = ({ user }: { user: User }) => (
    <header className="flex h-12 items-center justify-between bg-[#282a2d] px-4 shadow-md z-20">
        <div className="flex items-center">
            <FirebaseLogoIcon className="h-6 w-6 mr-3 text-yellow-500" />
            <span className="text-lg font-medium text-gray-200">react-media-manager</span>
        </div>
        <div className="flex items-center space-x-4">
            <span className="text-gray-300">{user.email}</span>
            <button
                onClick={() => signOut(auth)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded transition-colors"
            >
                Sign Out
            </button>
        </div>
    </header>
);

const Sidebar = () => {
    const activeNavItemClasses = "flex items-center space-x-3 rounded px-2 py-1.5 text-white bg-blue-600/30";

    return (
        <aside className="w-60 flex-shrink-0 bg-[#282a2d] p-3 flex flex-col overflow-y-auto">
            <div className="flex items-center space-x-2 pb-3 border-b border-gray-700">
                <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
                <div>
                    <h2 className="font-bold text-white">react-media-manager</h2>
                    <p className="text-xs text-gray-400">Blaze Plan</p>
                </div>
            </div>
            <nav className="mt-4 flex-1">
                <div className="space-y-1">
                    <div className={activeNavItemClasses}><DatabaseIcon className="h-5 w-5" /> <span>Files</span></div>
                </div>
            </nav>
        </aside>
    );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>('login');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleNavigate = (newPage: Page) => {
    setPage(newPage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#202124] text-white">
        Loading...
      </div>
    );
  }
  
  if (!user) {
    switch (page) {
      case 'signup':
        return <SignupPage onNavigate={handleNavigate} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={handleNavigate} />;
      case 'login':
      default:
        return <LoginPage onNavigate={handleNavigate} />;
    }
  }

  return (
    <div className="bg-[#202124] text-gray-300 min-h-screen font-sans text-sm">
      <TopHeader user={user} />
      <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
            <DashboardPage user={user} />
        </div>
      </div>
    </div>
  );
};

export default App;
