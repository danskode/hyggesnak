import { readable } from "svelte/store";

//===== Just a genereal store for site wide things (base url for now) ========//

// Use environment variable if available, otherwise fallback to localhost
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8081";

export const BASE_URL = readable(apiUrl);