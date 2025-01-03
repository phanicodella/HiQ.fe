// /frontend/public/js/app.js
// TalentSync Interview Management Platform - Main Application Logic

class AppManager {
    constructor() {
        this.initializeEventListeners();
        this.setupFirebase();
    }

    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Schedule Interview Modal Trigger
            const scheduleBtn = document.getElementById('scheduleBtn');
            if (scheduleBtn) {
                scheduleBtn.addEventListener('click', () => {
                    const modal = new bootstrap.Modal(document.getElementById('scheduleModal'));
                    modal.show();
                });
            }

            // Save Schedule Button
            const saveScheduleBtn = document.getElementById('saveSchedule');
            if (saveScheduleBtn) {
                saveScheduleBtn.addEventListener('click', () => this.scheduleInterview());
            }

            // Logout Button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', this.logout.bind(this));
            }
        });
    }

    async setupFirebase() {
        try {
            // Fetch Firebase configuration from backend
            const response = await fetch('/api/auth/firebase-config');
            
            if (!response.ok) {
                throw new Error('Failed to fetch Firebase configuration');
            }
            
            const firebaseConfig = await response.json();

            // Initialize Firebase if not already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log('Firebase initialized successfully');
            }

            // Set up authentication state observer
            firebase.auth().onAuthStateChanged((user) => {
                // Remove loading overlay
                const overlay = document.getElementById('n-loadingOverlay');
                if (overlay) {
                    overlay.remove();
                }

                if (user) {
                    console.log('User is signed in:', user.email);
                    document.body.classList.add('logged-in');
                    this.initializeDashboard();
                } else {
                    console.log('No user signed in');
                    document.body.classList.remove('logged-in');
                    
                    // Redirect to login if not on login page
                    const currentPath = window.location.pathname;
                    if (!currentPath.includes('/login.html') && !currentPath.startsWith('/interview/')) {
                        window.location.href = '/login.html';
                    }
                }
            });

        } catch (error) {
            console.error('Firebase setup error:', error);
            this.showError('Failed to initialize application');
        }
    }

    async initializeDashboard() {
        try {
            // Fetch interviews for the logged-in user
            const interviews = await this.apiRequest('/api/interviews');
            this.renderInterviews(interviews);
        } catch (error) {
            this.showError('Failed to load interviews');
        }
    }

    async scheduleInterview() {
        // Validate and collect form inputs
        const name = document.getElementById('candidateName');
        const email = document.getElementById('candidateEmail');
        const date = document.getElementById('interviewDate');
        const time = document.getElementById('interviewTime');
        
        // Reset previous validation states
        [name, email, date, time].forEach(input => input.classList.remove('is-invalid'));
        
        let isValid = true;

        // Name validation
        if (!name.value.trim()) {
            isValid = false;
            this.showFieldError(name, 'Candidate name is required');
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value.trim() || !emailRegex.test(email.value)) {
            isValid = false;
            this.showFieldError(email, 'Valid email is required');
        }

        // Date and time validation
        if (!date.value || !time.value) {
            isValid = false;
            this.showFieldError(!date.value ? date : time, 'Date and time are required');
        } else {
            const combinedDateTime = new Date(`${date.value}T${time.value}`);
            if (combinedDateTime <= new Date()) {
                isValid = false;
                this.showFieldError(date, 'Interview must be scheduled in the future');
            }
        }

        if (!isValid) return;

        try {
            // Send interview scheduling request
            const response = await this.apiRequest('/api/interviews/schedule', 'POST', {
                candidateName: name.value.trim(),
                candidateEmail: email.value.trim(),
                date: new Date(`${date.value}T${time.value}`).toISOString(),
                type: 'technical',
                level: 'mid',
                duration: 45
            });

            if (response.id) {
                // Close modal and reset form
                const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleModal'));
                modal.hide();
                document.getElementById('scheduleForm').reset();
                
                // Show success notification
                this.showNotification('Interview scheduled successfully', 'success');
                
                // Refresh interviews list
                await this.initializeDashboard();
            }
        } catch (error) {
            this.showError(error.message || 'Failed to schedule interview');
        }
    }

    async sendInterviewInvite(interviewId) {
        try {
            const response = await this.apiRequest(`/api/interviews/${interviewId}/send-invite`, 'POST');
            this.showNotification('Interview invitation sent successfully', 'success');
            await this.initializeDashboard();
        } catch (error) {
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
            this.showError('Failed to cancel interview');
        }
    }

    renderInterviews(interviews) {
        const interviewsList = document.getElementById('interviewsList');
        if (!interviewsList) return;

        // Handle empty state
        if (!interviews.length) {
            interviewsList.innerHTML = '<tr><td colspan="4" class="text-center">No interviews scheduled</td></tr>';
            return;
        }

        // Render interviews
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

    async apiRequest(url, method = 'GET', data = null) {
        try {
            // Ensure Firebase is initialized
            if (!firebase.apps.length) {
                await this.setupFirebase();
            }

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
            console.error('API request error:', error);
            throw error;
        }
    }

    async getAuthToken() {
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                return await user.getIdToken();
            }
            return null;
        } catch (error) {
            console.error('Token retrieval error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await firebase.auth().signOut();
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('Failed to log out');
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
        errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3';
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
        notificationDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
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

// Initialization for dashboard/app pages
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] Initializing app, pathname:', window.location.pathname);
    
    // Check if it's an interview room
    if (window.location.pathname.startsWith('/interview/')) {
        console.log('[DEBUG] Interview room detected, skipping dashboard initialization');
        window.isInterviewRoom = true;
        return; // Exit early for interview rooms
    }

    // Only initialize AppManager for dashboard
    try {
        console.log('[DEBUG] Initializing dashboard');
        const appManager = new AppManager();
        window.appManager = appManager;
    } catch (error) {
        console.error('[DEBUG] Failed to initialize AppManager:', error);
    }
});