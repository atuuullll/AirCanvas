# AirCanvas

AirCanvas is a real-time virtual drawing application that lets users create and edit artwork using hand gestures captured through a webcam. Built with OpenCV and MediaPipe, the project tracks hand landmarks, interprets finger patterns, and converts them into drawing, selection, erasing, copy, paste, undo, and redo actions on a digital canvas.

The application is designed as an accessible, touch-free drawing interface. Users can draw with an index finger, switch tools through gesture-based selection, copy selected canvas regions, preview pasted content before placing it, and manage clipboard history without relying on a mouse or touchscreen.

## Key Features

- Real-time hand tracking using MediaPipe hand landmarks
- Webcam-based drawing with index-finger movement
- Gesture-controlled tool selection for brush colors and eraser
- Three-finger eraser mode for quick corrections
- Region selection with visual selection feedback
- Gesture-based copy and paste workflow
- Paste preview before placing copied content
- Multi-item clipboard history with thumbnail indicator
- Keyboard-supported undo, redo, and clipboard cycling
- Fullscreen OpenCV canvas with live gesture guidance

## Gesture Controls

- **Index finger up**: Draw on the canvas
- **Index and middle fingers up**: Enter selection mode or choose a toolbar option
- **Three fingers up**: Use eraser mode
- **Five fingers up**: Clear the canvas and reset history
- **Pinch gesture in selection mode**: Copy the selected canvas area
- **Paste gesture**: Preview copied content; release to paste

## Keyboard Shortcuts

- **Q**: Quit the application
- **U**: Undo the last saved canvas action
- **R**: Redo the last undone canvas action
- **C**: Cycle through clipboard items

## Project Structure

- `drawingBoard.py`: Main application loop, drawing logic, gesture actions, and OpenCV UI
- `handTrackingModule.py`: MediaPipe hand detection and gesture recognition helpers
- `clipboardManager.py`: Copy, paste, clipboard history, and paste preview support
- `undoRedoManager.py`: Canvas state history for undo and redo
- `config.py`: Gesture sensitivity, drawing thickness, and UI configuration
- `assets/`: Demo and toolbar image assets
- `web/`: Static web files for project presentation

## Getting Started

1. Install the required dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:

   ```bash
   python drawingBoard.py
   ```

3. Allow webcam access when prompted. The application opens in a fullscreen OpenCV window.

## Requirements

- Python
- OpenCV
- MediaPipe
- NumPy
- A working webcam

## Notes

For the best tracking experience, use the application in a well-lit environment with your hand clearly visible to the camera. Gesture recognition depends on camera quality, lighting, and how consistently the hand is positioned in frame.
