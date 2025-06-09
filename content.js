// Auto Filler Content Script
class AutoFillerContent {    constructor() {
        this.isRecording = false;
        this.recordedActions = [];
        this.elementMatcher = new ElementMatcher();
        
        // Store bound methods for proper event listener removal
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleInput = this.handleInput.bind(this);
        this.boundHandleChange = this.handleChange.bind(this);
        this.boundHandleNavigation = this.handleNavigation.bind(this);
        
        this.setupMessageListener();
        this.injectPageScript();
        this.checkRecordingState(); // Check if recording is already active
    }
      setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                this.handleMessage(message, sender, sendResponse);
                return true; // Keep channel open for async responses
            } catch (error) {
                console.error('Error in message listener:', error);
                sendResponse({ error: error.message });
                return false;
            }
        });
    }async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'ping':
                    // Health check message
                    sendResponse({ success: true, status: 'content script loaded' });
                    break;
                    
                case 'startRecording':
                    await this.startRecording();
                    sendResponse({ success: true });
                    break;
                    
                case 'stopRecording':
                    await this.stopRecording();
                    sendResponse({ success: true });
                    break;
                      case 'playActionsOnPage':
                    // Send response immediately to avoid message channel closure during navigation
                    sendResponse({ success: true });
                    // Execute actions asynchronously
                    this.playActionsOnPage(message.actions, message.playbackSpeed).catch(error => {
                        console.error('Error playing actions:', error);
                    });
                    break;
                    
                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Content script error:', error);
            sendResponse({ error: error.message });
        }
    }
      async startRecording() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordedActions = [];
        
        // Add event listeners for recording
        this.addRecordingListeners();
        
        // Show recording indicator
        this.showRecordingIndicator();
        
        console.log('Auto Filler: Recording started');
    }
      async stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        
        // Remove event listeners
        this.removeRecordingListeners();
        
        // Hide recording indicator
        this.hideRecordingIndicator();
        
        console.log('Auto Filler: Recording stopped', this.recordedActions);
    }
      addRecordingListeners() {
        // Click events
        document.addEventListener('click', this.boundHandleClick, true);
        
        // Input events
        document.addEventListener('input', this.boundHandleInput, true);
        document.addEventListener('change', this.boundHandleChange, true);
        
        // Navigation events
        window.addEventListener('beforeunload', this.boundHandleNavigation);
    }
    
    removeRecordingListeners() {
        document.removeEventListener('click', this.boundHandleClick, true);
        document.removeEventListener('input', this.boundHandleInput, true);
        document.removeEventListener('change', this.boundHandleChange, true);
        window.removeEventListener('beforeunload', this.boundHandleNavigation);
    }
    
    handleClick(event) {
        if (!this.isRecording) return;
        
        const element = event.target;
        const selector = this.elementMatcher.generateSelector(element);
        
        const action = {
            type: 'click',
            selector: selector,
            timestamp: Date.now(),
            coordinates: {
                x: event.clientX,
                y: event.clientY
            },
            elementInfo: this.elementMatcher.getElementInfo(element)
        };
        
        this.recordAction(action);
    }
    
    handleInput(event) {
        if (!this.isRecording) return;
        
        const element = event.target;
        if (!['INPUT', 'TEXTAREA'].includes(element.tagName)) return;
        
        const selector = this.elementMatcher.generateSelector(element);
        
        const action = {
            type: 'type',
            selector: selector,
            value: element.value,
            timestamp: Date.now(),
            elementInfo: this.elementMatcher.getElementInfo(element)
        };
        
        // Debounce input events
        clearTimeout(this.inputTimeout);
        this.inputTimeout = setTimeout(() => {
            this.recordAction(action);
        }, 500);
    }
    
    handleChange(event) {
        if (!this.isRecording) return;
        
        const element = event.target;
        if (element.tagName !== 'SELECT') return;
        
        const selector = this.elementMatcher.generateSelector(element);
        
        const action = {
            type: 'select',
            selector: selector,
            value: element.value,
            selectedText: element.options[element.selectedIndex]?.text,
            timestamp: Date.now(),
            elementInfo: this.elementMatcher.getElementInfo(element)
        };
        
        this.recordAction(action);
    }
    
    handleNavigation() {
        if (!this.isRecording) return;
        
        const action = {
            type: 'navigate',
            url: window.location.href,
            timestamp: Date.now()
        };
        
        this.recordAction(action);
    }
    
    recordAction(action) {
        this.recordedActions.push(action);
        
        // Send to background script
        chrome.runtime.sendMessage({
            action: 'logAction',
            actionData: action
        });
        
        // Send to popup
        chrome.runtime.sendMessage({
            type: 'actionRecorded',
            action: action
        }).catch(() => {
            // Popup might not be open
        });
    }    async playActionsOnPage(actions, playbackSpeed = 'instant') {
        console.log('Playing actions on current page:', actions.length, 'actions at speed:', playbackSpeed);
        
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            try {
                console.log(`Executing action ${i + 1}/${actions.length}:`, action.type);
                await this.executeAction(action);
                
                // Apply speed-based delays between actions (not after navigation actions)
                if (i < actions.length - 1 && action.type !== 'navigate' && action.type !== 'navigation') {
                    let delay = 0;
                    switch (playbackSpeed) {
                        case 'fast':
                            delay = 50;
                            break;
                        case 'normal':
                            delay = 300; // Reduced from 500ms to 300ms
                            break;
                        case 'instant':
                        default:
                            delay = 0;
                            break;
                    }
                    
                    if (delay > 0) {
                        console.log(`Waiting ${delay}ms before next action...`);
                        await this.wait(delay);
                    }
                }
                
            } catch (error) {
                console.error('Error executing action:', error);
                // Continue with next action
            }
        }
        
        console.log('Actions completed on current page');
        
        // Notify background script that page actions are complete
        try {
            chrome.runtime.sendMessage({
                action: 'playbackComplete'
            });
        } catch (error) {
            console.log('Could not notify background of completion:', error);
        }
    }
    
    async executeAction(action) {
        switch (action.type) {
            case 'click':
                await this.executeClick(action);
                break;
                
            case 'type':
                await this.executeType(action);
                break;
                
            case 'select':
                await this.executeSelect(action);
                break;
                
            case 'navigate':
                await this.executeNavigate(action);
                break;
                
            default:
                console.warn('Unknown action type:', action.type);
        }
    }    async executeClick(action) {
        console.log('Executing click action:', action);
        const element = await this.findElement(action, 5); // More retries for clicks
        if (element) {
            console.log('Element found for click:', element, 'onclick:', element.onclick, 'href:', element.href);
            
            // Check if this might be a navigation element
            const mightNavigate = this.mightCauseNavigation(element);
            if (mightNavigate) {
                console.log('Detected potential navigation element - executing click immediately');
            }
            
            // Use instant scroll for better speed
            element.scrollIntoView({ behavior: 'instant', block: 'center' });
            
            // Small delay to ensure element is in view
            await this.wait(50);
            
            console.log('Clicking element...');
            element.click();
            console.log('Click executed');
            
            // If this might cause navigation, don't continue processing
            if (mightNavigate) {
                console.log('Navigation element clicked - stopping further action processing');
                return;
            }
        } else {
            console.warn('Element not found for click action:', action.selector);
        }
    }
    
    mightCauseNavigation(element) {
        // Check various indicators that this element might cause navigation
        const tagName = element.tagName.toLowerCase();
        
        // Links
        if (tagName === 'a' && element.href) return true;
        
        // Forms
        if (tagName === 'input' && (element.type === 'submit' || element.type === 'button')) return true;
        if (tagName === 'button' && element.type === 'submit') return true;
        
        // Elements with onclick handlers that might navigate
        if (element.onclick) {
            const onclickStr = element.onclick.toString();
            if (onclickStr.includes('location') || 
                onclickStr.includes('navigate') || 
                onclickStr.includes('href') ||
                onclickStr.includes('window.open') ||
                onclickStr.includes('submit')) {
                return true;
            }
        }
        
        // Elements with specific data attributes or classes that might indicate navigation
        const className = element.className || '';
        const dataAttrs = element.dataset || {};
        
        if (className.includes('nav') || className.includes('link') || 
            Object.keys(dataAttrs).some(key => key.includes('nav') || key.includes('link'))) {
            return true;
        }
        
        return false;
    }
      async executeType(action) {
        const element = await this.findElement(action, 3);
        if (element && ['INPUT', 'TEXTAREA'].includes(element.tagName)) {
            element.focus();
            await this.wait(50); // Small delay after focus
            element.value = '';
            element.value = action.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            console.warn('Element not found for type action:', action.selector);
        }
    }
    
    async executeSelect(action) {
        const element = await this.findElement(action, 3);
        if (element && element.tagName === 'SELECT') {
            element.focus();
            await this.wait(50); // Small delay after focus
            element.value = action.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            console.warn('Element not found for select action:', action.selector);
        }
    }
    
    async executeNavigate(action) {
        if (action.url && action.url !== window.location.href) {
            window.location.href = action.url;
        }
    }
      async findElement(action, maxRetries = 3) {
        let element = null;
        let attempts = 0;
        
        while (!element && attempts < maxRetries) {
            attempts++;
            
            // Try exact selector first
            element = document.querySelector(action.selector);
            
            if (!element && action.elementInfo) {
                // Use AI-assisted element matching
                element = await this.elementMatcher.findSimilarElement(action.elementInfo);
            }
            
            if (!element && attempts < maxRetries) {
                console.log(`Element not found on attempt ${attempts}, retrying in 100ms...`);
                await this.wait(100);
            }
        }
        
        if (!element) {
            console.warn(`Element not found after ${maxRetries} attempts:`, action.selector);
        }
        
        return element;
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    injectPageScript() {
        // Inject script to access page's JavaScript context
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected.js');
        script.onload = function() {
            this.remove();
        };
        (document.head || document.documentElement).appendChild(script);
    }
    
    showRecordingIndicator() {
        // Remove existing indicator if any
        this.hideRecordingIndicator();
        
        // Create recording indicator
        this.recordingIndicator = document.createElement('div');
        this.recordingIndicator.id = 'auto-filler-recording-indicator';
        this.recordingIndicator.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff4444, #cc0000);
                color: white;
                padding: 12px 16px;
                border-radius: 25px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 20px rgba(255, 68, 68, 0.4);
                z-index: 999999;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: pulse 2s ease-in-out infinite;
                user-select: none;
                pointer-events: none;
            ">
                <div style="
                    width: 8px;
                    height: 8px;
                    background: white;
                    border-radius: 50%;
                    animation: blink 1s ease-in-out infinite;
                "></div>
                Recording Actions
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.3; }
                }
            </style>
        `;
        
        document.body.appendChild(this.recordingIndicator);
    }
    
    hideRecordingIndicator() {
        if (this.recordingIndicator) {
            this.recordingIndicator.remove();
            this.recordingIndicator = null;
        }
    }
    
    async checkRecordingState() {
        try {
            // Check with background script if recording is active
            const response = await chrome.runtime.sendMessage({ action: 'getRecordingState' });
            if (response && response.isRecording) {
                await this.startRecording();
            }
        } catch (error) {
            // Background script might not be ready yet, ignore
        }
    }
}

// Element Matcher - AI-assisted element matching
class ElementMatcher {
    constructor() {
        this.selectorStrategies = [
            'id',
            'className',
            'tagName',
            'attributes',
            'textContent',
            'position'
        ];
    }
    
    generateSelector(element) {
        // Try different selector strategies
        let selector = this.getIdSelector(element);
        if (selector && document.querySelectorAll(selector).length === 1) {
            return selector;
        }
        
        selector = this.getClassSelector(element);
        if (selector && document.querySelectorAll(selector).length === 1) {
            return selector;
        }
        
        selector = this.getAttributeSelector(element);
        if (selector && document.querySelectorAll(selector).length === 1) {
            return selector;
        }
        
        // Fallback to nth-child selector
        return this.getNthChildSelector(element);
    }
    
    getIdSelector(element) {
        return element.id ? `#${element.id}` : null;
    }
    
    getClassSelector(element) {
        if (!element.className) return null;
        const classes = element.className.split(' ').filter(c => c.trim());
        if (classes.length === 0) return null;
        return `.${classes.join('.')}`;
    }
    
    getAttributeSelector(element) {
        const attributes = ['name', 'data-testid', 'data-id', 'type'];
        for (const attr of attributes) {
            const value = element.getAttribute(attr);
            if (value) {
                return `[${attr}="${value}"]`;
            }
        }
        return null;
    }
    
    getNthChildSelector(element) {
        const parent = element.parentElement;
        if (!parent) return element.tagName.toLowerCase();
        
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(element) + 1;
        const parentSelector = parent === document.body ? 'body' : this.generateSelector(parent);
        
        return `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
    }
    
    getElementInfo(element) {
        return {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.substring(0, 100),
            attributes: this.getRelevantAttributes(element),
            position: this.getElementPosition(element),
            size: this.getElementSize(element)
        };
    }
    
    getRelevantAttributes(element) {
        const relevant = ['name', 'type', 'placeholder', 'value', 'href', 'title', 'alt'];
        const attrs = {};
        relevant.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value) attrs[attr] = value;
        });
        return attrs;
    }
    
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }
    
    getElementSize(element) {
        return {
            width: element.offsetWidth,
            height: element.offsetHeight
        };
    }
    
    async findSimilarElement(elementInfo) {
        // AI-assisted element matching
        const candidates = document.querySelectorAll(elementInfo.tagName?.toLowerCase() || '*');
        let bestMatch = null;
        let bestScore = 0;
        
        for (const candidate of candidates) {
            const score = this.calculateSimilarity(elementInfo, this.getElementInfo(candidate));
            if (score > bestScore && score > 0.7) { // Threshold for similarity
                bestScore = score;
                bestMatch = candidate;
            }
        }
        
        return bestMatch;
    }
    
    calculateSimilarity(info1, info2) {
        let score = 0;
        let factors = 0;
        
        // Tag name match
        if (info1.tagName === info2.tagName) {
            score += 0.3;
        }
        factors += 0.3;
        
        // ID match
        if (info1.id && info1.id === info2.id) {
            score += 0.4;
        }
        factors += 0.1;
          // Class similarity
        if (info1.className && info2.className) {
            const classes1 = info1.className.split(' ').filter(c => c.trim());
            const classes2 = info2.className.split(' ').filter(c => c.trim());
            const commonClasses = classes1.filter(c => classes2.includes(c));
            score += (commonClasses.length / Math.max(classes1.length, classes2.length)) * 0.3;
        }
        factors += 0.3;
        
        // Text content similarity
        if (info1.textContent && info2.textContent) {
            const similarity = this.stringSimilarity(info1.textContent, info2.textContent);
            score += similarity * 0.2;
        }
        factors += 0.2;
        
        // Attribute similarity
        const attrs1 = Object.keys(info1.attributes || {});
        const attrs2 = Object.keys(info2.attributes || {});
        const commonAttrs = attrs1.filter(attr => 
            attrs2.includes(attr) && info1.attributes[attr] === info2.attributes[attr]
        );
        if (attrs1.length > 0 || attrs2.length > 0) {
            score += (commonAttrs.length / Math.max(attrs1.length, attrs2.length)) * 0.1;
        }
        factors += 0.1;
        
        return factors > 0 ? score / factors : 0;
    }
    
    stringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.autoFillerContent = new AutoFillerContent();
        console.log('Auto Filler: Content script initialized (DOM loaded)');
    });
} else {
    window.autoFillerContent = new AutoFillerContent();
    console.log('Auto Filler: Content script initialized (DOM ready)');
}
