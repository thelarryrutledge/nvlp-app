import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { env } from '../config/env';
import { useOAuth } from '../hooks/useOAuth';
import OAuthService from '../services/oauthService';

/**
 * Development panel for OAuth authentication testing
 * Only rendered in development mode
 */
export const OAuthTestPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ isValid: boolean; errors: string[] }>({
    isValid: false,
    errors: [],
  });

  const oauth = useOAuth({
    onSuccess: (result) => {
      Alert.alert(
        'OAuth Success',
        `Access token received!\nExpires: ${new Date(result.expiresAt).toLocaleString()}\nScopes: ${result.scopes.join(', ')}`
      );
    },
    onError: (error) => {
      Alert.alert(
        'OAuth Error',
        `Authentication failed: ${error.message}`
      );
    },
  });

  // Only show in development
  if (env.NODE_ENV !== 'development') {
    return null;
  }

  useEffect(() => {
    const status = OAuthService.validateConfiguration();
    setConfigStatus(status);
  }, []);

  const handleTestProvider = async (providerKey: string) => {
    try {
      await oauth.authenticate(providerKey);
    } catch (error) {
      // Error already handled by the hook
      console.log('OAuth test completed with error:', error);
    }
  };

  const handleShowProviderInfo = () => {
    const providers = OAuthService.getProviders();
    const stats = OAuthService.getProviderStats();
    
    const providerInfo = Array.from(providers.entries()).map(([key, provider]) => ({
      key,
      name: provider.name,
      ready: OAuthService.isProviderReady(key),
      redirectUrl: provider.config.redirectUrl,
      scopes: provider.config.scopes,
    }));

    Alert.alert(
      'OAuth Providers',
      `Total: ${stats.totalProviders}\nReady: ${stats.readyProviders}\n\n` +
      providerInfo.map(p => `${p.name}: ${p.ready ? '✅' : '❌'}`).join('\n'),
      [{ text: 'OK' }]
    );
  };

  const handleShowConfiguration = () => {
    const config = {
      deepLinkScheme: env.DEEP_LINK_SCHEME,
      supabaseUrl: env.SUPABASE_URL ? '***SET***' : '***NOT_SET***',
      supabaseAnonKey: env.SUPABASE_ANON_KEY ? '***SET***' : '***NOT_SET***',
      configValid: configStatus.isValid,
      errors: configStatus.errors,
    };

    Alert.alert(
      'OAuth Configuration',
      JSON.stringify(config, null, 2),
      [{ text: 'OK' }]
    );
  };

  const providers = OAuthService.getProviders();
  const stats = OAuthService.getProviderStats();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>
          🔐 OAuth Authentication Panel
        </Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {configStatus.isValid ? '🟢' : '🔴'} {stats.readyProviders}/{stats.totalProviders} Ready
          </Text>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>
            Test OAuth authentication flows with different providers
          </Text>

          {/* Configuration Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuration Status</Text>
            <View style={[
              styles.statusIndicator,
              configStatus.isValid ? styles.statusValid : styles.statusInvalid
            ]}>
              <Text style={styles.statusLabel}>
                {configStatus.isValid ? '✅ Configuration Valid' : '❌ Configuration Invalid'}
              </Text>
              {!configStatus.isValid && (
                <Text style={styles.errorText}>
                  Errors: {configStatus.errors.join(', ')}
                </Text>
              )}
            </View>
          </View>

          {/* Provider Testing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Authentication</Text>
            
            {Array.from(providers.entries()).map(([key, provider]) => {
              const isReady = OAuthService.isProviderReady(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.button,
                    isReady ? styles.providerButton : styles.disabledButton
                  ]}
                  onPress={() => handleTestProvider(key)}
                  disabled={!isReady || oauth.isLoading}
                >
                  {oauth.isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>
                        Test {provider.name} {isReady ? '✅' : '❌'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Information</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={handleShowProviderInfo}
            >
              <Text style={styles.buttonText}>Show Provider Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={handleShowConfiguration}
            >
              <Text style={styles.buttonText}>Show Configuration</Text>
            </TouchableOpacity>
          </View>

          {/* Current State */}
          {(oauth.result || oauth.error) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Last Result</Text>
              
              {oauth.result && (
                <View style={styles.resultContainer}>
                  <Text style={styles.resultTitle}>✅ Authentication Successful</Text>
                  <Text style={styles.resultText}>Token Type: {oauth.result.tokenType}</Text>
                  <Text style={styles.resultText}>
                    Expires: {new Date(oauth.result.expiresAt).toLocaleString()}
                  </Text>
                  <Text style={styles.resultText}>
                    Scopes: {oauth.result.scopes.join(', ')}
                  </Text>
                  <Text style={styles.resultText}>
                    Has Refresh Token: {oauth.result.refreshToken ? 'Yes' : 'No'}
                  </Text>
                </View>
              )}

              {oauth.error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>❌ Authentication Failed</Text>
                  <Text style={styles.errorText}>{oauth.error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={oauth.clearState}
              >
                <Text style={styles.buttonText}>Clear Result</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Setup Instructions</Text>
            <Text style={styles.instructionText}>
              1. Configure OAuth providers in environment variables
            </Text>
            <Text style={styles.instructionText}>
              2. Ensure deep linking is properly configured
            </Text>
            <Text style={styles.instructionText}>
              3. Test authentication flows with each provider
            </Text>
            <Text style={styles.instructionText}>
              4. Check redirect URLs match provider configuration
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
    borderColor: '#28a745',
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
    color: '#28a745',
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
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  providerButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
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

export default OAuthTestPanel;