// /frontend/public/js/app.js
// TalentSync Interview Management Platform - Main Application Logic

class AppManager {
    constructor() {
        console.log('[AppManager] Initializing');
        this.initializeFirebase();
        this.bindEventListeners();
    }

    bindEventListeners() {
        // Use multiple event binding strategies
        const setupSaveScheduleButton = () => {
            console.log('[AppManager] Setting up Save Schedule Button');
            
            // Multiple selection methods
            const saveScheduleBtn = 
                document.getElementById('saveSchedule') || 
                document.querySelector('button#saveSchedule') || 
                Array.from(document.getElementsByTagName('button'))
                    .find(btn => btn.textContent.trim() === 'Schedule Interview');
    
            if (!saveScheduleBtn) {
                console.error('[AppManager] CRITICAL: Save Schedule Button NOT FOUND!');
                
                // Detailed DOM investigation
                console.log('[AppManager] All Buttons:', 
                    Array.from(document.getElementsByTagName('button'))
                        .map(btn => ({
                            id: btn.id, 
                            text: btn.textContent.trim(), 
                            classes: btn.className
                        }))
                );
                return;
            }
    
            console.log('[AppManager] Save Schedule Button Found:', {
                id: saveScheduleBtn.id,
                text: saveScheduleBtn.textContent.trim(),
                classes: saveScheduleBtn.className
            });
    
            // Remove any existing listeners first
            const newBtn = saveScheduleBtn.cloneNode(true);
            saveScheduleBtn.parentNode.replaceChild(newBtn, saveScheduleBtn);
    
            // Multiple binding methods
            ['click', 'mouseup', 'touchend'].forEach(eventType => {
                newBtn.addEventListener(eventType, (event) => {
                    console.log(`[AppManager] Save Schedule Button - ${eventType} Event`, {
                        event: event,
                        target: event.target,
                        currentTarget: event.currentTarget,
                        type: event.type
                    });
                    
                    // Prevent default and stop propagation
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Ensure context is correct
                    this.scheduleInterview.call(this);
                }, { capture: true });
            });
    
            // Inline onclick as fallback
            newBtn.onclick = (event) => {
                console.log('[AppManager] Inline onclick triggered', event);
                event.preventDefault();
                event.stopPropagation();
                this.scheduleInterview.call(this);
            };
        };
    
        // Use multiple event listeners to ensure binding
        document.addEventListener('DOMContentLoaded', setupSaveScheduleButton);
        window.addEventListener('load', setupSaveScheduleButton);
        
        // Fallback global handler
        document.body.addEventListener('click', (event) => {
            if (event.target.id === 'saveSchedule' || 
                event.target.closest('#saveSchedule') || 
                (event.target.tagName === 'BUTTON' && 
                 event.target.textContent.trim() === 'Schedule Interview')) {
                
                console.log('[AppManager] Global Click Handler Detected', {
                    target: event.target,
                    text: event.target.textContent.trim()
                });
                
                event.preventDefault();
                event.stopPropagation();
                this.scheduleInterview.call(this);
            }
        }, { capture: true });
    }

