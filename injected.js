// Injected script - runs in page context
(function() {
    'use strict';
    
    // This script runs in the page's context and can access page variables
    // It communicates with the content script through custom events
    
    console.log('Auto Filler: Injected script loaded');
    
    // Listen for custom events from content script
    window.addEventListener('autoFillerExecute', function(event) {
        const { action } = event.detail;
        executePageAction(action);
    });
    
    function executePageAction(action) {
        try {
            switch (action.type) {
                case 'customJS':
                    // Execute custom JavaScript in page context
                    eval(action.code);
                    break;
                    
                case 'waitForElement':
                    // Wait for element to appear
                    waitForElement(action.selector, action.timeout || 5000);
                    break;
                    
                case 'triggerEvent':
                    // Trigger custom events
                    triggerCustomEvent(action.selector, action.eventType, action.eventData);
                    break;
                    
                default:
                    console.warn('Unknown page action:', action.type);
            }
        } catch (error) {
            console.error('Error executing page action:', error);
        }
    }
    
    function waitForElement(selector, timeout) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                } else {
                    setTimeout(check, 100);
                }
            }
            
            check();
        });
    }
    
    function triggerCustomEvent(selector, eventType, eventData) {
        const element = document.querySelector(selector);
        if (element) {
            const event = new CustomEvent(eventType, { detail: eventData });
            element.dispatchEvent(event);
        }
    }
    
    // Expose utility functions to page
    window.autoFillerUtils = {
        waitForElement,
        triggerCustomEvent
    };
    
})();
