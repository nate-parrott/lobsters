import MobileDetect from 'mobile-detect';
import nipplejs, { JoystickManager } from 'nipplejs';
import { InputState } from './types';

export function isMobile(): boolean {
  const md = new MobileDetect(window.navigator.userAgent);
  return md.mobile() !== null || md.tablet() !== null;
}

// Tweak this to adjust joystick sensitivity (lower = less sensitive)
const JOYSTICK_SENSITIVITY = 1;

export class InputManager {
  private keys: Set<string> = new Set();
  private joystickInput: { forward: number; turn: number } = { forward: 0, turn: 0 };
  private joystick: JoystickManager | null = null;
  private mobile: boolean;

  constructor() {
    this.mobile = isMobile();
    this.setupKeyboard();

    if (this.mobile) {
      this.setupJoystick();
    } else {
      // Hide joystick zone on desktop
      const zone = document.getElementById('joystick-zone');
      if (zone) zone.style.display = 'none';
    }
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Prevent arrow keys from scrolling
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
  }

  private setupJoystick(): void {
    const zone = document.getElementById('joystick-zone');
    if (!zone) return;

    this.joystick = nipplejs.create({
      zone,
      mode: 'static',
      position: { left: '120px', bottom: '120px' },
      color: 'white',
      size: 150,
    });

    this.joystick.on('move', (_evt, data) => {
      if (data.vector) {
        // Nipple gives x/y, we map to forward/turn
        // y is forward/back, x is turn (inverted)
        this.joystickInput.forward = data.vector.y * JOYSTICK_SENSITIVITY;
        this.joystickInput.turn = -data.vector.x * JOYSTICK_SENSITIVITY;
      }
    });

    this.joystick.on('end', () => {
      this.joystickInput.forward = 0;
      this.joystickInput.turn = 0;
    });
  }

  getInput(): InputState {
    let forward = 0;
    let turn = 0;

    // Keyboard input
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
      forward += 1;
    }
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
      forward -= 1;
    }
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      turn += 1;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      turn -= 1;
    }

    // Combine with joystick (joystick overrides if active)
    if (this.mobile && (this.joystickInput.forward !== 0 || this.joystickInput.turn !== 0)) {
      forward = this.joystickInput.forward;
      turn = this.joystickInput.turn;
    }

    return { forward, turn };
  }

  destroy(): void {
    if (this.joystick) {
      this.joystick.destroy();
    }
  }
}
