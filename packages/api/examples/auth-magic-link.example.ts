/**
 * Example: Send Magic Link Email
 * 
 * This demonstrates how to send a magic link email for authentication.
 * The user will receive an email with a link to sign in.
 */

import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../src/services';
import { Database } from '@nvlp/types';

// Example usage with direct service
async function sendMagicLinkExample() {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  const authService = new AuthService(client);

  try {
    // Send magic link
    await authService.signInWithMagicLink({
      email: 'user@example.com',
      redirectTo: 'https://yourapp.com/auth/callback'
    });
    
    console.log('✅ Magic link sent successfully!');
    console.log('Check your email for the sign-in link.');
  } catch (error) {
    console.error('❌ Error sending magic link:', error);
  }
}

// Example cURL command for REST API endpoint
const curlExample = `
# Send magic link email
curl -X POST http://localhost:3000/api/auth/magic-link \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "redirectTo": "https://yourapp.com/auth/callback"
  }'
`;

// Example response
const exampleResponse = {
  success: true,
  message: 'Magic link sent to your email'
};

console.log('cURL Example:', curlExample);
console.log('Example Response:', JSON.stringify(exampleResponse, null, 2));

// Run the example
if (require.main === module) {
  sendMagicLinkExample();
}