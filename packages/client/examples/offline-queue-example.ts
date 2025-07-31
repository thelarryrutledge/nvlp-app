/**
 * Example of using the offline queue for failed requests
 */

import { createNVLPClient, LocalStorage, FileSystemStorage, createDefaultStorage } from '../src';

// Example 1: Basic offline queue usage
async function basicOfflineQueueExample() {
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    offlineQueue: {
      enabled: true,
      maxSize: 100,
      retryOnReconnect: true,
    },
  });

  try {
    // This request will be queued if it fails due to network issues
    const budgets = await nvlp.budgets.select('*').get();
    console.log('Budgets loaded successfully:', budgets.length);
  } catch (error) {
    console.log('Request failed, checking if it was queued...');
    console.log('Queue size:', nvlp.getOfflineQueueSize());
  }

  // Manually process the queue when connectivity is restored
  console.log('Processing offline queue...');
  await nvlp.processOfflineQueue();
  console.log('Queue size after processing:', nvlp.getOfflineQueueSize());
}

// Example 2: Using custom storage (browser localStorage)
async function browserOfflineQueueExample() {
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    offlineQueue: {
      enabled: true,
      maxSize: 50,
      storage: new LocalStorage(), // Persist queue in browser localStorage
      retryOnReconnect: true,
    },
  });

  // Simulate network failure scenarios
  try {
    // This request will be persisted in localStorage if it fails
    const newBudget = await nvlp.post('/budgets', {
      name: 'Offline Budget',
      description: 'Created while offline',
    });
    console.log('Budget created:', newBudget);
  } catch (error) {
    console.log('Request queued for later:', error.message);
  }

  // The queue will automatically process when the browser comes back online
  // You can also manually trigger processing
  await nvlp.processOfflineQueue();
}

// Example 3: Node.js with file system storage
async function nodeOfflineQueueExample() {
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    offlineQueue: {
      enabled: true,
      maxSize: 200,
      storage: new FileSystemStorage('./offline-requests'), // Persist to file system
      retryOnReconnect: false, // Manual processing only
    },
  });

  // Simulate multiple failed requests
  const requests = [
    nvlp.post('/budgets', { name: 'Budget 1' }),
    nvlp.post('/budgets', { name: 'Budget 2' }),
    nvlp.patch('/budgets/123', { name: 'Updated Budget' }),
  ];

  // These will be queued if they fail
  const results = await Promise.allSettled(requests);
  console.log('Failed requests queued:', nvlp.getOfflineQueueSize());

  // Process queue when ready
  await nvlp.processOfflineQueue();
}

// Example 4: React Native with AsyncStorage
async function reactNativeOfflineQueueExample() {
  // Note: This requires @react-native-async-storage/async-storage
  // import AsyncStorage from '@react-native-async-storage/async-storage';
  // import { AsyncStorageImpl } from '@nvlp/client';

  /*
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    offlineQueue: {
      enabled: true,
      maxSize: 100,
      storage: new AsyncStorageImpl(AsyncStorage),
      retryOnReconnect: true,
    },
  });

  // Queue will persist across app restarts
  try {
    const transaction = await nvlp.post('/budgets/123/transactions', {
      type: 'EXPENSE',
      amount: 25.99,
      description: 'Coffee',
    });
    console.log('Transaction created:', transaction);
  } catch (error) {
    console.log('Transaction queued for later');
  }
  */
}

// Example 5: Auto-detecting storage
async function autoStorageExample() {
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    offlineQueue: {
      enabled: true,
      storage: createDefaultStorage(), // Auto-detects environment
    },
  });

  console.log('Using auto-detected storage for offline queue');
  
  try {
    const dashboard = await nvlp.get('/budgets/123/dashboard');
    console.log('Dashboard loaded:', dashboard);
  } catch (error) {
    console.log('Dashboard request queued for retry');
  }
}

// Example 6: Manual queue management
async function manualQueueManagementExample() {
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    offlineQueue: {
      enabled: true,
      retryOnReconnect: false, // No automatic processing
    },
  });

  // Check queue status
  console.log('Initial queue size:', nvlp.getOfflineQueueSize());

  // Make some requests that might fail
  try {
    await nvlp.post('/budgets', { name: 'Test Budget' });
  } catch (error) {
    console.log('Request failed and queued');
  }

  console.log('Queue size after failed request:', nvlp.getOfflineQueueSize());

  // Process queue manually
  console.log('Processing queue...');
  await nvlp.processOfflineQueue();
  console.log('Queue size after processing:', nvlp.getOfflineQueueSize());

  // Clear queue if needed
  await nvlp.clearOfflineQueue();
  console.log('Queue cleared, size:', nvlp.getOfflineQueueSize());
}

// Example 7: Monitoring queue in a React app
function ReactOfflineQueueComponent() {
  /*
  const [queueSize, setQueueSize] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.REACT_APP_SUPABASE_URL!,
    supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY!,
    offlineQueue: {
      enabled: true,
      storage: new LocalStorage(),
    },
  });

  useEffect(() => {
    const updateQueueSize = () => setQueueSize(nvlp.getOfflineQueueSize());
    const handleOnline = () => {
      setIsOnline(true);
      nvlp.processOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    // Monitor connectivity
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check queue size periodically
    const interval = setInterval(updateQueueSize, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <p>Connection: {isOnline ? 'Online' : 'Offline'}</p>
      <p>Queued requests: {queueSize}</p>
      {queueSize > 0 && (
        <button onClick={() => nvlp.processOfflineQueue()}>
          Process Queue
        </button>
      )}
    </div>
  );
  */
}

export {
  basicOfflineQueueExample,
  browserOfflineQueueExample,
  nodeOfflineQueueExample,
  reactNativeOfflineQueueExample,
  autoStorageExample,
  manualQueueManagementExample,
  ReactOfflineQueueComponent,
};