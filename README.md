# 🎨 AirCanvas — OpenCV + MediaPipe Project

Draw anything on the screen with your **index finger** — no stylus, no touchscreen, just your webcam and your hand! ✍️🖐️  
This real-time gesture-based drawing app is powered by **MediaPipe** and **OpenCV** using hand landmarks and finger detection.

## 🖼 Demo

![Demo](assets/Demo.gif)

## 🧠 How It Works

🖐️ This project uses your webcam to detect hand gestures and switches between drawing and selection modes based on finger positions:

- ☝️ **Only Index Finger Up** → Drawing Mode
- ✌️ **Index + Middle Finger Up** → Selection Mode (choose color or eraser)
- ✋ **All 5 Fingers Up** → Clear the entire drawing board

You can toggle between different **colors** and an **eraser** by moving your fingers to the top toolbar area.

---

## 🚀 Features

✅ Real-time hand tracking with MediaPipe  
✅ Draw using your index finger  
✅ Select colors & eraser using gestures  
✅ Clear canvas with a five-finger gesture  
✅ Smooth and responsive drawing experience  
✅ Works offline with just a webcam

---

## 🧠 What You'll Learn

- How to detect fingers using MediaPipe hand landmarks
- Creating interactive tools using OpenCV (color palette, buttons)
- Switching modes using finger gesture logic
- Drawing with custom brush sizes and color handling
- Simple UI creation with OpenCV overlays

---

## 🔧 Getting Started

### How to run:

1.  **Install the required dependencies, globlally or by creating a virtual environment:**

    ```bash
    pip install -r requirements.txt
    ```

2.  **Run the application:**

    ```bash
    python drawingBoard.py
    ```

## Dependencies

- OpenCV
- MediaPipe
- Numpy

#### Buy me a coffee 🥹:

<a href="https://www.buymeacoffee.com/kunalmehra" target="_blank">
<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
</a>

Contributions are welcome! 🙏 If you have any ideas for improvements, feel free to submit a pull request.\
Follow me for more exciting projects like this! 🤩
