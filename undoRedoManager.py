from collections import deque


class UndoRedoManager:
    def __init__(self,max_history=20):
        self.undo_stack = deque(maxlen=max_history)
        self.redo_stack = deque(maxlen=max_history)

    def save_state(self,canvas):
        """Save current canvas state."""
        self.undo_stack.append(canvas.copy())
        self.redo_stack.clear()

    def undo(self,canvas):
        """Restore previous canvas state."""
        if self.undo_stack:
            self.redo_stack.append(canvas.copy())
            return True,self.undo_stack.pop()
        return False,canvas

    def redo(self,canvas):
        """Restore next canvas state."""
        if self.redo_stack:
            self.undo_stack.append(canvas.copy())
            return True,self.redo_stack.pop()
        return False,canvas

    def clear(self):
        self.undo_stack.clear()
        self.redo_stack.clear()
