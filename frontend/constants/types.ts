export interface Station {
  stationuuid: string;
  name: string;
  stream_url: string;
  url?: string;
  url_resolved?: string;
  homepage?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  language?: string;
  languagecodes?: string;
  codec?: string;
  bitrate?: number;
  votes?: number;
  lastcheckok?: number;
  geo_lat?: number | null;
  geo_long?: number | null;
}

export interface StationsResponse {
  total: number;
  offset: number;
  limit: number;
  stations: Station[];
}
