const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testMagicLink() {
  console.log('Testing magic link authentication...');
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email: 'larry@mariomurillo.org',
    options: {
      emailRedirectTo: 'https://nvlp.app/auth/callback'
    }
  });

  if (error) {
    console.error('Error sending magic link:', error);
    return;
  }

  console.log('Magic link sent successfully!', data);
  console.log('Check larry@mariomurillo.org for the magic link email');
}

testMagicLink();