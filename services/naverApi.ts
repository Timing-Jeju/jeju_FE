export interface Coord {
  latitude: number;
  longitude: number;
}

export interface Place {
  name: string;
  roadAddress: string;
  coord: Coord;
}
