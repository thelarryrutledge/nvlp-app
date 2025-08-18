/**
 * @format
 */

// Import polyfills first to prevent conflicts
import './src/config/polyfills';

// Initialize Reactotron as early as possible (development only)
import './src/config/reactotronInit';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
