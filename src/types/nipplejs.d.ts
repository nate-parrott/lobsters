declare module 'nipplejs' {
  export interface JoystickOutputData {
    vector: {
      x: number;
      y: number;
    };
    angle: {
      degree: number;
      radian: number;
    };
    distance: number;
    force: number;
  }

  export interface JoystickManagerOptions {
    zone?: HTMLElement;
    mode?: 'static' | 'semi' | 'dynamic';
    position?: { left?: string; right?: string; top?: string; bottom?: string };
    color?: string;
    size?: number;
  }

  export interface JoystickManager {
    on(event: 'move', handler: (evt: Event, data: JoystickOutputData) => void): void;
    on(event: 'end', handler: () => void): void;
    on(event: 'start', handler: () => void): void;
    destroy(): void;
  }

  export function create(options: JoystickManagerOptions): JoystickManager;
}
