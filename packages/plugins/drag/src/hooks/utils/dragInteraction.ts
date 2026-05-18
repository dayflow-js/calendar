export const getClientCoordinates = (e: MouseEvent | TouchEvent) => {
  let clientX, clientY;
  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if ('changedTouches' in e && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else {
    const mouseEvent = e as MouseEvent;
    clientX = mouseEvent.clientX;
    clientY = mouseEvent.clientY;
  }

  return { clientX, clientY };
};

export const isTouchLikeEvent = (e: MouseEvent | TouchEvent) =>
  'touches' in e || 'changedTouches' in e;

export const applyGlobalDragCursor = (
  mode: 'move' | 'resize' | 'create',
  cursor: 'grabbing' | 'ew-resize' | 'ns-resize'
) => {
  const body = document.body;
  if (!body.classList.contains('df-drag-active')) {
    body.classList.add('df-drag-active');
  }
  if (body.style.cursor !== cursor) {
    body.style.cursor = cursor;
  }

  if (mode === 'move' || mode === 'create') {
    if (!body.classList.contains('df-cursor-grabbing')) {
      body.classList.add('df-cursor-grabbing');
    }
    return;
  }

  const targetClass =
    cursor === 'ew-resize' ? 'df-cursor-ew-resize' : 'df-cursor-ns-resize';
  if (!body.classList.contains(targetClass)) {
    body.classList.add(targetClass);
  }
};

export const clearGlobalDragCursor = () => {
  document.body.style.cursor = '';
  document.body.style.touchAction = '';
  document.body.classList.remove(
    'df-drag-active',
    'df-cursor-ns-resize',
    'df-cursor-ew-resize',
    'df-cursor-grabbing'
  );
};

export const addDocumentDragListeners = (
  moveHandler: (e: MouseEvent | TouchEvent) => void,
  endHandler: (e: MouseEvent | TouchEvent) => void,
  cancelHandler?: () => void
) => {
  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', endHandler);
  document.addEventListener('touchmove', moveHandler, {
    capture: true,
    passive: false,
  });
  document.addEventListener('touchend', endHandler);
  if (cancelHandler) {
    document.addEventListener('touchcancel', cancelHandler);
  }
};

export const removeDocumentDragListeners = (
  moveHandler: (e: MouseEvent | TouchEvent) => void,
  endHandler: (e: MouseEvent | TouchEvent) => void,
  cancelHandler?: () => void
) => {
  document.removeEventListener('mousemove', moveHandler);
  document.removeEventListener('mouseup', endHandler);
  document.removeEventListener('touchmove', moveHandler, {
    capture: true,
  });
  document.removeEventListener('touchend', endHandler);
  if (cancelHandler) {
    document.removeEventListener('touchcancel', cancelHandler);
  }
};
