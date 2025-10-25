

import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import DashboardPage from './components/DashboardPage';

import { 
    FirebaseLogoIcon, LogoutIcon, ProfileIcon
} from './components/icons';

// Fix: Export the Page type to be used by authentication pages.
export type Page = 'login' | 'signup' | 'forgot-password';

const TopHeader = ({ user }: { user: User }) => (
    <header className="grid grid-cols-3 h-12 items-center bg-[#282a2d] px-4 shadow-md z-20 flex-shrink-0">
        <div className="flex justify-start">
             <button
                onClick={() => signOut(auth)}
                className="flex items-center space-x-2 text-gray-300 hover:text-white font-semibold py-1.5 px-3 rounded-md transition-colors hover:bg-red-600/50"
            >
                <LogoutIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Sign Out</span>
            </button>
        </div>
        <div className="flex items-center justify-center text-center">
            <FirebaseLogoIcon className="h-6 w-6 mr-2 text-yellow-500" />
            <span className="text-lg font-medium text-gray-200 whitespace-nowrap">react-media-manager</span>
        </div>
        <div className="flex items-center space-x-4 justify-end">
            <span className="text-gray-300 hidden sm:block truncate">{user.email}</span>
            <ProfileIcon className="h-8 w-8 text-gray-300 bg-gray-700 rounded-full p-1" />
        </div>
    </header>
);

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
    <div className="bg-[#202124] text-gray-300 h-screen font-sans text-sm flex flex-col">
      <TopHeader user={user} />
      <div className="flex-1 overflow-y-auto">
          <DashboardPage user={user} />
      </div>
    </div>
  );
};

export default App;