// Auto Filler Popup Script
class AutoFillerPopup {    constructor() {
        this.currentScenario = [];
        this.isRecording = false;
        this.savedScenarios = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSavedScenarios();
        this.loadRecordingState(); // Load persistent state
    }    initializeElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.playBtn = document.getElementById('playBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.scenarioName = document.getElementById('scenarioName');
        this.actionsList = document.getElementById('actionsList');
        this.scenariosList = document.getElementById('scenariosList');
        this.statusText = document.getElementById('statusText');
    }    setupEventListeners() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.playBtn.addEventListener('click', () => this.playScenario());
        this.saveBtn.addEventListener('click', () => this.saveCurrentScenario());
        this.clearBtn.addEventListener('click', () => this.clearCurrentScenario());
        this.clearAllBtn.addEventListener('click', () => this.clearAllScenarios());
        this.scenarioName.addEventListener('input', () => this.updateButtonStates());
    }    async startRecording() {
        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if tab URL is valid for content script injection
            if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
                this.updateStatus('Error: Cannot record on this page. Try a regular website.');
                return;
            }
            
            // Clear current scenario
            this.currentScenario = [];
            this.updateActionsList();
            
            // Start recording via background script
            await chrome.runtime.sendMessage({ action: 'startRecording' });
            
            // Ensure content script is loaded and send message
            await this.ensureContentScriptAndSendMessage(tab.id, { action: 'startRecording' });
            
            this.isRecording = true;
            this.updateRecordingState();
            this.updateStatus('Recording started - you can close this popup and interact with webpages');
            
            // Listen for recorded actions
            this.setupActionListener();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateStatus('Error: Could not start recording. Try refreshing the page and ensure you\'re on a regular website.');
        }
    }    async stopRecording() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Stop recording via background script
            const response = await chrome.runtime.sendMessage({ action: 'stopRecording' });
            
            // Tell content script to stop recording with error handling
            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' });
            } catch (messageError) {
                console.warn('Could not send stop message to content script:', messageError);
                // Continue anyway as background script has the data
            }
            
            // Get the recorded scenario from background
            if (response.scenario) {
                this.currentScenario = response.scenario;
            }
            
            this.isRecording = false;
            this.updateRecordingState();
            this.updateActionsList();
            this.updateButtonStates();
            
            if (this.currentScenario.length > 0) {
                this.updateStatus(`Recording stopped - ${this.currentScenario.length} actions captured. Enter a name and click Save!`);
            } else {
                this.updateStatus('Recording stopped - no actions captured');
            }
            
        } catch (error) {
            console.error('Error stopping recording:', error);
            this.updateStatus('Error: Could not stop recording');
        }
    }
      async playScenario() {
        if (this.currentScenario.length === 0) return;
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            this.updateStatus('Playing scenario...');
            this.playBtn.disabled = true;
            
            await this.ensureContentScriptAndSendMessage(tab.id, {
                action: 'playScenario',
                scenario: this.currentScenario
            });
            
            this.updateStatus('Scenario playback completed');
            this.playBtn.disabled = false;
            
        } catch (error) {
            console.error('Error playing scenario:', error);
            this.updateStatus('Error: Could not play scenario. Try refreshing the page.');
            this.playBtn.disabled = false;
        }
    }
    
    // Helper method to ensure content script is loaded before sending messages
    async ensureContentScriptAndSendMessage(tabId, message) {
        try {
            // Try to send message first
            await chrome.tabs.sendMessage(tabId, message);
        } catch (error) {
            if (error.message.includes('Could not establish connection') || 
                error.message.includes('Receiving end does not exist')) {
                
                // Content script not loaded, inject it
                console.log('Content script not loaded, injecting...');
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try sending message again
                await chrome.tabs.sendMessage(tabId, message);
            } else {
                throw error;
            }
        }
    }
      setupActionListener() {
        // Remove existing listener if any
        if (this.actionListener) {
            chrome.runtime.onMessage.removeListener(this.actionListener);
        }        // Create new listener
        this.actionListener = (message, sender, sendResponse) => {
            if (message.type === 'actionRecorded') {
                this.currentScenario.push(message.action);
                this.updateActionsList();
                this.updateButtonStates();
                
                // Update status with action count
                if (this.isRecording) {
                    this.updateStatus(`Recording... ${this.currentScenario.length} action${this.currentScenario.length !== 1 ? 's' : ''} captured`);
                }
            }
        };
        
        chrome.runtime.onMessage.addListener(this.actionListener);
    }
      cleanup() {
        if (this.actionListener) {
            chrome.runtime.onMessage.removeListener(this.actionListener);
        }
    }
      updateRecordingState() {
        this.recordBtn.disabled = this.isRecording;
        this.stopBtn.disabled = !this.isRecording;
        
        if (this.isRecording) {
            this.recordBtn.classList.add('recording-active');
            this.statusText.parentElement.classList.add('recording');
        } else {
            this.recordBtn.classList.remove('recording-active');
            this.statusText.parentElement.classList.remove('recording');
        }
    }    updateButtonStates() {
        const hasActions = this.currentScenario.length > 0;
        const hasName = this.scenarioName.value.trim().length > 0;
        
        this.playBtn.disabled = !hasActions || this.isRecording;
        this.saveBtn.disabled = !hasActions || !hasName || this.isRecording;
        this.clearBtn.disabled = !hasActions && !hasName || this.isRecording;
        this.clearAllBtn.disabled = this.savedScenarios.length === 0 || this.isRecording;
    }
    
    updatePlayButtonState() {
        // Kept for backward compatibility
        this.updateButtonStates();
    }
    
    updateActionsList() {
        if (this.currentScenario.length === 0) {
            this.actionsList.innerHTML = '<p class="empty-state">No actions recorded yet</p>';
            return;
        }
        
        const actionsHTML = this.currentScenario.map((action, index) => {
            const iconClass = this.getActionIconClass(action.type);
            const typeText = this.getActionTypeText(action.type);
            const targetText = this.getActionTargetText(action);
            
            return `
                <div class="action-item">
                    <div class="action-icon ${iconClass}">
                        ${this.getActionIcon(action.type)}
                    </div>
                    <div class="action-details">
                        <div class="action-type-text">${typeText}</div>
                        <div class="action-target">${targetText}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.actionsList.innerHTML = actionsHTML;
    }
    
    getActionIconClass(type) {
        const iconMap = {
            'click': 'action-click',
            'type': 'action-type',
            'select': 'action-select',
            'navigate': 'action-navigate'
        };
        return iconMap[type] || 'action-click';
    }
    
    getActionIcon(type) {
        const iconMap = {
            'click': '👆',
            'type': '⌨',
            'select': '📋',
            'navigate': '🔗'
        };
        return iconMap[type] || '⚡';
    }
    
    getActionTypeText(type) {
        const typeMap = {
            'click': 'Click',
            'type': 'Type',
            'select': 'Select',
            'navigate': 'Navigate'
        };
        return typeMap[type] || 'Action';
    }
    
    getActionTargetText(action) {
        switch (action.type) {
            case 'click':
                return action.selector || 'Unknown element';
            case 'type':
                return `"${action.value}" in ${action.selector || 'input field'}`;
            case 'select':
                return `"${action.value}" from ${action.selector || 'dropdown'}`;
            case 'navigate':
                return action.url || 'Unknown URL';
            default:
                return 'Unknown target';
        }
    }
      async saveCurrentScenario() {
        const scenarioName = this.scenarioName.value.trim();
        if (!scenarioName) {
            this.updateStatus('Please enter a scenario name');
            this.scenarioName.focus();
            return;
        }
        
        if (this.currentScenario.length === 0) {
            this.updateStatus('No actions to save. Record some actions first.');
            return;
        }
        
        try {
            const scenario = {
                id: Date.now().toString(),
                name: scenarioName,
                actions: [...this.currentScenario],
                createdAt: new Date().toISOString(),
                actionsCount: this.currentScenario.length
            };
            
            // Save to storage
            await chrome.storage.local.set({
                [`scenario_${scenario.id}`]: scenario
            });
            
            // Add to local list
            this.savedScenarios.push(scenario);
            this.updateScenariosList();
            
            // Clear current scenario and name
            this.currentScenario = [];
            this.scenarioName.value = '';
            this.updateActionsList();
            this.updateButtonStates();
            
            this.updateStatus(`✅ Scenario "${scenarioName}" saved successfully!`);
            
        } catch (error) {
            console.error('Error saving scenario:', error);
            this.updateStatus('Error: Could not save scenario');
        }
    }
    
    async loadSavedScenarios() {
        try {
            const result = await chrome.storage.local.get();
            this.savedScenarios = Object.values(result)
                .filter(item => item.id && item.name && item.actions)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            this.updateScenariosList();
        } catch (error) {
            console.error('Error loading scenarios:', error);
        }
    }
      updateScenariosList() {
        if (this.savedScenarios.length === 0) {
            this.scenariosList.innerHTML = '<p class="empty-state">No saved scenarios</p>';
            this.updateButtonStates(); // Update button states when no scenarios
            return;
        }
        
        const scenariosHTML = this.savedScenarios.map(scenario => {
            const date = new Date(scenario.createdAt).toLocaleDateString();
            return `
                <div class="scenario-item" data-scenario-id="${scenario.id}">
                    <div class="scenario-name">${scenario.name}</div>
                    <div class="scenario-info">
                        <span>${scenario.actionsCount} actions</span>
                        <span>${date}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        this.scenariosList.innerHTML = scenariosHTML;
        
        // Add click listeners to scenario items
        this.scenariosList.querySelectorAll('.scenario-item').forEach(item => {
            item.addEventListener('click', () => {
                const scenarioId = item.dataset.scenarioId;
                this.loadScenario(scenarioId);
            });
        });
        
        this.updateButtonStates(); // Update button states when scenarios exist
    }
    
    loadScenario(scenarioId) {
        const scenario = this.savedScenarios.find(s => s.id === scenarioId);
        if (!scenario) return;
          this.currentScenario = [...scenario.actions];
        this.scenarioName.value = scenario.name;
        this.updateActionsList();
        this.updateButtonStates();
        this.updateStatus(`Loaded scenario: ${scenario.name}`);
    }
    
    async loadRecordingState() {
        try {
            // Get recording state from background script
            const response = await chrome.runtime.sendMessage({ action: 'getRecordingState' });
            
            if (response) {
                this.isRecording = response.isRecording || false;
                this.currentScenario = response.scenario || [];
                  this.updateRecordingState();
                this.updateActionsList();
                this.updateButtonStates();
                
                if (this.isRecording) {
                    this.updateStatus('Recording in progress - interact with webpages to capture actions');
                    this.setupActionListener();
                }
            }
        } catch (error) {
            console.error('Error loading recording state:', error);
        }
    }
    
    updateStatus(message) {
        this.statusText.textContent = message;
        setTimeout(() => {
            if (this.statusText.textContent === message) {
                this.statusText.textContent = 'Ready';
            }
        }, 3000);
    }
      clearCurrentScenario() {
        if (this.isRecording) {
            this.updateStatus('Cannot clear scenario while recording. Stop recording first.');
            return;
        }
        
        this.currentScenario = [];
        this.scenarioName.value = '';
        this.updateActionsList();
        this.updateButtonStates();
        this.updateStatus('Current scenario cleared');
    }
    
    async clearAllScenarios() {
        if (this.isRecording) {
            this.updateStatus('Cannot clear scenarios while recording. Stop recording first.');
            return;
        }
        
        if (this.savedScenarios.length === 0) {
            this.updateStatus('No scenarios to clear');
            return;
        }
        
        // Show confirmation dialog
        const confirmed = confirm(`Are you sure you want to delete all ${this.savedScenarios.length} saved scenarios? This action cannot be undone.`);
        
        if (!confirmed) {
            return;
        }
        
        try {
            // Clear all scenarios from storage
            const result = await chrome.storage.local.get();
            const keysToRemove = Object.keys(result).filter(key => key.startsWith('scenario_'));
            
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
            }
            
            // Clear local array
            this.savedScenarios = [];
            this.updateScenariosList();
            this.updateButtonStates();
            
            this.updateStatus(`✅ All scenarios cleared successfully!`);
            
        } catch (error) {
            console.error('Error clearing all scenarios:', error);
            this.updateStatus('Error: Could not clear scenarios');
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.autoFillerPopup = new AutoFillerPopup();
});

// Cleanup when popup closes
window.addEventListener('beforeunload', () => {
    if (window.autoFillerPopup) {
        window.autoFillerPopup.cleanup();
    }
});
