// Quick test script for ElevenLabs API
require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

console.log('Testing ElevenLabs API...\n');
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('Voice ID:', VOICE_ID || 'NOT SET');
console.log('');

// Test 1: Check API Key validity
axios.get('https://api.elevenlabs.io/v1/user', {
  headers: {
    'xi-api-key': API_KEY
  }
})
.then(response => {
  console.log('✅ API Key is VALID!');
  console.log('Account Info:', {
    subscription: response.data.subscription?.tier || 'free',
    character_count: response.data.subscription?.character_count || 0,
    character_limit: response.data.subscription?.character_limit || 0
  });
  console.log('');
  
  // Test 2: List available voices
  return axios.get('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': API_KEY
    }
  });
})
.then(response => {
  console.log('✅ Available Voices:\n');
  response.data.voices.slice(0, 5).forEach(voice => {
    console.log(`  - ${voice.name}: ${voice.voice_id}`);
  });
  console.log('');
  console.log('✅ All tests passed! Your configuration is correct.');
})
.catch(error => {
  console.error('❌ ERROR:', error.response?.data || error.message);
  console.log('');
  console.log('🔧 Solutions:');
  console.log('1. Get a valid API key from: https://elevenlabs.io/app/settings/api-keys');
  console.log('2. Make sure your account has available credits');
  console.log('3. Check if your subscription is active');
});
