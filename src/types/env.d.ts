declare interface ImportMeta {
  readonly env: {
    // Environment variables defined in .env
    readonly VITE_UNSPLASH_ACCESS_KEY: string;
    readonly VITE_GITHUB_CLIENT_ID: string;
    readonly VITE_API_BASE_URL: string;
    readonly VITE_OPENAI_API_KEY: string;
    readonly VITE_TTS_KEY: string;
    readonly VITE_TTS_REGION: string;
  };
}

// GeoJSON 类型声明
declare module '*.geojson' {
  const value: {
    type: string;
    features: Array<{
      type: string;
      properties: Record<string, any>;
      geometry: {
        type: string;
        coordinates: any;
      };
    }>;
  };
  export default value;
}
