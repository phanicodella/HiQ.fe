// frontend/src/services/auth.service.js
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
 } from 'firebase/auth';
 import { initializeApp } from 'firebase/app';
 import api from './api';
 
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
    api.interceptors.request.use(async (config) => {
      const token = await this.getCurrentUser()?.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => {
      return Promise.reject(error);
    });
 
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
 
  getCurrentUser() {
    return auth.currentUser;
  }
 
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
 
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
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
 
  async registerWithToken(email, password, displayName, token) {
    try {
      const validateResponse = await api.post('/api/auth/validate-token', { token });
      
      if (validateResponse.data.email !== email) {
        throw new Error('Email does not match registration token');
      }
 
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (firebaseError) {
        console.error('Firebase registration error:', firebaseError);
        if (firebaseError.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Please try signing in instead.');
        } else if (firebaseError.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        } else if (firebaseError.code === 'auth/operation-not-allowed') {
          throw new Error('Email/password registration is not enabled. Please contact support.');
        } else if (firebaseError.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please use a stronger password.');
        }
        throw firebaseError;
      }
 
      if (displayName && userCredential.user) {
        try {
          await updateProfile(userCredential.user, { displayName });
        } catch (profileError) {
          console.error('Profile update error:', profileError);
        }
      }
 
      try {
        await api.post('/api/auth/complete-registration', {
          token,
          uid: userCredential.user.uid
        });
      } catch (completeError) {
        console.error('Error completing registration:', completeError);
        try {
          await userCredential.user.delete();
        } catch (deleteError) {
          console.error('Error deleting incomplete user:', deleteError);
        }
        throw new Error('Failed to complete registration process');
      }
 
      return userCredential.user;
    } catch (error) {
      console.error('Registration Error:', error);
      if (error.response?.status === 404) {
        throw new Error('Invalid or expired registration token');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Invalid registration data');
      }
      throw new Error(error.message || 'Failed to create account. Please try again.');
    }
  }
 
  async signOut() {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw this.handleAuthError(error);
    }
  }
 
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password Reset Error:', error);
      throw this.handleAuthError(error);
    }
  }
 
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
 
  handleAuthError(error) {
    let message = 'An unexpected error occurred';
    let code = 'auth/unknown';
 
    if (error.code) {
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
        case 'auth/invalid-token':
          message = 'Invalid or expired registration token';
          break;
        case 'auth/token-already-used':
          message = 'This registration link has already been used';
          break;
        default:
          message = error.message;
          code = error.code;
      }
    } else if (error.response) {
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