// frontend/public/js/interview-room.js

const API_BASE_URL = 'http://localhost:3000';

class InterviewRoom {
    constructor() {
        console.log('[DEBUG] Initializing interview room');
        this.interviewId = this.getInterviewIdFromUrl();
        this.setupState();
        this.initializeElements();
        this.initialize();
    }

    getInterviewIdFromUrl() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    setupState() {
        this.questions = [];
        this.currentQuestionIndex = -1;
        this.responses = [];
        this.interviewConfig = {
            type: 'technical',
            level: 'mid',
            duration: 45
        };
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.startTime = null;
        this.isCompleted = false;
        this.timerInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.wsReconnectDelay = 2000;
    }

    async initialize() {
        try {
            await this.verifyAccess();
            await this.initializeMedia();
            await this.generateQuestions();
            this.initializeWebSocket();
        } catch (error) {
            console.error('[DEBUG] Initialization error:', error);
            this.showError('Failed to initialize interview. Please refresh the page.');
        }
    }

    async verifyAccess() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/interviews/${this.interviewId}/verify-access`);
            
            if (!response.ok) {
                throw new Error('Unauthorized interview access');
            }

            const interviewData = await response.json();
            this.interviewConfig = {
                ...this.interviewConfig,
                type: interviewData.type,
                level: interviewData.level,
                duration: interviewData.duration
            };

            return true;
        } catch (error) {
            console.error('[DEBUG] Access verification failed:', error);
            window.location.href = '/';
            return false;
        }
    }

    async initializeMedia() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            };

            this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (this.elements.userVideo) {
                this.elements.userVideo.srcObject = this.mediaStream;
                await this.elements.userVideo.play();
                this.updateDeviceStatus('camera', true);
                this.updateDeviceStatus('microphone', true);
                this.elements.startButton.disabled = false;
            }
        } catch (error) {
            console.error('[DEBUG] Media initialization error:', error);
            this.showError('Unable to access camera or microphone. Please check your permissions.');
            this.updateDeviceStatus('camera', false);
            this.updateDeviceStatus('microphone', false);
        }
    }

    initializeElements() {
        try {
            this.elements = {
                welcomeModal: document.getElementById('welcomeModal'),
                startButton: document.getElementById('startInterview'),
                userVideo: document.getElementById('userVideo'),
                nextButton: document.getElementById('nextQuestion'),
                chatArea: document.getElementById('chatArea'),
                timer: document.getElementById('timer'),
                completionModal: document.getElementById('completionModal'),
                endButton: document.getElementById('endInterview'),
                toggleVideo: document.getElementById('toggleVideo'),
                toggleAudio: document.getElementById('toggleAudio'),
                cameraStatus: document.getElementById('cameraStatus'),
                micStatus: document.getElementById('micStatus'),
                recordingStatus: document.getElementById('recordingStatus')
            };

            this.validateElements();
            this.attachEventListeners();
        } catch (error) {
            console.error('[DEBUG] Element initialization error:', error);
            this.showError('Failed to initialize interview interface');
        }
    }

    validateElements() {
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                throw new Error(`Required element not found: ${key}`);
            }
        });
    }

    attachEventListeners() {
        this.elements.startButton.addEventListener('click', () => this.startInterview());
        this.elements.nextButton.addEventListener('click', () => this.nextQuestion());
        this.elements.endButton.addEventListener('click', () => this.confirmEndInterview());
        this.elements.toggleVideo.addEventListener('click', () => this.toggleVideoStream());
        this.elements.toggleAudio.addEventListener('click', () => this.toggleAudioStream());

        window.addEventListener('beforeunload', (e) => {
            if (!this.isCompleted && this.startTime) {
                e.preventDefault();
                e.returnValue = 'Interview is still in progress. Are you sure you want to leave?';
            }
        });
    }

    async generateQuestions() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/questions/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: this.interviewConfig.type,
                    level: this.interviewConfig.level,
                    count: 5,
                    interviewId: this.interviewId
                })
            });

            if (!response.ok) throw new Error('Failed to generate questions');
            
            this.questions = await response.json();
        } catch (error) {
            console.error('[DEBUG] Question generation error:', error);
            this.showError('Failed to generate interview questions');
        }
    }

    initializeWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = '3000'; // Backend port
        
        this.ws = new WebSocket(`${protocol}//${host}:${port}`);
        
