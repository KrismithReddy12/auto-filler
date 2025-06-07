// Auto Filler Content Script
class AutoFillerContent {
    constructor() {
        this.isRecording = false;
        this.recordedActions = [];
        this.elementMatcher = new ElementMatcher();
        
        this.setupMessageListener();
        this.injectPageScript();
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });
    }
    
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'startRecording':
                    await this.startRecording();
                    sendResponse({ success: true });
                    break;
                    
                case 'stopRecording':
                    await this.stopRecording();
                    sendResponse({ success: true });
                    break;
                    
                case 'playScenario':
                    await this.playScenario(message.scenario);
                    sendResponse({ success: true });
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
        
        console.log('Auto Filler: Recording started');
    }
    
    async stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        
        // Remove event listeners
        this.removeRecordingListeners();
        
        console.log('Auto Filler: Recording stopped', this.recordedActions);
    }
    
    addRecordingListeners() {
        // Click events
        document.addEventListener('click', this.handleClick.bind(this), true);
        
        // Input events
        document.addEventListener('input', this.handleInput.bind(this), true);
        document.addEventListener('change', this.handleChange.bind(this), true);
        
        // Navigation events
        window.addEventListener('beforeunload', this.handleNavigation.bind(this));
    }
    
    removeRecordingListeners() {
        document.removeEventListener('click', this.handleClick.bind(this), true);
        document.removeEventListener('input', this.handleInput.bind(this), true);
        document.removeEventListener('change', this.handleChange.bind(this), true);
        window.removeEventListener('beforeunload', this.handleNavigation.bind(this));
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
    }
    
    async playScenario(scenario) {
        console.log('Playing scenario:', scenario);
        
        for (const action of scenario) {
            try {
                await this.executeAction(action);
                // Wait between actions
                await this.wait(500);
            } catch (error) {
                console.error('Error executing action:', error);
                // Try to continue with next action
            }
        }
        
        console.log('Scenario playback completed');
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
    }
    
    async executeClick(action) {
        const element = await this.findElement(action);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.wait(200);
            element.click();
        } else {
            console.warn('Element not found for click action:', action.selector);
        }
    }
    
    async executeType(action) {
        const element = await this.findElement(action);
        if (element && ['INPUT', 'TEXTAREA'].includes(element.tagName)) {
            element.focus();
            element.value = '';
            element.value = action.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            console.warn('Element not found for type action:', action.selector);
        }
    }
    
    async executeSelect(action) {
        const element = await this.findElement(action);
        if (element && element.tagName === 'SELECT') {
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
    
    async findElement(action) {
        // Try exact selector first
        let element = document.querySelector(action.selector);
        
        if (!element && action.elementInfo) {
            // Use AI-assisted element matching
            element = await this.elementMatcher.findSimilarElement(action.elementInfo);
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
            const classes1 = info1.className.split(' ');
            const classes2 = info2.className.split(' ');
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
        new AutoFillerContent();
    });
} else {
    new AutoFillerContent();
}
