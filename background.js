// Background service worker for Auto Filler
class AutoFillerBackground {
    constructor() {
        this.setupMessageHandlers();
        this.setupTabHandlers();
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
                    // Forward to popup if open
                    this.forwardToPopup(message.actionData);
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
        try {
            // Inject content script if needed
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });
        } catch (error) {
            // Content script might already be injected
            console.log('Content script injection skipped:', error.message);
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
}

// Initialize background service
new AutoFillerBackground();
