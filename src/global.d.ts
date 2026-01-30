declare module "@mapbox/polyline" {
  export type Coordinate = [number, number];
  export function encode(coordinates: Coordinate[]): string;
  export function decode(str: string): Coordinate[];
  const polyline: {
    encode: typeof encode;
    decode: typeof decode;
  };
  export default polyline;
}

declare const process: {
  env: Record<string, string | undefined>;
};
