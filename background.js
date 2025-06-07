// Background service worker for Auto Filler
class AutoFillerBackground {
    constructor() {
        this.isRecording = false;
        this.currentScenario = [];
        this.setupMessageHandlers();
        this.setupTabHandlers();
        this.loadRecordingState();
    }
    
    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
    }
    
    setupTabHandlers() {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.onTabReady(tabId, tab);
            }
        });
    }
      async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'getTabInfo':
                    const tab = await chrome.tabs.get(sender.tab.id);
                    sendResponse({ tab });
                    break;
                    
                case 'logAction':
                    console.log('Action recorded:', message.actionData);
                    // Store action in background
                    this.currentScenario.push(message.actionData);
                    await this.saveRecordingState();
                    // Forward to popup if open
                    this.forwardToPopup(message.actionData);
                    break;
                    
                case 'startRecording':
                    this.isRecording = true;
                    this.currentScenario = [];
                    await this.saveRecordingState();
                    sendResponse({ success: true });
                    break;
                    
                case 'stopRecording':
                    this.isRecording = false;
                    await this.saveRecordingState();
                    sendResponse({ 
                        success: true, 
                        scenario: [...this.currentScenario] 
                    });
                    break;
                    
                case 'getRecordingState':
                    sendResponse({
                        isRecording: this.isRecording,
                        scenario: [...this.currentScenario]
                    });
                    break;
                    
                default:
                    console.log('Unknown action:', message.action);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }
      async onTabReady(tabId, tab) {
        // Only inject content script on regular web pages
        if (tab.url && 
            !tab.url.startsWith('chrome://') && 
            !tab.url.startsWith('chrome-extension://') &&
            !tab.url.startsWith('edge://') &&
            !tab.url.startsWith('about:') &&
            !tab.url.startsWith('moz-extension://')) {
            
            try {
                // Check if content script is already injected
                await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            } catch (error) {
                // Content script not loaded, inject it
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        files: ['content.js']
                    });
                    console.log('Content script injected for tab:', tabId);
                } catch (injectionError) {
                    console.log('Content script injection failed:', injectionError.message);
                }
            }
        }
    }
    
    forwardToPopup(actionData) {
        // Try to send message to popup
        chrome.runtime.sendMessage({
            type: 'actionRecorded',
            action: actionData
        }).catch(() => {
            // Popup not open, ignore
        });
    }
    
    async loadRecordingState() {
        try {
            const result = await chrome.storage.local.get(['recordingState']);
            if (result.recordingState) {
                this.isRecording = result.recordingState.isRecording || false;
                this.currentScenario = result.recordingState.scenario || [];
            }
        } catch (error) {
            console.error('Error loading recording state:', error);
        }
    }
    
    async saveRecordingState() {
        try {
            await chrome.storage.local.set({
                recordingState: {
                    isRecording: this.isRecording,
                    scenario: this.currentScenario,
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            console.error('Error saving recording state:', error);
        }
    }
}

// Initialize background service
new AutoFillerBackground();
