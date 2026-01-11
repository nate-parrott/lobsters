import { isMobile } from './input';

export interface UICallbacks {
  onToggleView: () => void;
  onReelToggle: () => void;
}

export type ReelButtonMode = 'drop' | 'pickup' | 'deposit' | 'disabled';

export class GameUI {
  private container: HTMLDivElement;
  private lobsterCounter: HTMLDivElement;
  private joystickZone: HTMLDivElement;
  private viewButton: HTMLButtonElement | null = null;
  private reelButton: HTMLButtonElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private overlayTimeout: number | null = null;

  private lobsterCount = 0;
  private callbacks: UICallbacks;
  private mobile: boolean;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.mobile = isMobile();

    this.container = document.createElement('div');
    this.container.id = 'game-ui';
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 100;
    `;

    // Lobster counter (top left)
    this.lobsterCounter = document.createElement('div');
    this.lobsterCounter.style.cssText = `
      position: absolute;
      top: 76px;
      left: 16px;
      font-family: 'Love Ya Like A Sister', cursive;
      font-size: 36px;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      pointer-events: none;
    `;
    this.updateLobsterCounter();
    this.container.appendChild(this.lobsterCounter);

    // Joystick zone (bottom left, mobile only)
    this.joystickZone = document.createElement('div');
    this.joystickZone.id = 'joystick-zone';
    this.joystickZone.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      width: 150px;
      height: 150px;
      pointer-events: auto;
      display: ${this.mobile ? 'block' : 'none'};
    `;
    this.container.appendChild(this.joystickZone);

    // View toggle button (top right)
    this.viewButton = this.createButton('📷', 40, () => this.callbacks.onToggleView());
    this.viewButton.style.cssText += `
      position: absolute;
      top: 16px;
      right: 16px;
    `;
    this.container.appendChild(this.viewButton);

    // Reel button (bottom right)
    this.reelButton = this.createButton('⬇️', 60, () => this.callbacks.onReelToggle());
    this.reelButton.style.cssText += `
      position: absolute;
      bottom: 20px;
      right: 20px;
    `;
    this.container.appendChild(this.reelButton);

    document.body.appendChild(this.container);
  }

  private createButton(emoji: string, size: number, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = emoji;
    button.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: ${size / 2}px;
      border: none;
      background: rgba(255, 255, 255, 0.3);
      font-size: ${size * 0.5}px;
      cursor: pointer;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    `;
    button.addEventListener('click', onClick);
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      onClick();
    });
    return button;
  }

  private updateLobsterCounter(): void {
    this.lobsterCounter.textContent = `🦞 ${this.lobsterCount}`;
  }

  setLobsterCount(count: number): void {
    this.lobsterCount = count;
    this.updateLobsterCounter();
  }

  setReelButtonMode(mode: ReelButtonMode): void {
    if (!this.reelButton) return;

    switch (mode) {
      case 'drop':
        this.reelButton.textContent = '⬇️';
        this.reelButton.style.opacity = '1';
        this.reelButton.disabled = false;
        break;
      case 'pickup':
        this.reelButton.textContent = '🎣';
        this.reelButton.style.opacity = '1';
        this.reelButton.disabled = false;
        break;
      case 'deposit':
        this.reelButton.textContent = '🏠';
        this.reelButton.style.opacity = '1';
        this.reelButton.disabled = false;
        break;
      case 'disabled':
        this.reelButton.textContent = '⬇️';
        this.reelButton.style.opacity = '0.3';
        this.reelButton.disabled = true;
        break;
    }
  }

  showOverlay(message: string, duration: number = 2000): void {
    // Clear existing overlay
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.overlayTimeout !== null) {
      clearTimeout(this.overlayTimeout);
    }

    const fontSize = this.mobile ? 32 : 48;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Love Ya Like A Sister', cursive;
      font-size: ${fontSize}px;
      color: white;
      text-shadow: 0 2px 8px rgba(0,0,0,0.7);
      text-align: center;
      pointer-events: none;
      transition: opacity 0.3s ease-out;
    `;
    this.overlay.textContent = message;
    this.container.appendChild(this.overlay);

    // Fade out and remove
    this.overlayTimeout = window.setTimeout(() => {
      if (this.overlay) {
        this.overlay.style.opacity = '0';
        setTimeout(() => {
          if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
          }
        }, 300);
      }
    }, duration);
  }

  getJoystickZone(): HTMLDivElement {
    return this.joystickZone;
  }

  destroy(): void {
    if (this.overlayTimeout !== null) {
      clearTimeout(this.overlayTimeout);
    }
    this.container.remove();
  }
}
