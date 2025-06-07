# 🧪 Testing Your Auto Filler Extension

## 🚀 Step-by-Step Test

### 1. Reload Your Extension
1. Go to `chrome://extensions/`
2. Find "Auto Filler" 
3. Click the **refresh/reload** button 🔄
4. Make sure it's enabled (toggle should be ON)

### 2. Test Recording & Saving
1. **Open Extension**: Click the Auto Filler icon in toolbar
2. **Enter Name**: Type "My Test Scenario" in the name field
3. **Start Recording**: Click "Start Recording" button
4. **Close Popup**: Close the extension popup (this was the original issue!)
5. **Interact**: Go to `test-page.html` and:
   - Fill in the form fields
   - Click buttons
   - Select dropdown options
6. **Stop Recording**: Open extension popup → Click "Stop Recording"
7. **Save Scenario**: Click the **"Save"** button 💾

### 3. Test Playback
1. **Clear Form**: Refresh the test page to clear the form
2. **Open Extension**: Click the Auto Filler icon
3. **Load Scenario**: Click on "My Test Scenario" in the saved scenarios list
4. **Choose Speed**: Select playback speed from dropdown:
   - ⚡ **Instant (Developer Mode)**: No delays - fastest execution
   - 🚀 **Fast (50ms delay)**: Quick with minimal pauses
   - 🐌 **Normal (500ms delay)**: Slower, more human-like timing
5. **Play**: Click "Play Scenario" ▶️
6. **Watch**: The form should automatically fill out at your chosen speed!

## ✅ What Should Happen

### During Recording:
- ✅ Red "Recording Actions" indicator appears on webpage
- ✅ Extension popup can be closed without stopping recording
- ✅ Actions appear in the popup when you reopen it
- ✅ Status shows "Recording... X actions captured"

### After Recording:
- ✅ Actions list shows all captured interactions
- ✅ Save button becomes enabled when you enter a name
- ✅ Status shows "Recording stopped - X actions captured"

### After Saving:
- ✅ Scenario appears in "Saved Scenarios" list
- ✅ Current scenario is cleared
- ✅ Success message shows

### During Playback:
- ✅ Form fills out automatically at selected speed
- ✅ **Instant Mode**: Actions execute immediately (great for developers)
- ✅ **Fast Mode**: Quick execution with 50ms delays
- ✅ **Normal Mode**: Human-like timing with 500ms delays
- ✅ Buttons are clicked in sequence
- ✅ Dropdown selections are made
- ✅ Status shows current playback speed during execution

## 🐛 Troubleshooting

### "Could not establish connection" Error?
- **Reload Extension**: Go to `chrome://extensions/`, find Auto Filler, click reload button
- **Refresh Page**: Refresh the webpage you're trying to record on
- **Check Page Type**: Extension cannot work on Chrome internal pages (chrome://, about:, etc.)
- **Try Different Site**: Test on a regular website like Google.com first
- **Check Console**: Press F12, look for Auto Filler messages in Console tab

### No Actions Captured?
- Make sure the red recording indicator appears
- Try refreshing the webpage after installing/reloading extension
- Check browser console (F12) for error messages

### Save Button Disabled?
- Make sure you've entered a scenario name
- Make sure you have recorded actions
- Make sure recording is stopped

### Playback Not Working?
- Ensure you're on the same or similar webpage
- Try a simple test with basic form inputs first
- Check that the scenario was saved properly

## 🎯 Expected Results

After testing, you should have:
1. ✅ A working recording system that persists when popup closes
2. ✅ Saved scenarios that can be replayed at different speeds
3. ✅ **Speed Options**: Test all three playback speeds work correctly
4. ✅ Visual feedback during recording
5. ✅ Proper scenario management (save/clear/load)
6. ✅ **Developer Productivity**: Instant playback for rapid testing

---

**🎉 If all tests pass, your Auto Filler extension is working perfectly!**
