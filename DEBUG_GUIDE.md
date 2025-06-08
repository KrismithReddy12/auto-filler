# 🔍 Cross-Page Navigation Debug Guide

## Quick Debug Commands

### 1. Enable Extension Debug Mode
```javascript
// In browser console (F12) while testing:
chrome.storage.local.set({debugMode: true});

// To disable debug mode:
chrome.storage.local.set({debugMode: false});
```

### 2. Background Script Debugging
```javascript
// View current playback state
console.log('Playback State:', playbackState);

// Check if navigation is detected
console.log('Tab ready events firing correctly');
```

### 3. Content Script Debugging
```javascript
// Verify content script is injected
console.log('Auto Filler content script loaded');

// Check message handlers
console.log('Message handlers registered');
```

## Common Issues & Fixes

### Issue: Playback Stops After Navigation
**Symptoms:** Actions execute on first page, navigation occurs, but nothing happens on second page

**Debug Steps:**
1. Open browser console (F12)
2. Check for error messages during playback
3. Verify content script loads on target page
4. Check if `onTabReady()` is triggering

**Fixes:**
- Increase navigation delay in `background.js` (line with `setTimeout(..., 1000)`)
- Verify target page allows content script injection
- Check manifest.json permissions include target domain

### Issue: Navigation Action Not Recorded
**Symptoms:** Button clicks that should navigate don't get recorded as navigation

**Debug Steps:**
1. Check if navigation actually occurs when button is clicked
2. Verify button has proper event listeners
3. Look for JavaScript errors preventing navigation

**Fixes:**
- Test navigation manually first
- Check if button uses `href` vs `onclick`
- Ensure no JavaScript errors on source page

### Issue: Actions Execute Too Fast
**Symptoms:** Actions execute before page fully loads

**Debug Steps:**
1. Try different playback speeds
2. Check page load timing
3. Monitor network tab during playback

**Fixes:**
- Increase playback delays in `content.js`
- Add page load detection before action execution
- Use "Normal" speed instead of "Instant"

### Issue: Element Selectors Fail on New Page
**Symptoms:** Actions recorded on one page don't work when replayed

**Debug Steps:**
1. Inspect elements on both pages
2. Compare element structures
3. Check if IDs/classes match

**Fixes:**
- Use more robust element selectors
- Update element matching logic in `content.js`
- Add fallback selector strategies

## Console Commands for Testing

### Test Background Script Communication
```javascript
// Send test message to background script
chrome.runtime.sendMessage({action: 'test'}, response => {
    console.log('Background script response:', response);
});
```

### Test Content Script Communication
```javascript
// Send test message to content script
chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'test'}, response => {
        console.log('Content script response:', response);
    });
});
```

### View Extension Storage
```javascript
// View all stored scenarios
chrome.storage.local.get(null, result => {
    console.log('All stored data:', result);
});

// View specific scenario
chrome.storage.local.get('scenarios', result => {
    console.log('Scenarios:', result.scenarios);
});
```

## Performance Monitoring

### Memory Usage
```javascript
// Monitor extension memory usage
chrome.system.memory.getInfo(info => {
    console.log('Available memory:', info.availableCapacity);
});
```

### Execution Timing
```javascript
// Add timing logs in content.js playActionsOnPage method:
console.time('Action execution');
// ... action code ...
console.timeEnd('Action execution');
```

## Browser-Specific Debug

### Chrome DevTools
1. Navigate to `chrome://extensions/`
2. Find Auto Filler extension
3. Click "Inspect views: background page"
4. Use console for background script debugging

### Firefox DevTools
1. Navigate to `about:debugging`
2. Click "This Firefox"
3. Find Auto Filler extension
4. Click "Inspect" for debugging

## Log Analysis

### Key Log Messages to Look For

**Successful Playback:**
```
Auto Filler content script loaded
Starting scenario playback
Executing action: fill
Page navigation detected
Continuing playback on new page
Scenario playback completed successfully
```

**Problem Indicators:**
```
Error: Could not establish connection
Element not found: [selector]
Navigation timeout
Content script not responding
```

## Testing Environment Setup

### Browser Configuration
- Disable popup blockers
- Allow all cookies
- Disable ad blockers that might interfere
- Clear browser cache if needed

### Network Considerations
- Test on reliable internet connection
- Monitor network tab for failed requests
- Check for CORS issues on target pages

## Recovery Procedures

### If Extension Gets Stuck
1. Stop any running playback
2. Close extension popup
3. Refresh target pages
4. Reload extension in Chrome
5. Restart testing

### If Scenarios Become Corrupted
1. Export working scenarios first
2. Clear extension storage
3. Re-import good scenarios
4. Test basic functionality before complex scenarios

---

**💡 Pro Tip:** Always test the basic single-page functionality first before moving to cross-page scenarios. This helps isolate whether issues are related to the new navigation feature or existing functionality.

**🔧 Quick Fix Strategy:**
1. Identify what works (single page vs cross-page)
2. Isolate the failing component (recording vs playback)
3. Check browser console for specific errors
4. Apply targeted fixes based on error messages
