import { isMobile } from './input';
import { Vec2 } from './types';

export interface UICallbacks {
  onReelToggle: () => void;
}

export type ReelButtonMode = 'drop' | 'pickup' | 'deposit' | 'disabled';

export interface MinimapData {
  boatPosition: Vec2;
  boatHeading: number;
  droppedTraps: Vec2[];
  islandPolygons: Vec2[][];
  portCenter: Vec2 | null;
}

const MINIMAP_RADIUS = 70;
const MINIMAP_WORLD_RADIUS = 100; // World units visible in minimap

export class GameUI {
  private container: HTMLDivElement;
  private lobsterCounter: HTMLDivElement;
  private joystickZone: HTMLDivElement;
  private reelButton: HTMLButtonElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private overlayTimeout: number | null = null;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;

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

    // Minimap (top left)
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = MINIMAP_RADIUS * 2;
    this.minimapCanvas.height = MINIMAP_RADIUS * 2;
    this.minimapCanvas.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      width: ${MINIMAP_RADIUS * 2}px;
      height: ${MINIMAP_RADIUS * 2}px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.5);
      background: rgba(30, 60, 100, 0.7);
      pointer-events: none;
    `;
    this.container.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;

    // Lobster counter (top right)
    this.lobsterCounter = document.createElement('div');
    this.lobsterCounter.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
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

    // Reel button (centered at bottom)
    this.reelButton = this.createReelButton(() => this.callbacks.onReelToggle());
    this.container.appendChild(this.reelButton);

    document.body.appendChild(this.container);
  }

  private createReelButton(onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = 'Drop Trap';
    button.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      min-width: 160px;
      padding: 16px 32px;
      border-radius: 30px;
      border: none;
      background: rgba(255, 255, 255, 0.3);
      font-family: 'Love Ya Like A Sister', cursive;
      font-size: 24px;
      color: white;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4);
      cursor: pointer;
      pointer-events: auto;
      transition: background 0.2s, transform 0.1s;
    `;
    button.addEventListener('click', onClick);
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      onClick();
    });
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(255, 255, 255, 0.45)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(255, 255, 255, 0.3)';
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
        this.reelButton.textContent = 'Drop Trap';
        this.reelButton.style.opacity = '1';
        this.reelButton.style.background = 'rgba(255, 255, 255, 0.3)';
        this.reelButton.disabled = false;
        break;
      case 'pickup':
        this.reelButton.textContent = 'Collect Trap';
        this.reelButton.style.opacity = '1';
        this.reelButton.style.background = 'rgba(100, 200, 120, 0.5)';
        this.reelButton.disabled = false;
        break;
      case 'deposit':
        this.reelButton.textContent = 'Deposit Lobsters';
        this.reelButton.style.opacity = '1';
        this.reelButton.style.background = 'rgba(255, 180, 100, 0.5)';
        this.reelButton.disabled = false;
        break;
      case 'disabled':
        this.reelButton.textContent = 'Drop Trap';
        this.reelButton.style.opacity = '0.3';
        this.reelButton.style.background = 'rgba(255, 255, 255, 0.3)';
        this.reelButton.disabled = true;
        break;
    }
  }

  updateMinimap(data: MinimapData): void {
    const ctx = this.minimapCtx;
    const r = MINIMAP_RADIUS;
    const scale = r / MINIMAP_WORLD_RADIUS;

    // Clear with ocean color
    ctx.clearRect(0, 0, r * 2, r * 2);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = 'rgba(30, 80, 120, 0.9)';
    ctx.fill();

    // Transform world coords to minimap coords (boat-centric)
    const worldToMinimap = (worldX: number, worldZ: number): { x: number; y: number; inRange: boolean } => {
      const relX = worldX - data.boatPosition.x;
      const relZ = worldZ - data.boatPosition.z;

      // Rotate so boat heading is "up" (adjusted rotation for correct orientation)
      const angle = data.boatHeading // -data.boatHeading - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotX = relX * cos - relZ * sin;
      const rotZ = relX * sin + relZ * cos;

      const x = r - rotX * scale; // negate to fix horizontal mirroring
      const y = r - rotZ * scale; // flip Z for screen coords

      const dist = Math.sqrt(relX * relX + relZ * relZ);
      const inRange = dist <= MINIMAP_WORLD_RADIUS;

      return { x, y, inRange };
    };

    // Draw islands
    ctx.fillStyle = 'rgba(60, 80, 50, 0.9)';
    ctx.strokeStyle = 'rgba(40, 60, 35, 1)';
    ctx.lineWidth = 1;

    for (const polygon of data.islandPolygons) {
      if (polygon.length < 3) continue;

      // Check if any point is in range
      let anyInRange = false;
      for (const v of polygon) {
        const p = worldToMinimap(v.x, v.z);
        if (p.inRange) {
          anyInRange = true;
          break;
        }
      }
      if (!anyInRange) continue;

      ctx.beginPath();
      const first = worldToMinimap(polygon[0].x, polygon[0].z);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < polygon.length; i++) {
        const p = worldToMinimap(polygon[i].x, polygon[i].z);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Draw dropped traps
    ctx.fillStyle = '#ffcc00';
    for (const trap of data.droppedTraps) {
      const p = worldToMinimap(trap.x, trap.z);
      if (!p.inRange) continue;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw port (always visible - clamped to edge if outside)
    if (data.portCenter) {
      const portPos = worldToMinimap(data.portCenter.x, data.portCenter.z);

      let drawX = portPos.x;
      let drawY = portPos.y;

      if (!portPos.inRange) {
        // Clamp to edge of circle
        const dx = portPos.x - r;
        const dy = portPos.y - r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const edgeR = r - 8; // slight offset from edge
          drawX = r + (dx / dist) * edgeR;
          drawY = r + (dy / dist) * edgeR;
        }
      }

      // Draw port marker (house icon)
      ctx.fillStyle = '#ff6b6b';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;

      // Draw a house shape
      ctx.beginPath();
      ctx.moveTo(drawX, drawY - 8); // roof peak
      ctx.lineTo(drawX + 6, drawY - 2); // roof right
      ctx.lineTo(drawX + 4, drawY - 2); // right wall top
      ctx.lineTo(drawX + 4, drawY + 5); // right wall bottom
      ctx.lineTo(drawX - 4, drawY + 5); // left wall bottom
      ctx.lineTo(drawX - 4, drawY - 2); // left wall top
      ctx.lineTo(drawX - 6, drawY - 2); // roof left
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Draw boat (center, pointing up)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(r, r - 6); // bow
    ctx.lineTo(r + 4, r + 5); // stern right
    ctx.lineTo(r - 4, r + 5); // stern left
    ctx.closePath();
    ctx.fill();

    ctx.restore();
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
