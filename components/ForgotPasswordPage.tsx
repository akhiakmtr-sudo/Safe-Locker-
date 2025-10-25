import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import type { Page } from '../App';

interface ForgotPasswordPageProps {
  onNavigate: (page: Page) => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset link sent! Please check your email.');
    } catch (err: any) {
      setError('Failed to send reset link. Please check the email address.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter your email and we'll send you a reset link.</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {message && <p className="text-sm text-center text-green-600 dark:text-green-400">{message}</p>}
          {error && <p className="text-sm text-center text-red-500 dark:text-red-400">{error}</p>}
          <div className="rounded-md shadow-sm">
            <label htmlFor="email-address-forgot" className="sr-only">Email address</label>
            <input id="email-address-forgot" name="email" type="email" autoComplete="email" required 
                   className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                   placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <button type="submit" disabled={isLoading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Remember your password?{' '}
          <button onClick={() => onNavigate('login')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
