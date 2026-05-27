
import math
import time
import mediapipe as mp
import cv2
from config import PINCH_THRESHOLD



class HandDetector():
    def __init__(self,mode=False,maxHands=2,detectionCon=0.5,trackCon=0.5):
        self.mode = mode
        self.maxHands = maxHands
        self.detectionCon = detectionCon 
        self.trackCon = trackCon
        self.mpHands = mp.solutions.hands
        self.hands = self.mpHands.Hands(static_image_mode=self.mode,max_num_hands=self.maxHands,min_detection_confidence=self.detectionCon,min_tracking_confidence=self.trackCon)
        self.mpDraw = mp.solutions.drawing_utils
        self.lmList =[]
        self.fingerTips =[4,8,12,16,20]
    
    def findHands(self,img,draw=True):
        imgRgb = cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
        self.results = self.hands.process(imgRgb)
        
        if self.results.multi_hand_landmarks:    
            for handLms in self.results.multi_hand_landmarks:
                if draw:
                    self.mpDraw.draw_landmarks(img,handLms,self.mpHands.HAND_CONNECTIONS)
        
        return img     
    
    def findPostition(self,img,handNo=0,draw=True):
        self.lmList = []
        
        if self.results.multi_hand_landmarks:    
            myHand = self.results.multi_hand_landmarks[handNo]
         
            for id,lm in enumerate(myHand.landmark): 
                h,w,c = img.shape 
                cx,cy = int(lm.x*w),int(lm.y*h) 
                self.lmList.append([id,cx,cy])
                if draw:
                    cv2.circle(img,(cx,cy),5,(255,255,0),cv2.FILLED)
        return self.lmList

    def fingersUp(self):
        fingers = []
        # For thumb
        if self.lmList[self.fingerTips[0]][1] < self.lmList[self.fingerTips[0]- 1][1]:
            fingers.append(1)
        else:
            fingers.append(0)
        # For 4 fingers
        for i in range(1,5):
            if self.lmList[self.fingerTips[i]][2] < self.lmList[self.fingerTips[i]-2][2]:
                fingers.append(1)
            else:
                fingers.append(0)
        
     
        totalFingers = fingers.count(1)
        return fingers,totalFingers

    def detectCopyGesture(self):
        """
        Detect copy gesture: thumb and index pinched with the other fingers extended.
        Returns True if the gesture is detected.
        """
        if len(self.lmList) < 21:
            return False

        thumb_tip = self.lmList[4]
        index_tip = self.lmList[8]
        middle_tip = self.lmList[12]
        ring_tip = self.lmList[16]
        pinky_tip = self.lmList[20]

        thumb_index_dist = math.hypot(
            thumb_tip[1] - index_tip[1],
            thumb_tip[2] - index_tip[2],
        )

        if thumb_index_dist < PINCH_THRESHOLD:
            middle_extended = middle_tip[2] < self.lmList[10][2]
            ring_extended = ring_tip[2] < self.lmList[14][2]
            pinky_extended = pinky_tip[2] < self.lmList[18][2]

            if middle_extended and ring_extended and pinky_extended:
                return True

        return False

    def detectPasteGesture(self):
        """
        Detect paste gesture: thumb, index, and middle up with ring and pinky down.
        Returns True if the gesture is detected.
        """
        if len(self.lmList) < 21:
            return False

        fingers,_ = self.fingersUp()

        return (
            fingers[0] == 1 and
            fingers[1] == 1 and
            fingers[2] == 1 and
            fingers[3] == 0 and
            fingers[4] == 0
        )

    def detectSelectionGesture(self):
        """
        Detect selection gesture: index and middle fingers up.
        Returns (True, index_position) when detected.
        """
        if len(self.lmList) < 21:
            return False,(0,0)

        fingers,total = self.fingersUp()

        if total == 2 and fingers[1] and fingers[2]:
            index_pos = (self.lmList[8][1],self.lmList[8][2])
            return True,index_pos

        return False,(0,0)
        
    def findDistance(self,p1,p2,img,draw=True):
        x1,y1 = self.lmList[p1][1:]
        x2,y2 = self.lmList[p2][1:]
        
        cx,cy = (x1+x2)//2,(y1+y2)//2 
        if draw:
            cv2.circle(img, (x1,y1),12,(255,0,255),cv2.FILLED)
            cv2.circle(img, (x2,y2),12,(255,0,255),cv2.FILLED)
            cv2.circle(img, (cx,cy),12,(255,0,255),cv2.FILLED)
            cv2.line(img, (x1,y1),(x2,y2),(255,0,255),3)
        length= math.hypot(x2-x1,y2-y1)
        
        if length<PINCH_THRESHOLD:
            cv2.circle(img, (cx,cy),12,(0,255,0),cv2.FILLED)
        return length,img,[x1,y1,x2,y2,cx,cy]
        



def main():

    currentTime = 0
    previousTime = 0
    capture = cv2.VideoCapture(0)
 
  
    detector = HandDetector()

    while True:
        success,img = capture.read()
        if success:
            img = detector.findHands(img)
            
            lmList = detector.findPostition(img)
            if len(lmList) !=0:
                print(lmList[8])
      
        currentTime = time.time()
        fps = 1/(currentTime-previousTime)
        previousTime = currentTime
    
        cv2.putText(img,str(int(fps)),(10,70),cv2.FONT_HERSHEY_COMPLEX,3,(255,0,255),3)

        cv2.imshow("Image",img)
        cv2.waitKey(1)



if __name__ == "__main__":
     main()
     
     
