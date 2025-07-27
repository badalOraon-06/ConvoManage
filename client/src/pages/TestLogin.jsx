import React, { useState } from 'react';
import api from '../services/api';

const TestLogin = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testAdminLogin = async () => {
    setLoading(true);
    setResult('Testing admin login...');
    
    try {
      console.log('Making API request to:', `${api.defaults.baseURL}/auth/login`);
      
      const response = await api.post('/auth/login', {
        email: 'admin@convomanage.com',
        password: 'admin123'
      });
      
      console.log('Response:', response.data);
      setResult(`Success: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('Login error:', error);
      setResult(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testRegistration = async () => {
    setLoading(true);
    setResult('Testing registration...');
    
    try {
      const timestamp = Date.now();
      const response = await api.post('/auth/register', {
        name: 'Test User',
        email: `test${timestamp}@example.com`,
        password: 'test123'
      });
      
      console.log('Response:', response.data);
      setResult(`Success: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('Registration error:', error);
      setResult(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testAdminLogin}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Admin Login
        </button>
        
        <button
          onClick={testRegistration}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Registration
        </button>
      </div>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Result:</h3>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
    </div>
  );
};

export default TestLogin;