    async initializeFirebase() {
        try {
            const response = await fetch('/api/auth/firebase-config');
            
            if (!response.ok) {
                throw new Error('Failed to fetch Firebase configuration');
            }
            
            const firebaseConfig = await response.json();
            console.log('[AppManager] Firebase Config Loaded');

            // Initialize Firebase if not already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log('[AppManager] Firebase initialized successfully');
            }

            // Set up authentication state observer
            firebase.auth().onAuthStateChanged((user) => {
                // Remove loading overlay
                const overlay = document.getElementById('n-loadingOverlay');
                if (overlay) {
                    overlay.remove();
                }

                if (user) {
                    console.log('[AppManager] User signed in:', user.email);
                    document.body.classList.add('logged-in');
                    this.initializeDashboard();
                } else {
                    console.log('[AppManager] No user signed in');
                    document.body.classList.remove('logged-in');
                    
                    // Redirect to login if not on login page or interview room
                    const currentPath = window.location.pathname;
                    if (!currentPath.includes('/login.html') && !currentPath.startsWith('/interview/')) {
                        window.location.href = '/login.html';
                    }
                }
            });

        } catch (error) {
            console.error('[AppManager] Firebase setup error:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    async initializeDashboard() {
        try {
            console.log('[AppManager] Initializing Dashboard');
            
            // Additional debugging for API request
            console.log('[AppManager] Fetching interviews from /api/interviews');
            const token = await this.getAuthToken();
            console.log('[AppManager] Current Auth Token:', token ? 'Token exists' : 'No token');

            const interviews = await this.apiRequest('/api/interviews');
            
            console.log('[AppManager] Interviews received:', interviews);
            
            if (interviews && interviews.length) {
                this.renderInterviews(interviews);
            } else {
                console.log('[AppManager] No interviews found');
                const interviewsList = document.getElementById('interviewsList');
                if (interviewsList) {
                    interviewsList.innerHTML = '<tr><td colspan="4" class="text-center">No interviews scheduled</td></tr>';
                }
            }
        } catch (error) {
            console.error('[AppManager] Dashboard initialization error:', error);
            
            // More detailed error logging
            console.error('[AppManager] Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            this.showError('Failed to load interviews: ' + error.message);
        }
    }

    async scheduleInterview() {
        console.log('[AppManager] Scheduling Interview - Start');
        
        // Get form elements
        const name = document.getElementById('candidateName');
        const email = document.getElementById('candidateEmail');
        const date = document.getElementById('interviewDate');
        const time = document.getElementById('interviewTime');
        
        // Comprehensive null checks
        if (!name || !email || !date || !time) {
            console.error('[AppManager] One or more form elements are missing:', {
                name: !!name,
                email: !!email,
                date: !!date,
                time: !!time
            });
            this.showError('Form elements are missing. Please check the form configuration.');
            return;
        }
    
        // Reset validation states
        [name, email, date, time].forEach(input => {
            input.classList.remove('is-invalid');
            console.log(`[AppManager] Resetting validation for ${input.id}`);
        });
        
        let isValid = true;
    
        // Validation checks with detailed logging
        if (!name.value.trim()) {
            isValid = false;
            console.log('[AppManager] Name validation failed');
            this.showFieldError(name, 'Candidate name is required');
        }
    
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value.trim() || !emailRegex.test(email.value)) {
            isValid = false;
            console.log('[AppManager] Email validation failed');
            this.showFieldError(email, 'Valid email is required');
        }
    
        if (!date.value || !time.value) {
            isValid = false;
            console.log('[AppManager] Date/Time validation failed');
            this.showFieldError(!date.value ? date : time, 'Date and time are required');
        } else {
            const combinedDateTime = new Date(`${date.value}T${time.value}`);
            if (combinedDateTime <= new Date()) {
                isValid = false;
                console.log('[AppManager] Future date validation failed');
                this.showFieldError(date, 'Interview must be scheduled in the future');
            }
        }
    
        // Stop if validation fails
        if (!isValid) {
            console.log('[AppManager] Validation failed, stopping schedule');
            return;
        }
    
        // Detailed form data logging
        console.log('[AppManager] Form Data:', {
            candidateName: name.value.trim(),
            candidateEmail: email.value.trim(),
            date: date.value,
            time: time.value
        });
    
        try {
            console.log('[AppManager] Attempting to schedule interview');
            
            // Prepare interview data
            const interviewData = {
                candidateName: name.value.trim(),
                candidateEmail: email.value.trim(),
                date: new Date(`${date.value}T${time.value}`).toISOString(),
                type: 'technical',
                level: 'mid',
                duration: 45
            };
    
            // API Request with detailed error handling
            const response = await this.apiRequest('/api/interviews/schedule', 'POST', interviewData);
    
            console.log('[AppManager] Schedule Response:', response);
    
            if (response && response.id) {
                // Close modal and reset form
                const modalElement = document.getElementById('scheduleModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                    modal.hide();
                }
    
                // Reset form
                document.getElementById('scheduleForm').reset();
                
                // Show success notification
                this.showNotification('Interview scheduled successfully', 'success');
                
                // Refresh interviews list
                await this.initializeDashboard();
            } else {
                console.error('[AppManager] Invalid schedule response', response);
                this.showError('Failed to schedule interview. Invalid response received.');
            }
        } catch (error) {
            console.error('[AppManager] Schedule Interview Error:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            this.showError(error.message || 'Failed to schedule interview');
        }
    }

    async apiRequest(url, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            // Add authentication token
            const token = await this.getAuthToken();
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            // Add request body if data is provided
            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'API request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('[AppManager] API Request Error:', error);
            throw error;
        }
    }

    async getAuthToken() {
        try {
            const user = firebase.auth().currentUser;
            return user ? await user.getIdToken() : null;
        } catch (error) {
            console.error('[AppManager] Token Retrieval Error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await firebase.auth().signOut();
            window.location.href = '/login.html';
        } catch (error) {
            console.error('[AppManager] Logout Error:', error);
            this.showError('Failed to log out');
        }
    }

    renderInterviews(interviews) {
        const interviewsList = document.getElementById('interviewsList');
        if (!interviewsList) return;

        if (!interviews.length) {
            interviewsList.innerHTML = '<tr><td colspan="4" class="text-center">No interviews scheduled</td></tr>';
            return;
        }

        interviewsList.innerHTML = interviews.map(interview => {
            const date = new Date(interview.date);
            const isPast = date < new Date();

            return `
                <tr${isPast ? ' class="table-secondary"' : ''}>
                    <td>${interview.candidateName}</td>
                    <td>${date.toLocaleString()}</td>
                    <td>
                        <span class="badge bg-${this.getStatusBadgeClass(interview.status)}">
                            ${interview.status}
                        </span>
                    </td>
                    <td>
                        ${this.getInterviewActions(interview, isPast)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusBadgeClass(status) {
        const statusClasses = {
            'scheduled': 'primary',
            'completed': 'success',
            'cancelled': 'danger',
            'invited': 'info'
        };
        return statusClasses[status] || 'secondary';
    }

    getInterviewActions(interview, isPast) {
        if (isPast || interview.status === 'cancelled' || interview.status === 'completed') {
            return '';
        }

        return `
            <button onclick="window.appManager.sendInterviewInvite('${interview.id}')" 
                    class="btn btn-sm btn-primary me-2">
                    <i class="bi bi-envelope"></i> Send Invite
            </button>
            <button onclick="window.appManager.cancelInterview('${interview.id}')" 
                    class="btn btn-sm btn-danger">
                    <i class="bi bi-x-circle"></i> Cancel
            </button>
        `;
    }

    async sendInterviewInvite(interviewId) {
        try {
            await this.apiRequest(`/api/interviews/${interviewId}/send-invite`, 'POST');
            this.showNotification('Interview invitation sent successfully', 'success');
            await this.initializeDashboard();
        } catch (error) {
            console.error('[AppManager] Send Invite Error:', error);
            this.showError('Failed to send interview invitation');
        }
    }

    async cancelInterview(interviewId) {
        if (!confirm('Are you sure you want to cancel this interview?')) return;

        try {
            await this.apiRequest(`/api/interviews/${interviewId}/cancel`, 'PATCH');
            this.showNotification('Interview cancelled successfully', 'success');
            await this.initializeDashboard();
        } catch (error) {
            console.error('[AppManager] Cancel Interview Error:', error);
            this.showError('Failed to cancel interview');
        }
    }

    showFieldError(element, message) {
        element.classList.add('is-invalid');
        const feedback = element.nextElementSibling || document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;
        if (!element.nextElementSibling) {
            element.parentNode.appendChild(feedback);
        }
    }

    showError(message, duration = 5000) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3 z-3';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, duration);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3 z-3`;
        notificationDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(notificationDiv);
        
        setTimeout(() => {
            document.body.removeChild(notificationDiv);
        }, duration);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Fully Loaded');
    
    // Fallback global click handler
    document.body.addEventListener('click', (event) => {
        console.log('Global click detected:', event.target);
    });
    const btn = document.getElementById('saveSchedule');
    if (btn) {
        console.log('[AppManager] Manually triggering save schedule button setup');
        btn.dispatchEvent(new Event('click'));
    }
});
// Initialization for dashboard/app pages
document.addEventListener('DOMContentLoaded', () => {
    console.log('[AppManager] Initializing application');
    
    // Check if it's an interview room
    if (window.location.pathname.startsWith('/interview/')) {
        console.log('[AppManager] Interview room detected, skipping dashboard initialization');
        window.isInterviewRoom = true;
        return;
    }

    // Only initialize AppManager for dashboard
    try {
        console.log('[AppManager] Initializing dashboard');
        const appManager = new AppManager();
        window.appManager = appManager;
    } catch (error) {
        console.error('[AppManager] Initialization failed:', error);
    }
});