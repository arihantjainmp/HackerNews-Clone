import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-hn-orange p-2">
          <h1 className="text-white font-bold">Hacker News Clone</h1>
        </header>
        <main className="container mx-auto p-4">
          <p>Welcome to Hacker News Clone</p>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
