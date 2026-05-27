import cv2 
import numpy as np  
import time   
import os
import sys
from handTrackingModule import HandDetector
from clipboardManager import ClipboardManager
from undoRedoManager import UndoRedoManager
from config import (
    BRUSH_THICKNESS,
    CLIPBOARD_INDICATOR_SIZE,
    ERASER_THICKNESS,
    FEEDBACK_DURATION,
    GESTURE_CHECK_INTERVAL,
    GESTURE_GUIDE_X,
    GESTURE_GUIDE_Y,
    SELECTION_COLOR,
)




wCam,hCam = 1280,720
windowName = "AirCanvas"
capture = cv2.VideoCapture(0)
capture.set(3,wCam)
capture.set(4,hCam)
cv2.namedWindow(windowName, cv2.WINDOW_NORMAL)
cv2.setWindowProperty(windowName, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

def resource_path(relative_path):
    base_path = getattr(sys,"_MEIPASS",os.path.abspath("."))
    return os.path.join(base_path,relative_path)


images_path = resource_path(os.path.join("assets","drawing"))
imagesList = sorted(os.listdir(images_path))
overlayList = []

for imPath in imagesList:
    image = cv2.imread(os.path.join(images_path,imPath))
    overlayList.append(image)
    
print(len(overlayList),imagesList)


pTime  = 0 

detector = HandDetector(maxHands=1)
header = overlayList[0]
drawColor = (255,0,0)
brushThickness = BRUSH_THICKNESS
eraserThickness = ERASER_THICKNESS
pasteCooldownSeconds = 0.8

xp,yp = 0,0
selection_mode = False
selection_start = (0,0)
selection_end = (0,0)
is_selecting = False
gesture_mode = "drawing"
clipboard = ClipboardManager(max_clipboard_history=10,max_paste_history=20)
undo_redo = UndoRedoManager(max_history=20)
copyStartTime = None
copy_feedback_time = 0
lastPasteTime = 0
pastePreview = None
pasteArmed = False
pendingPastePosition = None
gesture_check_interval = GESTURE_CHECK_INTERVAL
frame_count = 0
copy_detected = False
paste_detected = False
select_detected = False
select_pos = (0,0)

imgCanvas = np.zeros((hCam,wCam,3),np.uint8)


class FeedbackManager:
    def __init__(self):
        self.feedback_messages = []
        self.feedback_duration = FEEDBACK_DURATION

    def add_feedback(self,text,x,y,color=(0,255,0)):
        self.feedback_messages.append({
            "text": text,
            "time": time.time(),
            "x": x,
            "y": y,
            "color": color,
        })

    def draw_feedback(self,img):
        current_time = time.time()
        messages_to_remove = []

        for i,msg in enumerate(self.feedback_messages):
            elapsed = current_time - msg["time"]

            if elapsed > self.feedback_duration:
                messages_to_remove.append(i)
            else:
                alpha = 1.0 - (elapsed / self.feedback_duration)
                overlay = img.copy()
                cv2.putText(
                    overlay,
                    msg["text"],
                    (msg["x"],msg["y"]),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    msg["color"],
                    2,
                )
                img = cv2.addWeighted(overlay,alpha,img,1 - alpha,0)

        for i in reversed(messages_to_remove):
            self.feedback_messages.pop(i)

        return img


feedback_mgr = FeedbackManager()


def draw_clipboard_indicator(img,clipboard_manager,wCam,hCam):
    """
    Draw clipboard status indicator in the bottom-right corner.
    """
    if clipboard_manager.is_clipboard_empty:
        text = "No clipboard content"
        color = (128,128,128)
    else:
        text = f"Clipboard {clipboard_manager.current_clipboard_number()}/{clipboard_manager.clipboard_count()}"
        color = (0,255,0)

    cv2.rectangle(img,(wCam - 250,hCam - 60),(wCam - 10,hCam - 10),(50,50,50),cv2.FILLED)
    cv2.putText(img,text,(wCam - 240,hCam - 30),cv2.FONT_HERSHEY_SIMPLEX,0.6,color,2)

    if not clipboard_manager.is_clipboard_empty:
        thumbnail = clipboard_manager.get_clipboard_preview(
            max_width=CLIPBOARD_INDICATOR_SIZE // 2,
            max_height=CLIPBOARD_INDICATOR_SIZE // 2,
        )
        if thumbnail is not None:
            th,tw = thumbnail.shape[:2]
            thumbX = wCam - 60
            thumbY = hCam - 55
            img[thumbY:thumbY + th,thumbX:thumbX + tw] = thumbnail

    return img


def draw_gesture_guide(img,current_mode):
    """
    Display current gesture mode and available actions.
    """
    guide_text = {
        "drawing": "Mode: DRAW | 2 Fingers: Select | 3 Fingers: Erase | 5 Fingers: Clear",
        "selection": "Mode: SELECT | C-Shape: Copy | Drag to select area",
        "paste_ready": "Mode: PASTE READY | P-Shape to paste | Drag to preview",
    }

    text = guide_text.get(current_mode,"")
    cv2.putText(img,text,(GESTURE_GUIDE_X,GESTURE_GUIDE_Y),cv2.FONT_HERSHEY_SIMPLEX,0.6,(200,200,200),1)

    return img


while True: 
    frame_count += 1
    success,img = capture.read()
    if not success or img is None:
        cv2.waitKey(1)
        continue

    img = cv2.resize(img,(wCam,hCam))
    img = cv2.flip(img,1)
    img =  detector.findHands(img)
    showHeader = False
    pastePreview = None
    paste_gesture_detected = paste_detected
    gesture_mode = "paste_ready" if not clipboard.is_clipboard_empty else "drawing"
    
    lmList = detector.findPostition(img,draw=False)
    if len(lmList) !=0:
        x1,y1 = lmList[8][1:]
        x2,y2 = lmList[12][1:]
        # print(x1,y1,x2,y2)
        cv2.circle(img, (x1,y1),12,(255,0,255),cv2.FILLED)
        cv2.circle(img, (x2,y2),12,(255,0,255),cv2.FILLED)

        fingers,totalFingers = detector.fingersUp()
        if frame_count % gesture_check_interval == 0:
            copy_detected = detector.detectCopyGesture()
            paste_detected = detector.detectPasteGesture()
            select_detected,select_pos = detector.detectSelectionGesture()
        paste_gesture_detected = paste_detected
        now = time.time()
        
        print(fingers)
        if totalFingers == 5:
            xp,yp = 0,0
            selection_mode = False
            selection_start = (0,0)
            selection_end = (0,0)
            is_selecting = False
            copyStartTime = None
            clipboard.clear_history()
            undo_redo.clear()
            cv2.rectangle(img,(0,0),(wCam,hCam),(0,0,0),cv2.FILLED)
            cv2.rectangle(imgCanvas,(0,0),(wCam,hCam),(0,0,0),cv2.FILLED)
            feedback_mgr.add_feedback("Canvas Cleared",50,100,(0,255,0))

        elif selection_mode and copy_detected:
            xp,yp = 0,0
            print("Copy Pinch Mode")
            gesture_mode = "selection"

            sx1,sy1 = selection_start
            sx2,sy2 = selection_end
            success = clipboard.copy(imgCanvas,sx1,sy1,sx2,sy2)

            if success:
                copy_feedback_time = now
                feedback_mgr.add_feedback("Copied!",50,100,(0,255,0))
                selection_mode = False
                is_selecting = False
            copyStartTime = None

        elif totalFingers == 3 and fingers[1] and fingers[2] and fingers[3]:
            copyStartTime = None
            print("Three Finger Eraser Mode")
            gesture_mode = "drawing"

            cv2.circle(img, (x1,y1),eraserThickness // 2,(0,0,0),cv2.FILLED)
            if xp == 0 and yp == 0:
                xp,yp = x1,y1

            cv2.line(img,(xp,yp),(x1,y1),(0,0,0),eraserThickness)
            cv2.line(imgCanvas,(xp,yp),(x1,y1),(0,0,0),eraserThickness)
            xp,yp = x1,y1

        elif select_detected:
            xp,yp = 0,0
            copyStartTime = None
            print("Selection Mode") 
            gesture_mode = "selection"
            # Checking for the click
            if y1 < header.shape[0]:
                showHeader = True
                if 250<x1<450:
                    header = overlayList[0]
                    drawColor = (255,0,0)
                elif 550<x1<750:
                    header = overlayList[1]
                    drawColor = (0,0,255)
                elif 800<x1<950:
                    header = overlayList[2]
                    drawColor = (0,255,0)
                elif 1050<x1<1200:
                    header = overlayList[3]
                    drawColor = (0,0,0)
            elif not showHeader:
                x1,y1 = select_pos
                if not selection_mode:
                    selection_start = (x1,y1)
                    selection_mode = True
                selection_end = (x1,y1)
                is_selecting = True
            cv2.rectangle(img,(x1,y1-25),(x2,y2+25),drawColor,cv2.FILLED)

        elif paste_detected:
            xp,yp = 0,0
            copyStartTime = None
            print("Paste Mode")
            gesture_mode = "paste_ready"

            if not clipboard.is_clipboard_empty:
                pastePreview = clipboard.get_paste_region(imgCanvas,x1,y1,center=False)
                pasteArmed = pastePreview is not None
                pendingPastePosition = (x1,y1)
            
        elif fingers[1] and fingers[2] == False: 
            copyStartTime = None
            print("Drawing Mode")
            gesture_mode = "drawing"
            
            cv2.circle(img, (x1,y1),12,drawColor,cv2.FILLED)
            if xp == 0 and yp == 0:
                xp,yp = x1,y1
            if drawColor == (0,0,0):
                cv2.line(img,(xp,yp),(x1,y1),drawColor,eraserThickness)
                cv2.line(imgCanvas,(xp,yp),(x1,y1),drawColor, eraserThickness)
            else:
                cv2.line(img,(xp,yp),(x1,y1),drawColor,brushThickness)
                cv2.line(imgCanvas,(xp,yp),(x1,y1),drawColor, brushThickness)
            
            xp,yp = x1,y1

        else:
            xp,yp = 0,0
            copyStartTime = None
            is_selecting = False

    if pasteArmed and not paste_gesture_detected and pendingPastePosition is not None:
        pasteX,pasteY = pendingPastePosition
        if time.time() - lastPasteTime > pasteCooldownSeconds:
            undo_redo.save_state(imgCanvas)
            pasted,imgCanvas = clipboard.paste(imgCanvas,pasteX,pasteY,center=False,transparent=True,record_history=False)
            if pasted:
                lastPasteTime = time.time()
                feedback_mgr.add_feedback("Pasted!",50,140,(0,255,0))
            else:
                undo_redo.undo_stack.pop()
        pasteArmed = False
        pendingPastePosition = None
        
    imgGray = cv2.cvtColor(imgCanvas,cv2.COLOR_BGR2GRAY)
    _,imgInv = cv2.threshold(imgGray,0,255,cv2.THRESH_BINARY_INV)
    imgInv = cv2.cvtColor(imgInv,cv2.COLOR_GRAY2BGR)
    img = cv2.bitwise_and(img,imgInv)
    img = cv2.bitwise_or(img,imgCanvas)

    if selection_mode:
        selectionOverlay = img.copy()
        xMin,xMax = sorted((selection_start[0],selection_end[0]))
        yMin,yMax = sorted((selection_start[1],selection_end[1]))
        cv2.rectangle(selectionOverlay,(xMin,yMin),(xMax,yMax),SELECTION_COLOR,cv2.FILLED)
        img = cv2.addWeighted(selectionOverlay,0.18,img,0.82,0)

        dashLength = 14
        gapLength = 8
        for x in range(xMin,xMax,dashLength + gapLength):
            cv2.line(img,(x,yMin),(min(x + dashLength,xMax),yMin),SELECTION_COLOR,2)
            cv2.line(img,(x,yMax),(min(x + dashLength,xMax),yMax),SELECTION_COLOR,2)
        for y in range(yMin,yMax,dashLength + gapLength):
            cv2.line(img,(xMin,y),(xMin,min(y + dashLength,yMax)),SELECTION_COLOR,2)
            cv2.line(img,(xMax,y),(xMax,min(y + dashLength,yMax)),SELECTION_COLOR,2)

        cv2.circle(img,selection_start,6,SELECTION_COLOR,cv2.FILLED)
        cv2.circle(img,selection_end,6,SELECTION_COLOR,cv2.FILLED)
        labelY = max(24,yMin - 10)
        cv2.putText(img,"Drag to Select",(xMin,labelY),cv2.FONT_HERSHEY_SIMPLEX,0.5,SELECTION_COLOR,1)

    if pastePreview is not None:
        xMin,yMin,xMax,yMax,clipCrop = pastePreview
        previewGray = cv2.cvtColor(clipCrop,cv2.COLOR_BGR2GRAY)
        _,previewMask = cv2.threshold(previewGray,1,255,cv2.THRESH_BINARY)
        previewOverlay = img.copy()
        previewRoi = previewOverlay[yMin:yMax,xMin:xMax]
        alpha = 0.5
        previewBlend = cv2.addWeighted(previewRoi,1 - alpha,clipCrop,alpha,0)
        previewBlend = cv2.bitwise_and(previewBlend,previewBlend,mask=previewMask)
        previewBg = cv2.bitwise_and(previewRoi,previewRoi,mask=cv2.bitwise_not(previewMask))
        previewOverlay[yMin:yMax,xMin:xMax] = cv2.bitwise_or(previewBg,previewBlend)
        img = previewOverlay
        cv2.rectangle(img,(xMin,yMin),(xMax,yMax),(255,0,0),2)
        labelY = max(24,yMin - 20)
        cv2.putText(img,"Release to Paste",(xMin,labelY),cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,0,0),2)

    img = draw_clipboard_indicator(img,clipboard,wCam,hCam)

    img = feedback_mgr.draw_feedback(img)
    
    cTime = time.time()
    fps = 1/(cTime-pTime) if pTime != 0 else 0
    pTime = cTime

    if showHeader:
        h,w,c = header.shape
        img[0:h, 0:w] = header
    img = draw_gesture_guide(img,gesture_mode)
    cv2.putText(img,f"FPS: {int(fps)}",(50,680),cv2.FONT_HERSHEY_PLAIN,3,(255,0,0),3)
    cv2.imshow(windowName,img)
    # cv2.imshow("Canvas",imgCanvas)          
    key = cv2.waitKey(1) & 0xFF
    if key == ord("q"):
        break
    elif key == ord("u"):
        undone,imgCanvas = undo_redo.undo(imgCanvas)
        if undone:
            feedback_mgr.add_feedback("Undo",50,180,(0,255,255))
    elif key == ord("r"):
        redone,imgCanvas = undo_redo.redo(imgCanvas)
        if redone:
            feedback_mgr.add_feedback("Redo",50,180,(0,255,255))
    elif key == ord("c"):
        if clipboard.cycle_clipboard():
            feedback_mgr.add_feedback("Clipboard Switched",50,220,(0,255,0))

capture.release()
cv2.destroyAllWindows()
