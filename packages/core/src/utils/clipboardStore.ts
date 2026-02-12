import { Event } from '@/types';

class ClipboardStore {
  private lastCopiedEvent: Event | null = null;

  setEvent(event: Event) {
    this.lastCopiedEvent = event;
  }

  getEvent(): Event | null {
    return this.lastCopiedEvent;
  }

  hasEvent(): boolean {
    return this.lastCopiedEvent !== null;
  }

  clear() {
    this.lastCopiedEvent = null;
  }
}

export const clipboardStore = new ClipboardStore();
