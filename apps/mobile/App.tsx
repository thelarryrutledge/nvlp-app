import { StatusBar, useColorScheme } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { TestAuthScreen } from './src/screens/TestAuthScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AuthProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <TestAuthScreen />
    </AuthProvider>
  );
}


export default App;