        this.ws.onopen = () => {
            console.log('[DEBUG] WebSocket connected');
            this.reconnectAttempts = 0;
            this.sendWebSocketMessage({
                type: 'join',
                interviewId: this.interviewId,
                role: 'candidate'
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('[DEBUG] WebSocket message error:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('[DEBUG] WebSocket error:', error);
            this.attemptReconnect();
        };

        this.ws.onclose = () => {
            console.log('[DEBUG] WebSocket disconnected');
            this.attemptReconnect();
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.wsReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`[DEBUG] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
            
            setTimeout(() => this.initializeWebSocket(), delay);
        } else {
            this.showError('Connection lost. Please refresh the page.');
        }
    }

    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'interview_start':
                console.log('[DEBUG] Interview started:', data);
                break;
            case 'response_recorded':
                this.handleResponseRecorded(data);
                break;
            case 'interview_completed':
                this.handleInterviewCompletion(data);
                break;
            default:
                console.log('[DEBUG] Unknown message type:', data.type);
        }
    }

    startInterview() {
        this.elements.welcomeModal.style.display = 'none';
        this.startTime = new Date();
        this.startTimer();
        this.nextQuestion();
        this.startRecording();

        this.sendWebSocketMessage({
            type: 'interview_start',
            timestamp: new Date().toISOString()
        });
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex >= this.questions.length) {
            this.completeInterview();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        this.addQuestionToChat(question);

        this.sendWebSocketMessage({
            type: 'question_change',
            questionNumber: this.currentQuestionIndex + 1,
            timestamp: new Date().toISOString()
        });
    }

    async startRecording() {
        try {
            this.mediaRecorder = new MediaRecorder(this.mediaStream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.processAudioResponse(audioBlob);
            };

            this.mediaRecorder.start(1000);
            this.updateRecordingStatus(true);
        } catch (error) {
            console.error('[DEBUG] Recording error:', error);
            this.showError('Failed to start recording');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.startTime) return;
            
            const now = new Date();
            const diff = now - this.startTime;
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            this.elements.timer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (minutes >= this.interviewConfig.duration) {
                this.completeInterview();
            }
        }, 1000);
    }

    addQuestionToChat(question) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'chat-message bg-blue-100 p-4 rounded-lg mb-4';
        questionDiv.innerHTML = `
            <p class="font-semibold">Question ${this.currentQuestionIndex + 1}:</p>
            <p>${question.text}</p>
        `;
        this.elements.chatArea.appendChild(questionDiv);
        this.elements.chatArea.scrollTop = this.elements.chatArea.scrollHeight;
    }

    async processAudioResponse(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('interviewId', this.interviewId);
            formData.append('questionIndex', this.currentQuestionIndex);

            const response = await fetch(`${API_BASE_URL}/api/analysis/process-response`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to process response');
            
            const result = await response.json();
            this.responses.push(result);
        } catch (error) {
            console.error('[DEBUG] Response processing error:', error);
            this.showError('Failed to process response');
        }
    }

    toggleVideoStream() {
        const videoTrack = this.mediaStream?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            this.elements.toggleVideo.innerHTML = videoTrack.enabled ? 
                '<i class="fas fa-video"></i>' : 
                '<i class="fas fa-video-slash"></i>';
        }
    }

    toggleAudioStream() {
        const audioTrack = this.mediaStream?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.elements.toggleAudio.innerHTML = audioTrack.enabled ? 
                '<i class="fas fa-microphone"></i>' : 
                '<i class="fas fa-microphone-slash"></i>';
        }
    }

    updateDeviceStatus(device, isWorking) {
        const element = device === 'camera' ? 
            this.elements.cameraStatus : 
            this.elements.micStatus;
        
        if (element) {
            element.className = `fas fa-circle ${isWorking ? 'text-green-500' : 'text-red-500'}`;
        }
    }

    updateRecordingStatus(isRecording) {
        if (this.elements.recordingStatus) {
            this.elements.recordingStatus.innerHTML = isRecording ?
                '<i class="fas fa-circle text-red-500 animate-pulse"></i> Recording in progress' :
                '<i class="fas fa-circle text-gray-500"></i> Recording stopped';
        }
    }

    async completeInterview() {
        try {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            const endTime = new Date();
            const duration = Math.floor((endTime - this.startTime) / 1000);

            const response = await fetch(`${API_BASE_URL}/api/interviews/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interviewId: this.interviewId,
                    questions: this.questions,
                    responses: this.responses,
                    duration,
                    completedAt: endTime.toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to complete interview');
            }

            this.isCompleted = true;
            this.cleanup();
            this.showCompletionScreen();

            this.sendWebSocketMessage({
                type: 'interview_end',
                timestamp: endTime.toISOString()
            });
        } catch (error) {
            console.error('[DEBUG] Error completing interview:', error);
            this.showError('Failed to complete interview');
        }
    }

    cleanup() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }

