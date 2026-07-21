const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to Service Account
const serviceAccountPath = path.join(__dirname, '../../..', 'serviceAccount.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('Error: serviceAccount.json not found at ' + serviceAccountPath);
    console.error('Please verify you have placed the serviceAccount.json in the root of the repo.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function grantAdmin(email) {
    if (!email) {
        console.log('Fetching latest user...');
        try {
            const listUsersResult = await auth.listUsers(1);
            if (listUsersResult.users.length > 0) {
                email = listUsersResult.users[0].email;
                console.log(`Found user: ${email}`);
            } else {
                console.error('No users found in Authentication.');
                return;
            }
        } catch (e) {
            console.error('Error listing users:', e);
            return;
        }
    }

    console.log(`Granting admin access to: ${email}`);

    try {
        // 1. Add to authorized_admins collection
        // Key by email for easy lookup in security rules
        await db.collection('authorized_admins').doc(email).set({
            email: email,
            grantedAt: admin.firestore.Timestamp.now(),
            grantedBy: 'setup-script'
        });

        console.log('✅ Success! User added to authorized_admins.');
        console.log('Please ensure you have deployed the firestore.rules to the Firebase Console.');

    } catch (error) {
        console.error('Error granting admin:', error);
    }
}

// Get email from arg or default to 'latest'
const targetEmail = process.argv[2];
grantAdmin(targetEmail);
