/**
 * Session Test Utilities
 * 
 * Utility functions for testing session expiration flows
 */

import { tokenManager } from '../services/auth/tokenManager';
import { rememberMeService } from '../services/auth/rememberMeService';
import { secureCredentialStorage } from '../services/auth/secureCredentialStorage';

export interface SessionTestReport {
  testName: string;
  passed: boolean;
  details: string;
  timestamp: string;
}

/**
 * Test suite for session expiration flows
 */
export class SessionTestSuite {
  private results: SessionTestReport[] = [];

  /**
   * Run all session tests
   */
  async runAllTests(): Promise<SessionTestReport[]> {
    this.results = [];
    
    console.log('🧪 Starting Session Expiration Test Suite...');
    
    await this.testTokenExpirationDetection();
    await this.testTokenRefreshFlow();
    await this.testLogoutClearsTokens();
    await this.testRememberMePersistence();
    await this.testBiometricCredentialClearance();
    
    console.log('✅ Session Test Suite Complete');
    console.log('Results:', this.results);
    
    return this.results;
  }

  /**
   * Test 1: Token expiration detection
   */
  private async testTokenExpirationDetection(): Promise<void> {
    try {
      console.log('🔍 Testing token expiration detection...');
      
      // Create a token that expires in 1 second
      const expiredTokenData = tokenManager.createTokenData(
        'fake_access_token',
        'fake_refresh_token',
        { id: 'test_user', email: 'test@example.com' },
        1 // 1 second expiry
      );
      
      // Check if token is initially valid
      const isInitiallyValid = !tokenManager['isTokenExpired'](expiredTokenData);
      
      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if token is now expired
      const isNowExpired = tokenManager['isTokenExpired'](expiredTokenData);
      
      const passed = isInitiallyValid && isNowExpired;
      
      this.addResult('Token Expiration Detection', passed, 
        `Initial valid: ${isInitiallyValid}, After delay expired: ${isNowExpired}`);
        
    } catch (error) {
      this.addResult('Token Expiration Detection', false, `Error: ${error}`);
    }
  }

  /**
   * Test 2: Token refresh need detection
   */
  private async testTokenRefreshFlow(): Promise<void> {
    try {
      console.log('🔄 Testing token refresh need detection...');
      
      // Create a token that needs refresh (expires in 4 minutes, threshold is 5 minutes)
      const tokenData = tokenManager.createTokenData(
        'fake_access_token',
        'fake_refresh_token',
        { id: 'test_user', email: 'test@example.com' },
        240 // 4 minutes (240 seconds)
      );
      
      // Temporarily set current tokens
      tokenManager['currentTokens'] = tokenData;
      
      // Check if token needs refresh (should be true since 4 min < 5 min threshold)
      const needsRefresh = tokenManager.needsRefresh();
      
      // Check token is still valid
      const isValid = tokenManager.hasValidTokens();
      
      // Reset tokens
      tokenManager['currentTokens'] = null;
      
      const passed = needsRefresh && isValid;
      
      this.addResult('Token Refresh Detection', passed, 
        `Needs refresh: ${needsRefresh}, Is valid: ${isValid}`);
        
    } catch (error) {
      this.addResult('Token Refresh Detection', false, `Error: ${error}`);
    }
  }

  /**
   * Test 3: Logout clears all tokens
   */
  private async testLogoutClearsTokens(): Promise<void> {
    try {
      console.log('🚪 Testing logout token clearance...');
      
      // Create test token data
      const tokenData = tokenManager.createTokenData(
        'test_access_token',
        'test_refresh_token',
        { id: 'test_user', email: 'test@example.com' },
        3600 // 1 hour
      );
      
      // Save tokens
      await tokenManager.saveTokens(tokenData);
      
      // Verify tokens are saved
      const savedTokens = tokenManager.getCurrentTokens();
      const hasTokensBeforeLogout = !!savedTokens;
      
      // Perform logout
      await tokenManager.logout();
      
      // Verify tokens are cleared
      const tokensAfterLogout = tokenManager.getCurrentTokens();
      const hasTokensAfterLogout = !!tokensAfterLogout;
      
      const passed = hasTokensBeforeLogout && !hasTokensAfterLogout;
      
      this.addResult('Logout Token Clearance', passed, 
        `Had tokens before: ${hasTokensBeforeLogout}, Has tokens after: ${hasTokensAfterLogout}`);
        
    } catch (error) {
      this.addResult('Logout Token Clearance', false, `Error: ${error}`);
    }
  }

  /**
   * Test 4: Remember me persistence
   */
  private async testRememberMePersistence(): Promise<void> {
    try {
      console.log('💾 Testing remember me persistence...');
      
      const testEmail = 'test@example.com';
      
      // Clear any existing preference
      await rememberMeService.clearPreference();
      
      // Save remember me preference
      await rememberMeService.savePreference(testEmail, true);
      
      // Retrieve preference
      const preference = await rememberMeService.getPreference();
      
      // Check should auto login
      const { shouldLogin, email } = await rememberMeService.shouldAutoLogin();
      
      // Clear preference for cleanup
      await rememberMeService.clearPreference();
      
      const passed = preference?.rememberMe === true && 
                     preference?.email === testEmail &&
                     shouldLogin === true &&
                     email === testEmail;
      
      this.addResult('Remember Me Persistence', passed, 
        `Preference saved: ${!!preference}, Should auto login: ${shouldLogin}, Email match: ${email === testEmail}`);
        
    } catch (error) {
      this.addResult('Remember Me Persistence', false, `Error: ${error}`);
    }
  }

  /**
   * Test 5: Biometric credential clearance
   */
  private async testBiometricCredentialClearance(): Promise<void> {
    try {
      console.log('🔐 Testing biometric credential management...');
      
      const testCredentials = {
        email: 'test@example.com',
        password: 'test_password'
      };
      
      // Store test credentials
      await secureCredentialStorage.storeCredentials(testCredentials);
      
      // Verify credentials are stored
      const hasCredentialsBefore = await secureCredentialStorage.hasCredentials();
      
      // Clear credentials
      await secureCredentialStorage.removeCredentials();
      
      // Verify credentials are cleared
      const hasCredentialsAfter = await secureCredentialStorage.hasCredentials();
      
      const passed = hasCredentialsBefore && !hasCredentialsAfter;
      
      this.addResult('Biometric Credential Clearance', passed, 
        `Had credentials before: ${hasCredentialsBefore}, Has credentials after: ${hasCredentialsAfter}`);
        
    } catch (error) {
      this.addResult('Biometric Credential Clearance', false, `Error: ${error}`);
    }
  }

  /**
   * Add test result
   */
  private addResult(testName: string, passed: boolean, details: string): void {
    const result: SessionTestReport = {
      testName,
      passed,
      details,
      timestamp: new Date().toISOString(),
    };
    
    this.results.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${details}`);
  }

  /**
   * Get test results summary
   */
  getTestSummary(): { total: number; passed: number; failed: number } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    
    return { total, passed, failed };
  }
}

/**
 * Convenience function to run session tests
 */
export async function runSessionExpirationTests(): Promise<SessionTestReport[]> {
  const testSuite = new SessionTestSuite();
  return await testSuite.runAllTests();
}