    showCompletionScreen() {
        if (this.elements.completionModal) {
            this.elements.completionModal.style.display = 'flex';
        }
    }
    confirmEndInterview() {
        if (confirm('Are you sure you want to end the interview? This action cannot be undone.')) {
            this.completeInterview();
        }
    }

    sendWebSocketMessage(data) {
        try {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    ...data,
                    interviewId: this.interviewId
                }));
            } else {
                console.warn('[DEBUG] WebSocket is not connected');
            }
        } catch (error) {
            console.error('[DEBUG] Error sending WebSocket message:', error);
        }
    }

    handleResponseRecorded(data) {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'chat-message bg-green-100 p-4 rounded-lg mb-4';
        responseDiv.innerHTML = `
            <p class="font-semibold">Response Recorded</p>
            <p>Your response has been recorded successfully.</p>
        `;
        this.elements.chatArea.appendChild(responseDiv);
        this.elements.chatArea.scrollTop = this.elements.chatArea.scrollHeight;
    }

    handleInterviewCompletion(data) {
        this.isCompleted = true;
        this.cleanup();
        this.showCompletionScreen();
    }

    showError(message, duration = 5000) {
        console.error('[DEBUG] Error:', message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.classList.add('fade-out');
            setTimeout(() => errorDiv.remove(), 300);
        }, duration);
    }

    showSuccess(message, duration = 3000) {
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.classList.add('fade-out');
            setTimeout(() => successDiv.remove(), 300);
        }, duration);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    static checkBrowserCompatibility() {
        const requirements = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            webSocket: 'WebSocket' in window,
            mediaRecorder: 'MediaRecorder' in window
        };

        const unsupported = Object.entries(requirements)
            .filter(([, supported]) => !supported)
            .map(([feature]) => feature);

        return {
            supported: unsupported.length === 0,
            unsupported
        };
    }
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check browser compatibility first
    const compatibility = InterviewRoom.checkBrowserCompatibility();
    if (!compatibility.supported) {
        alert(`Your browser doesn't support the following required features: ${compatibility.unsupported.join(', ')}`);
        return;
    }

    // Initialize interview room
    try {
        console.log('[DEBUG] Starting interview room initialization');
        window.interviewRoom = new InterviewRoom();
    } catch (error) {
        console.error('[DEBUG] Failed to initialize interview room:', error);
        alert('Failed to initialize interview room. Please refresh the page or try again later.');
    }
});