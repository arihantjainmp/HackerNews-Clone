import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Login, Signup } from './pages';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <div className="min-h-screen bg-gray-50">
                <header className="bg-hn-orange p-2">
                  <h1 className="text-white font-bold">Hacker News Clone</h1>
                </header>
                <main className="container mx-auto p-4">
                  <p>Welcome to Hacker News Clone</p>
                </main>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
