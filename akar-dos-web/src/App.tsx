import { AuthProvider, useAuth } from './auth';
import { Login } from './screens/Login';
import { MyWork } from './screens/MyWork';
import './App.css';

function Routed() {
  const { user } = useAuth();
  // Foundation routing: My Work is the home screen after login; otherwise Login.
  return user ? <MyWork /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  );
}
