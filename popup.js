// Auto Filler Popup Script
class AutoFillerPopup {
    constructor() {
        this.currentScenario = [];
        this.isRecording = false;
        this.savedScenarios = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSavedScenarios();
    }
    
    initializeElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.playBtn = document.getElementById('playBtn');
        this.scenarioName = document.getElementById('scenarioName');
        this.actionsList = document.getElementById('actionsList');
        this.scenariosList = document.getElementById('scenariosList');
        this.statusText = document.getElementById('statusText');
    }
    
    setupEventListeners() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.playBtn.addEventListener('click', () => this.playScenario());
        this.scenarioName.addEventListener('input', () => this.updatePlayButtonState());
    }
    
    async startRecording() {
        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Clear current scenario
            this.currentScenario = [];
            this.updateActionsList();
            
            // Start recording
            await chrome.tabs.sendMessage(tab.id, { action: 'startRecording' });
            
            this.isRecording = true;
            this.updateRecordingState();
            this.updateStatus('Recording started - interact with the webpage');
            
            // Listen for recorded actions
            this.setupActionListener();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateStatus('Error: Could not start recording');
        }
    }
    
    async stopRecording() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' });
            
            this.isRecording = false;
            this.updateRecordingState();
            this.updateStatus(`Recording stopped - ${this.currentScenario.length} actions captured`);
            
            // Save scenario if it has a name and actions
            if (this.scenarioName.value.trim() && this.currentScenario.length > 0) {
                await this.saveCurrentScenario();
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
            
            await chrome.tabs.sendMessage(tab.id, {
                action: 'playScenario',
                scenario: this.currentScenario
            });
            
            this.updateStatus('Scenario playback completed');
            this.playBtn.disabled = false;
            
        } catch (error) {
            console.error('Error playing scenario:', error);
            this.updateStatus('Error: Could not play scenario');
            this.playBtn.disabled = false;
        }
    }
    
    setupActionListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'actionRecorded') {
                this.currentScenario.push(message.action);
                this.updateActionsList();
                this.updatePlayButtonState();
            }
        });
    }
    
    updateRecordingState() {
        this.recordBtn.disabled = this.isRecording;
        this.stopBtn.disabled = !this.isRecording;
        
        if (this.isRecording) {
            this.recordBtn.classList.add('recording');
        } else {
            this.recordBtn.classList.remove('recording');
        }
    }
    
    updatePlayButtonState() {
        const hasActions = this.currentScenario.length > 0;
        const hasName = this.scenarioName.value.trim().length > 0;
        this.playBtn.disabled = !hasActions || this.isRecording;
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
        if (!scenarioName || this.currentScenario.length === 0) return;
        
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
        
        this.savedScenarios.push(scenario);
        this.updateScenariosList();
        this.updateStatus(`Scenario "${scenarioName}" saved successfully`);
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
    }
    
    loadScenario(scenarioId) {
        const scenario = this.savedScenarios.find(s => s.id === scenarioId);
        if (!scenario) return;
        
        this.currentScenario = [...scenario.actions];
        this.scenarioName.value = scenario.name;
        this.updateActionsList();
        this.updatePlayButtonState();
        this.updateStatus(`Loaded scenario: ${scenario.name}`);
    }
    
    updateStatus(message) {
        this.statusText.textContent = message;
        setTimeout(() => {
            if (this.statusText.textContent === message) {
                this.statusText.textContent = 'Ready';
            }
        }, 3000);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AutoFillerPopup();
});
