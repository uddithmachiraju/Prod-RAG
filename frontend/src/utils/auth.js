const API_BASE_URL = 'http://localhost:80';

export const saveAuthData = (authData = {}) => {
  if (authData.access_token) {
    localStorage.setItem('token', authData.access_token);
  }

  if (authData.refresh_token) {
    localStorage.setItem('refresh_token', authData.refresh_token);
  }
};

export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
};

export const getAuthHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem('token');
  return {
    ...(extraHeaders || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.detail || 'Unable to refresh session');
  }

  const data = await response.json();
  saveAuthData(data);
  return data;
};

export const requestWithRefresh = async (url, options = {}, callbacks = {}) => {
  const { onAuthFailure } = callbacks;
  const requestOptions = {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getAuthHeaders(options.headers || {}),
    },
  };

  let response = await fetch(url, requestOptions);

  if (response.status !== 401) {
    return response;
  }

  try {
    await refreshAccessToken();
  } catch (error) {
    if (onAuthFailure) {
      onAuthFailure();
    }
    throw error;
  }

  const retriedOptions = {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getAuthHeaders(options.headers || {}),
    },
  };

  response = await fetch(url, retriedOptions);
  return response;
};

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem('refresh_token');

  try {
    if (refreshToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } catch (error) {
    console.warn('Logout request failed:', error);
  } finally {
    clearAuthData();
  }
};
