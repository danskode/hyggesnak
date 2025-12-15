//============ Centralized API utility for consistent error handling and request management ===============//

import { get } from 'svelte/store';
import { auth } from '../stores/authStore.svelte.js';
import { navigate } from 'svelte-routing';
import { toast } from 'svelte-sonner';
import { BASE_URL } from './constants.js';

// Custom API Error class
export class APIError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }

    // Check if this is an authentication error
    isAuthError() {
        return this.status === 401 || this.status === 403;
    }

    // Check if this is a validation error
    isValidationError() {
        return this.status === 400;
    }

    // Check if this is a server error
    isServerError() {
        return this.status >= 500;
    }
}

// Make an authenticated API request with centralized error handling
export async function apiRequest(url, options = {}, config = {}) {
    const authData = get(auth);

    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add auth token if available
    if (authData?.token) {
        headers['Authorization'] = `Bearer ${authData.token}`;
    }

    // Build full URL (prepend BASE_URL if url is relative)
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

    try {
        // Make request
        const response = await fetch(fullUrl, {
            ...options,
            headers
        });

        // Parse response
        const data = await response.json().catch(() => ({}));

        // Handle authentication errors globally
        if (response.status === 401 || response.status === 403) {
            if (!config.skipAuthRedirect) {
                if (!config.skipToast) {
                    toast.error('Din session er udløbet. Log venligst ind igen.');
                }
                auth.logout();
                navigate('/');
            }
            throw new APIError(
                data.message || 'Unauthorized',
                response.status,
                data
            );
        }

        // Handle other errors
        if (!response.ok) {
            const errorMessage = data.message || `Request failed with status ${response.status}`;

            // Show toast for errors (unless explicitly disabled)
            if (!config.skipToast) {
                toast.error(errorMessage);
            }

            throw new APIError(errorMessage, response.status, data);
        }

        // Return successful response data
        return data;

    } catch (error) {
        // If it's already an APIError, re-throw it
        if (error instanceof APIError) {
            throw error;
        }

        // Handle network errors
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            if (!config.skipToast) {
                toast.error('Netværksfejl. Tjek din internetforbindelse.');
            }
            throw new APIError('Network error', 0, { originalError: error });
        }

        // Handle other errors
        if (!config.skipToast) {
            toast.error('En uventet fejl opstod');
        }
        throw new APIError(
            error.message || 'Unknown error',
            500,
            { originalError: error }
        );
    }
}

// Convenience methods for common HTTP methods
export async function apiGet(url, config = {}) {
    return apiRequest(url, { method: 'GET' }, config);
}

export async function apiPost(url, body, config = {}) {
    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(body)
    }, config);
}

export async function apiPut(url, body, config = {}) {
    return apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(body)
    }, config);
}

export async function apiDelete(url, config = {}) {
    return apiRequest(url, { method: 'DELETE' }, config);
}

export async function apiPatch(url, body, config = {}) {
    return apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(body)
    }, config);
}