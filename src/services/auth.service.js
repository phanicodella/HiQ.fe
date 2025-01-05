// frontend/src/services/auth.service.js
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged
  } from 'firebase/auth';
  import { initializeApp } from 'firebase/app';
  import api from './api';
  
  // Initialize Firebase
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  class AuthService {
    constructor() {
      // Configure axios interceptor for auth headers
      api.interceptors.request.use(async (config) => {
        const token = await this.getCurrentUser()?.getIdToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      }, (error) => {
        return Promise.reject(error);
      });
  
      // Handle 401 responses
      api.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response?.status === 401) {
            await this.signOut();
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      );
    }
  
    /**
     * Get current Firebase user
     */
    getCurrentUser() {
      return auth.currentUser;
    }
  
    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback) {
      return onAuthStateChanged(auth, callback);
    }
  
    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        
        // Get additional user data from backend
        const { data } = await api.get('/api/auth/me');
        
        return {
          user: userCredential.user,
          token,
          profile: data.user
        };
      } catch (error) {
        console.error('Sign In Error:', error);
        throw this.handleAuthError(error);
      }
    }
  
    /**
     * Register new user
     */
    async register(email, password, displayName) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        if (displayName) {
          await this.updateProfile({ displayName });
        }
        
        // Send verification email
        await sendEmailVerification(userCredential.user);
        
        return userCredential.user;
      } catch (error) {
        console.error('Registration Error:', error);
        throw this.handleAuthError(error);
      }
    }
  
    /**
     * Sign out user
     */
    async signOut() {
      try {
        await firebaseSignOut(auth);
        // Clear any local storage or state here
        localStorage.removeItem('user');
      } catch (error) {
        console.error('Sign Out Error:', error);
        throw this.handleAuthError(error);
      }
    }
  
    /**
     * Send password reset email
     */
    async resetPassword(email) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        console.error('Password Reset Error:', error);
        throw this.handleAuthError(error);
      }
    }
  
    /**
     * Update user profile
     */
    async updateProfile(profileData) {
      try {
        const user = this.getCurrentUser();
        if (!user) throw new Error('No user logged in');
  
        await api.put('/api/auth/me', profileData);
        
        return await api.get('/api/auth/me');
      } catch (error) {
        console.error('Update Profile Error:', error);
        throw this.handleAuthError(error);
      }
    }
  
    /**
     * Delete user account
     */
    async deleteAccount() {
      try {
        await api.delete('/api/auth/me');
        const user = this.getCurrentUser();
        if (user) {
          await user.delete();
        }
      } catch (error) {
        console.error('Delete Account Error:', error);
        throw this.handleAuthError(error);
      }
    }
  
    /**
     * Standardize error handling
     */
    handleAuthError(error) {
      let message = 'An unexpected error occurred';
      let code = 'auth/unknown';
  
      if (error.code) {
        // Handle Firebase Auth errors
        switch (error.code) {
          case 'auth/user-not-found':
            message = 'No user found with this email';
            break;
          case 'auth/wrong-password':
            message = 'Invalid password';
            break;
          case 'auth/email-already-in-use':
            message = 'Email already registered';
            break;
          case 'auth/weak-password':
            message = 'Password is too weak';
            break;
          case 'auth/invalid-email':
            message = 'Invalid email address';
            break;
          default:
            message = error.message;
            code = error.code;
        }
      } else if (error.response) {
        // Handle API errors
        message = error.response.data.error?.message || error.response.data.message;
        code = error.response.data.error?.code || 'api/error';
      }
  
      return {
        message,
        code,
        originalError: error
      };
    }
  }
  
  export const authService = new AuthService();
  
  // Usage example:
  /*
  import { authService } from '../services/auth.service';
  
  // Sign in
  try {
    const { user, token, profile } = await authService.signIn(email, password);
  } catch (error) {
    console.error(error.message);
  }
  
  // Register
  try {
    const user = await authService.register(email, password, displayName);
  } catch (error) {
    console.error(error.message);
  }
  */