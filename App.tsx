import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import DashboardPage from './components/DashboardPage';

export type Page = 'login' | 'signup' | 'forgot-password';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
      alert("Failed to sign out.");
    }
  }, []);

  const navigateTo = useCallback((page: Page) => {
    setCurrentPage(page);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700 dark:text-gray-300">
        <p>Loading application...</p>
      </div>
    );
  }

  const renderAuthPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onNavigate={navigateTo} />;
      case 'signup':
        return <SignupPage onNavigate={navigateTo} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={navigateTo} />;
      default:
        setCurrentPage('login');
        return <LoginPage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {user ? (
        <>
          <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Media Dashboard</h1>
            <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Logout
            </button>
          </header>
          <DashboardPage user={user} />
        </>
      ) : (
        renderAuthPage()
      )}
    </div>
  );
};

export default App;
