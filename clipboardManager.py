import cv2
from collections import deque


class MultiClipboard:
    def __init__(self,max_items=5):
        self.clipboard_items = []
        self.max_items = max_items
        self.current_index = -1

    def add(self,canvas_region):
        """Add item to clipboard history."""
        self.clipboard_items.append(canvas_region.copy())
        if len(self.clipboard_items) > self.max_items:
            self.clipboard_items.pop(0)
        self.current_index = len(self.clipboard_items) - 1

    def get_current(self):
        """Get currently selected clipboard item."""
        if 0 <= self.current_index < len(self.clipboard_items):
            return self.clipboard_items[self.current_index]
        return None

    def cycle_clipboard(self):
        """Cycle to next clipboard item."""
        if self.clipboard_items:
            self.current_index = (self.current_index + 1) % len(self.clipboard_items)
            return self.get_current()
        return None

    def clear(self):
        self.clipboard_items.clear()
        self.current_index = -1


class ClipboardManager:
    def __init__(self,max_clipboard_history=10,max_paste_history=20,max_clipboard_items=5):
        self.clipboard = None
        self.clipboard_rect = None
        self.clipboard_history = deque(maxlen=max_clipboard_history)
        self.multi_clipboard = MultiClipboard(max_items=max_clipboard_items)
        self.is_clipboard_empty = True
        self.paste_offset_x = 0
        self.paste_offset_y = 0
        self.undo_stack = deque(maxlen=max_paste_history)
        self.redo_stack = deque(maxlen=max_paste_history)

    def copy(self,canvas,x1,y1,x2,y2):
        x1,x2 = min(x1,x2),max(x1,x2)
        y1,y2 = min(y1,y2),max(y1,y2)
        canvas_h,canvas_w = canvas.shape[:2]
        x1,x2 = max(0,x1),min(canvas_w,x2)
        y1,y2 = max(0,y1),min(canvas_h,y2)

        if x2 <= x1 or y2 <= y1:
            return False

        self.clipboard = canvas[y1:y2,x1:x2].copy()
        self.clipboard_rect = (x1,y1,x2,y2)
        self.is_clipboard_empty = False
        self.clipboard_history.append(self.clipboard.copy())
        self.multi_clipboard.add(self.clipboard)
        return True

    def get_paste_region(self,canvas,paste_x,paste_y,center=True):
        active_clipboard = self.multi_clipboard.get_current()
        if self.is_clipboard_empty or active_clipboard is None:
            return None

        clip_h,clip_w = active_clipboard.shape[:2]
        canvas_h,canvas_w = canvas.shape[:2]

        if center:
            paste_x -= clip_w // 2
            paste_y -= clip_h // 2

        paste_x += self.paste_offset_x
        paste_y += self.paste_offset_y

        x1 = max(0,paste_x)
        y1 = max(0,paste_y)
        x2 = min(canvas_w,paste_x + clip_w)
        y2 = min(canvas_h,paste_y + clip_h)

        if x1 >= x2 or y1 >= y2:
            return None

        src_x1 = max(0,-paste_x)
        src_y1 = max(0,-paste_y)
        clip_crop = active_clipboard[src_y1:src_y1 + (y2 - y1),src_x1:src_x1 + (x2 - x1)]
        return x1,y1,x2,y2,clip_crop

    def paste(self,canvas,paste_x,paste_y,center=True,transparent=True,record_history=True):
        paste_region = self.get_paste_region(canvas,paste_x,paste_y,center=center)
        if paste_region is None:
            return False,canvas

        x1,y1,x2,y2,clip_crop = paste_region
        canvas_roi = canvas[y1:y2,x1:x2]
        before_paste = canvas_roi.copy()

        if transparent:
            clip_gray = cv2.cvtColor(clip_crop,cv2.COLOR_BGR2GRAY)
            _,clip_mask = cv2.threshold(clip_gray,1,255,cv2.THRESH_BINARY)
            clip_mask_inv = cv2.bitwise_not(clip_mask)
            canvas_bg = cv2.bitwise_and(canvas_roi,canvas_roi,mask=clip_mask_inv)
            clip_fg = cv2.bitwise_and(clip_crop,clip_crop,mask=clip_mask)
            after_paste = cv2.bitwise_or(canvas_bg,clip_fg)
        else:
            after_paste = clip_crop.copy()

        canvas[y1:y2,x1:x2] = after_paste

        if record_history:
            self.undo_stack.append({
                "region": (x1,y1,x2,y2),
                "before": before_paste,
                "after": after_paste.copy(),
            })
            self.redo_stack.clear()

        return True,canvas

    def undo(self,canvas):
        if not self.undo_stack:
            return False,canvas

        action = self.undo_stack.pop()
        x1,y1,x2,y2 = action["region"]
        canvas[y1:y2,x1:x2] = action["before"]
        self.redo_stack.append(action)
        return True,canvas

    def redo(self,canvas):
        if not self.redo_stack:
            return False,canvas

        action = self.redo_stack.pop()
        x1,y1,x2,y2 = action["region"]
        canvas[y1:y2,x1:x2] = action["after"]
        self.undo_stack.append(action)
        return True,canvas

    def get_clipboard_preview(self,max_width=80,max_height=80):
        active_clipboard = self.multi_clipboard.get_current()
        if self.is_clipboard_empty or active_clipboard is None:
            return None

        h,w = active_clipboard.shape[:2]
        scale = min(max_width / w,max_height / h,1)
        new_w = max(1,int(w * scale))
        new_h = max(1,int(h * scale))
        return cv2.resize(active_clipboard,(new_w,new_h),interpolation=cv2.INTER_AREA)

    def cycle_clipboard(self):
        active_clipboard = self.multi_clipboard.cycle_clipboard()
        if active_clipboard is None:
            self.clipboard = None
            self.is_clipboard_empty = True
            return False

        self.clipboard = active_clipboard
        self.is_clipboard_empty = False
        return True

    def clipboard_count(self):
        return len(self.multi_clipboard.clipboard_items)

    def current_clipboard_number(self):
        if self.multi_clipboard.current_index < 0:
            return 0
        return self.multi_clipboard.current_index + 1

    def clear_clipboard(self):
        self.clipboard = None
        self.clipboard_rect = None
        self.is_clipboard_empty = True
        self.multi_clipboard.clear()

    def clear_history(self):
        self.undo_stack.clear()
        self.redo_stack.clear()
