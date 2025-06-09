// Background service worker for Auto Filler
class AutoFillerBackground {
    constructor() {
        this.isRecording = false;
        this.currentScenario = [];
        this.playbackState = {
            isPlaying: false,
            scenario: [],
            currentIndex: 0,
            playbackSpeed: 'instant',
            tabId: null
        };
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
                    sendResponse({ success: true });
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
                    
                case 'playScenario':
                    await this.startScenarioPlayback(message.scenario, message.playbackSpeed, message.tabId);
                    sendResponse({ success: true });
                    break;
                    
                case 'playbackComplete':
                    // Content script finished playing actions on current page
                    await this.continuePlayback();
                    sendResponse({ success: true });
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
            
            // If playback is in progress and this tab completed navigation, continue playback
            if (this.playbackState.isPlaying && this.playbackState.tabId === tabId) {
                console.log('Page loaded during playback, continuing...');
                
                // Adjust delay based on playback speed - increased for normal speed
                const { playbackSpeed } = this.playbackState;
                const delay = playbackSpeed === 'instant' ? 200 : 
                             playbackSpeed === 'fast' ? 500 : 1500; // Increased from 1000 to 1500
                
                console.log(`Using ${delay}ms delay for speed: ${playbackSpeed}`);
                
                // Small delay to ensure page is fully ready
                setTimeout(() => {
                    this.continuePlayback();
                }, delay);
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
    
    async startScenarioPlayback(scenario, playbackSpeed, tabId) {
        console.log('Starting cross-page scenario playback:', scenario.length, 'actions');
        
        this.playbackState = {
            isPlaying: true,
            scenario: [...scenario],
            currentIndex: 0,
            playbackSpeed: playbackSpeed || 'instant',
            tabId: tabId
        };
        
        // Start playback
        await this.continuePlayback();
    }
    
    async continuePlayback() {
        if (!this.playbackState.isPlaying) {
            console.log('Playback not active, stopping');
            return;
        }
        
        const { scenario, currentIndex, playbackSpeed, tabId } = this.playbackState;
        
        if (currentIndex >= scenario.length) {
            console.log('Scenario playback completed');
            this.playbackState.isPlaying = false;
            
            // Notify popup that playback is complete
            chrome.runtime.sendMessage({
                type: 'playbackComplete'
            }).catch(() => {});
            
            return;
        }
        
        // Store current URL to detect navigation
        let currentUrl = '';
        try {
            const tab = await chrome.tabs.get(tabId);
            currentUrl = tab.url;
        } catch (error) {
            console.error('Error getting current tab URL:', error);
        }
        
        // Get next action to execute
        const action = scenario[currentIndex];
        console.log(`Executing action ${currentIndex + 1}/${scenario.length}:`, action.type);

        try {
            // Send single action to content script - don't await if it might cause navigation
            chrome.tabs.sendMessage(tabId, {
                action: 'playActionsOnPage',
                actions: [action],
                playbackSpeed: playbackSpeed
            }).catch(error => {
                // Ignore errors from navigation-related message channel closures
                if (error.message.includes('message channel closed') || 
                    error.message.includes('receiving end does not exist')) {
                    console.log('Message channel closed (likely due to navigation) - this is expected');
                } else {
                    console.error('Unexpected content script error:', error);
                }
            });
            
            console.log('Action sent to content script');
            
            // Update current index immediately
            this.playbackState.currentIndex = currentIndex + 1;

            // Check if navigation occurred by comparing URLs after a short delay
            // Try multiple times to catch navigation that might take a moment
            let navigationDetected = false;
            let attempts = 0;
            
            // Adjust timing based on playback speed - give much more time for normal speed
            const maxAttempts = playbackSpeed === 'instant' ? 20 : (playbackSpeed === 'fast' ? 25 : 50);
            const checkInterval = playbackSpeed === 'instant' ? 50 : (playbackSpeed === 'fast' ? 75 : 200);
            const initialDelay = playbackSpeed === 'instant' ? 25 : (playbackSpeed === 'fast' ? 40 : 200);
            
            console.log(`Navigation detection config - Speed: ${playbackSpeed}, MaxAttempts: ${maxAttempts}, Interval: ${checkInterval}ms, InitialDelay: ${initialDelay}ms`);
            
            const checkNavigation = async () => {
                attempts++;
                try {
                    const updatedTab = await chrome.tabs.get(tabId);
                    console.log(`Navigation check ${attempts}/${maxAttempts} - Before: ${currentUrl}, After: ${updatedTab.url}, Loading: ${updatedTab.status}`);
                    
                    // Check if URL changed (including temporary states like about:blank)
                    const urlChanged = updatedTab.url !== currentUrl;
                    const isLoading = updatedTab.status === 'loading';
                    const isNavigating = urlChanged || isLoading;
                    
                    if (isNavigating && !navigationDetected) {
                        console.log('Navigation detected! URL changed or page is loading. Waiting for completion...');
                        navigationDetected = true;
                        // Navigation occurred, onTabReady will continue playback when page loads
                        return;
                    }
                    
                    if (attempts < maxAttempts && !navigationDetected) {
                        // Try again after interval
                        setTimeout(checkNavigation, checkInterval);
                    } else if (!navigationDetected) {
                        console.log('No navigation detected after', maxAttempts, 'attempts, continuing with next action');
                        // No navigation, continue with next action
                        this.continuePlayback();
                    }
                } catch (error) {
                    console.error('Error checking navigation:', error);
                    if (attempts >= maxAttempts) {
                        // Continue anyway after max attempts
                        setTimeout(() => {
                            this.continuePlayback();
                        }, 500);
                    }
                }
            };
            
            // Start checking after initial delay
            setTimeout(checkNavigation, initialDelay);
            
        } catch (error) {
            console.error('Error during playback:', error);
            
            // Try to continue playback anyway
            this.playbackState.currentIndex = currentIndex + 1;
            setTimeout(() => {
                this.continuePlayback();
            }, 1000);
        }
    }
}

// Initialize background service
new AutoFillerBackground();
