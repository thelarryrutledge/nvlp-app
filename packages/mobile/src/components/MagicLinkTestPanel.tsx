import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { env } from '../config/env';
import { useMagicLink } from '../hooks/useMagicLink';
import SupabaseAuthClient from '../services/supabaseClient';

/**
 * Development panel for magic link testing
 * Only rendered in development mode
 */
export const MagicLinkTestPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const magicLink = useMagicLink({
    onMagicLink: async (data) => {
      Alert.alert(
        'Magic Link Received',
        `Access token: ${data.access_token ? 'YES' : 'NO'}\nType: ${data.type || 'unknown'}\nExpires in: ${data.expires_in || 'unknown'}`
      );

      // If we have tokens, try to establish session
      if (data.access_token && data.refresh_token) {
        const result = await SupabaseAuthClient.exchangeCodeForSession(
          data.access_token,
          data.refresh_token
        );
        
        if (result.success) {
          Alert.alert(
            'Authentication Success',
            `Welcome ${result.user?.email}!\nSession established successfully.`
          );
          // Automatically refresh session status
          checkSessionStatus();
        } else {
          Alert.alert('Session Error', result.error);
        }
      }
    },
    onError: (error) => {
      Alert.alert('Magic Link Error', error);
    },
  });

  // Check session status function
  const checkSessionStatus = async () => {
    try {
      const result = await SupabaseAuthClient.getCurrentSession();
      if (result.success && result.session) {
        setCurrentSession(result.session);
      } else {
        setCurrentSession(null);
      }
      setSessionChecked(true);
    } catch (error) {
      setCurrentSession(null);
      setSessionChecked(true);
    }
  };

  // Check session status on component mount
  useEffect(() => {
    checkSessionStatus();
  }, []);

  // Only show in development
  if (env.NODE_ENV !== 'development') {
    return null;
  }

  const handleTestMagicLink = () => {
    if (!testUrl.trim()) {
      Alert.alert('Error', 'Please enter a test URL');
      return;
    }

    try {
      const result = magicLink.testMagicLink(testUrl);
      Alert.alert(
        'Test Result',
        JSON.stringify(result, null, 2),
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to test magic link: ${error}`);
    }
  };

  const handleShowConfiguration = () => {
    const config = magicLink.validateConfiguration();
    const stats = magicLink.getStats();
    
    Alert.alert(
      'Configuration',
      `Valid: ${config.isValid}\nRedirect URL: ${stats.redirectURL}\nHandlers: ${stats.handlerCount}\nErrors: ${config.errors.join(', ') || 'None'}`,
      [{ text: 'OK' }]
    );
  };

  const handleShowStats = () => {
    const stats = magicLink.getStats();
    Alert.alert(
      'Magic Link Stats',
      `Ready: ${magicLink.isReady}\nInitialized: ${stats.isInitialized}\nHandlers: ${stats.handlers.join(', ')}\nRedirect URL: ${stats.redirectURL}`,
      [{ text: 'OK' }]
    );
  };

  const handleClearData = () => {
    magicLink.clearMagicLink();
    Alert.alert('Success', 'Magic link data cleared');
  };

  const handleSendMagicLink = async () => {
    if (!testEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await SupabaseAuthClient.sendMagicLink(testEmail);
      
      if (result.success) {
        Alert.alert(
          'Magic Link Sent!',
          `Check your email (${testEmail}) for the magic link.\n\nAfter receiving the email:\n1. Copy the magic link URL\n2. Open Safari on the simulator\n3. Paste and navigate to the URL\n4. The app should open automatically`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send magic link');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to send magic link: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckSession = async () => {
    setIsLoading(true);
    try {
      const result = await SupabaseAuthClient.getCurrentSession();
      
      if (result.success && result.session) {
        Alert.alert(
          'Current Session',
          `User: ${result.session.user?.email}\nExpires: ${new Date(result.session.expires_at! * 1000).toLocaleString()}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('No Session', 'No active session found');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to check session: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const result = await SupabaseAuthClient.signOut();
      
      if (result.success) {
        Alert.alert('Signed Out', 'You have been signed out successfully');
        // Refresh session status after sign out
        checkSessionStatus();
      } else {
        Alert.alert('Error', result.error || 'Failed to sign out');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to sign out: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleUrls = [
    `${env.DEEP_LINK_SCHEME}://auth/callback#access_token=sample_token&refresh_token=sample_refresh&expires_in=3600&token_type=bearer&type=magiclink`,
    `${env.DEEP_LINK_SCHEME}://auth/callback#error=access_denied&error_description=User%20cancelled`,
    `${env.DEEP_LINK_SCHEME}://auth/callback#access_token=test123&type=recovery`,
  ];

  const config = magicLink.validateConfiguration();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>
          🔗 Magic Link Test Panel
        </Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {config.isValid ? '🟢' : '🔴'} {magicLink.isReady ? 'Ready' : 'Not Ready'}
          </Text>
          <Text style={styles.statusText}>
            {sessionChecked ? (currentSession ? '🟢 Auth' : '🔴 No Auth') : '⏳ Checking...'}
          </Text>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>
            Test magic link authentication end-to-end
          </Text>

          {/* Magic Link Request */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send Magic Link</Text>
            
            <TextInput
              style={styles.textInput}
              value={testEmail}
              onChangeText={setTestEmail}
              placeholder="Enter your email address..."
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSendMagicLink}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Sending...' : '📧 Send Magic Link'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.instructionText}>
              💡 After sending, check your email and copy the magic link URL to test the deep linking flow
            </Text>
          </View>

          {/* Configuration Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuration Status</Text>
            <View style={[
              styles.statusIndicator,
              config.isValid ? styles.statusValid : styles.statusInvalid
            ]}>
              <Text style={styles.statusLabel}>
                {config.isValid ? '✅ Configuration Valid' : '❌ Configuration Invalid'}
              </Text>
              {!config.isValid && (
                <Text style={styles.errorText}>
                  Errors: {config.errors.join(', ')}
                </Text>
              )}
            </View>
            <Text style={styles.infoText}>
              Redirect URL: {magicLink.getRedirectURL()}
            </Text>
          </View>

          {/* Authentication Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authentication Status</Text>
            {sessionChecked ? (
              <View style={[
                styles.statusIndicator,
                currentSession ? styles.statusValid : styles.statusInvalid
              ]}>
                <Text style={styles.statusLabel}>
                  {currentSession ? '✅ Authenticated' : '❌ Not Authenticated'}
                </Text>
                {currentSession && (
                  <>
                    <Text style={styles.infoText}>
                      User: {currentSession.user?.email}
                    </Text>
                    <Text style={styles.infoText}>
                      Expires: {new Date(currentSession.expires_at * 1000).toLocaleString()}
                    </Text>
                    <Text style={styles.infoText}>
                      Session ID: {currentSession.user?.id?.substring(0, 8)}...
                    </Text>
                  </>
                )}
              </View>
            ) : (
              <Text style={styles.infoText}>Checking authentication status...</Text>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={checkSessionStatus}
            >
              <Text style={styles.buttonText}>🔄 Refresh Status</Text>
            </TouchableOpacity>
          </View>

          {/* Test Magic Link */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Magic Link Parsing</Text>
            
            <TextInput
              style={styles.textInput}
              value={testUrl}
              onChangeText={setTestUrl}
              placeholder="Enter magic link URL to test..."
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleTestMagicLink}
            >
              <Text style={styles.buttonText}>Test URL Parsing</Text>
            </TouchableOpacity>

            <Text style={styles.sectionSubtitle}>Sample URLs:</Text>
            {sampleUrls.map((url, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.button, styles.sampleButton]}
                onPress={() => setTestUrl(url)}
              >
                <Text style={styles.sampleButtonText}>
                  Sample {index + 1}: {url.includes('error') ? 'Error' : url.includes('recovery') ? 'Recovery' : 'Success'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Session Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Management</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.infoButton, isLoading && styles.buttonDisabled]}
              onPress={handleCheckSession}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Checking...' : '🔍 Check Current Session'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.clearButton, isLoading && styles.buttonDisabled]}
              onPress={handleSignOut}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Signing Out...' : '🚪 Sign Out'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debug Actions</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={handleShowConfiguration}
            >
              <Text style={styles.buttonText}>Show Configuration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={handleShowStats}
            >
              <Text style={styles.buttonText}>Show Statistics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClearData}
            >
              <Text style={styles.buttonText}>Clear Magic Link Data</Text>
            </TouchableOpacity>
          </View>

          {/* Current State */}
          {(magicLink.lastMagicLink || magicLink.error) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Last Result</Text>
              
              {magicLink.lastMagicLink && (
                <View style={styles.resultContainer}>
                  <Text style={styles.resultTitle}>📧 Magic Link Data</Text>
                  <Text style={styles.resultText}>
                    Access Token: {magicLink.lastMagicLink.access_token ? 'Present' : 'None'}
                  </Text>
                  <Text style={styles.resultText}>
                    Refresh Token: {magicLink.lastMagicLink.refresh_token ? 'Present' : 'None'}
                  </Text>
                  <Text style={styles.resultText}>
                    Type: {magicLink.lastMagicLink.type || 'Unknown'}
                  </Text>
                  <Text style={styles.resultText}>
                    Expires In: {magicLink.lastMagicLink.expires_in || 'Unknown'}
                  </Text>
                  <Text style={styles.resultText}>
                    Token Type: {magicLink.lastMagicLink.token_type || 'Unknown'}
                  </Text>
                </View>
              )}

              {magicLink.error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>❌ Error</Text>
                  <Text style={styles.errorText}>{magicLink.error}</Text>
                </View>
              )}
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>End-to-End Testing Instructions</Text>
            <Text style={styles.instructionText}>
              1. Enter your email and tap "Send Magic Link"
            </Text>
            <Text style={styles.instructionText}>
              2. Check your email for the magic link message
            </Text>
            <Text style={styles.instructionText}>
              3. Copy the magic link URL from the email
            </Text>
            <Text style={styles.instructionText}>
              4. Open Safari on the simulator and paste the URL
            </Text>
            <Text style={styles.instructionText}>
              5. The app should open and authenticate automatically
            </Text>
            <Text style={styles.instructionText}>
              6. Use "Check Current Session" to verify authentication
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6f42c1',
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    flex: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  expandIcon: {
    fontSize: 16,
    color: '#6f42c1',
    fontWeight: 'bold',
  },
  content: {
    maxHeight: 500,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 12,
    marginBottom: 8,
  },
  statusIndicator: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusValid: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  statusInvalid: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  infoText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    minHeight: 60,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#6f42c1',
  },
  sampleButton: {
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  infoButton: {
    backgroundColor: '#17a2b8',
  },
  clearButton: {
    backgroundColor: '#ffc107',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  sampleButtonText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 12,
  },
  resultContainer: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    color: '#155724',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#721c24',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    paddingLeft: 8,
  },
});

export default MagicLinkTestPanel;