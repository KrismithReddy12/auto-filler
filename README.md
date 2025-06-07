# Auto Filler Browser Extension

Auto Filler is an AI-driven browser extension designed to simplify manual web application testing by recording and replaying user interactions.

## Features

- **Action Recording**: Captures user interactions (clicks, typing, form selections)
- **Scenario Management**: Create, save, and organize test scenarios
- **Variable Playback Speed**: Choose from instant, fast, or normal playback speeds
- **AI-Assisted Playback**: Smart element matching that adapts to minor UI changes
- **Beautiful UI**: Modern, intuitive interface for managing scenarios
- **Cross-browser Support**: Compatible with Chrome, Firefox, and Edge

## Installation

### For Development

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the Auto Filler directory
5. The extension should now appear in your extensions list

### For Other Browsers

- **Firefox**: Navigate to `about:debugging`, click "This Firefox", then "Load Temporary Add-on"
- **Edge**: Navigate to `edge://extensions/`, enable Developer mode, then "Load unpacked"

## How to Use

1. **Start Recording**:
   - Click the Auto Filler extension icon
   - Enter a name for your scenario
   - Click "Start Recording"
   - Interact with any webpage (click, type, select, navigate)

2. **Stop Recording**:
   - Click "Stop Recording" when done
   - Your scenario will be automatically saved

3. **Replay Scenario**:
   - Select a saved scenario or use the current one
   - Choose your preferred playback speed:
     - **⚡ Instant**: No delays - perfect for developers
     - **🚀 Fast**: 50ms delays between actions
     - **🐌 Normal**: 500ms delays for human-like timing
   - Click "Play Scenario" to replay all recorded actions

## Technical Architecture

### Files Structure

- `manifest.json` - Extension configuration
- `popup.html/css/js` - Extension popup interface
- `background.js` - Service worker for background tasks
- `content.js` - Content script injected into web pages
- `injected.js` - Script running in page context

### AI-Assisted Element Matching

The extension uses intelligent element matching algorithms that:
- Generate robust CSS selectors
- Calculate element similarity scores
- Adapt to minor UI changes
- Fall back to alternative matching strategies

### Data Storage

- Scenarios stored locally using Chrome Storage API
- No data sent to external servers
- Export/import functionality for sharing

## Browser Permissions

The extension requires the following permissions:
- `activeTab` - Access to current tab for recording/playback
- `storage` - Local storage for saving scenarios
- `scripting` - Inject content scripts
- `tabs` - Tab management

## Development

### Project Structure
```
Auto Filler ADP/
├── manifest.json          # Extension manifest
├── popup.html             # Popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup logic
├── background.js          # Background service worker
├── content.js             # Content script
├── injected.js            # Page context script
├── README.md             # This file
└── context.md            # Project context and planning
```

### Key Classes

- `AutoFillerPopup` - Manages popup interface and user interactions
- `AutoFillerBackground` - Handles background tasks and message routing
- `AutoFillerContent` - Records and replays actions on web pages
- `ElementMatcher` - AI-powered element matching and selector generation

### Extending Functionality

To add new action types:

1. Add recording logic in `content.js` `handleXXX` methods
2. Add playback logic in `content.js` `executeXXX` methods
3. Update popup UI to display new action types
4. Add appropriate icons and styling

## Recent Improvements

- **Variable Playback Speed**: Added instant, fast, and normal playback modes
- **Developer Mode**: Instant playback with no delays for rapid testing
- **Clear All Scenarios**: Bulk deletion of saved scenarios with confirmation
- **Enhanced Error Handling**: Better connection error handling and recovery
- **Improved UI**: Modern design with speed selector and better button management

## Future Enhancements

- Export scenarios as automated test scripts
- Integration with CI/CD pipelines
- Advanced AI learning from usage patterns
- Cross-browser scenario synchronization
- Team collaboration features
- Custom playback speed settings
- Scenario scheduling and automation

## Troubleshooting

### Common Issues

1. **Extension not working on some sites**:
   - Some sites block content scripts
   - Try disabling other extensions that might interfere

2. **Scenarios not playing correctly**:
   - UI changes may affect element matching
   - Try re-recording the scenario

3. **Recording not capturing actions**:
   - Ensure the extension has permission for the site
   - Check browser console for errors

### Debug Mode

Open browser developer tools and check the console for Auto Filler debug messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on multiple browsers
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

*Auto Filler aims to empower developers and QA teams with an intuitive, AI-enhanced solution to automate manual web testing workflows.*
