// Firebase Configuration Initialization

async function initializeFirebase() {
    try {
        const response = await fetch('/api/auth/firebase-config');
        const firebaseConfig = await response.json();
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized successfully');
        }
        return true;
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        
        // Optional: Display user-friendly error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = 'Unable to connect to authentication service. Please try again later.';
        document.body.prepend(errorDiv);
        
        return false;
    }
}

// Export for potential use in other scripts
window.initializeFirebase = initializeFirebase;
