import React, { useState } from 'react';
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

/**
 * Development panel for magic link testing
 * Only rendered in development mode
 */
export const MagicLinkTestPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testUrl, setTestUrl] = useState('');

  const magicLink = useMagicLink({
    onMagicLink: (data) => {
      Alert.alert(
        'Magic Link Received',
        `Access token: ${data.access_token ? 'YES' : 'NO'}\nType: ${data.type || 'unknown'}\nExpires in: ${data.expires_in || 'unknown'}`
      );
    },
    onError: (error) => {
      Alert.alert('Magic Link Error', error);
    },
  });

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
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>
            Test magic link deep linking and URL parsing
          </Text>

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

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
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
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructionText}>
              1. Configure DEEP_LINK_SCHEME in environment variables
            </Text>
            <Text style={styles.instructionText}>
              2. Set up Supabase magic link redirect URL to your app scheme
            </Text>
            <Text style={styles.instructionText}>
              3. Test URL parsing with sample URLs above
            </Text>
            <Text style={styles.instructionText}>
              4. Use a real magic link from Supabase to test end-to-end
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