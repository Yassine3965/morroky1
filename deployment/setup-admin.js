
// deployment/setup-admin.js
// This is a one-time script to be run from your local machine.
// DO NOT include this in your frontend build.

import { createClient } from '@supabase/supabase-js';

// Replace with your actual credentials from Supabase Settings -> API
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setupFirstAdmin(targetUserId) {
    console.log(`Setting up Admin for user: ${targetUserId}...`);

    const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: targetUserId, role: 'ADMIN' }]);

    if (error) {
        console.error('❌ Failed to set admin:', error.message);
    } else {
        console.log('✅ First Admin created successfully! System is now ready.');
    }
}

// 1. Create a user normally via the app or Supabase Auth dashboard.
// 2. Get the User ID (UUID) from Supabase Authentication -> Users.
// 3. Paste it here and run: node deployment/setup-admin.js
const firstAdminId = 'PASTE_USER_ID_HERE'; 

if (firstAdminId === 'PASTE_USER_ID_HERE') {
    console.error('❌ Please provide a valid User ID in setup-admin.js');
} else {
    setupFirstAdmin(firstAdminId);
}
