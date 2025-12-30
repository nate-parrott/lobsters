declare module 'mobile-detect' {
  export default class MobileDetect {
    constructor(userAgent: string);
    mobile(): string | null;
    tablet(): string | null;
    phone(): string | null;
    os(): string | null;
  }
}
