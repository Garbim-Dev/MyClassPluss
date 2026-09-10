import axios from 'axios';

const getBaseUrl = () => {
  const host = window.location.hostname || 'localhost';
  return `http://${host}:3000`;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('@MyClassPluss:token') ||
    sessionStorage.getItem('@OffClass:token') ||
    localStorage.getItem('@OffClass:token') ||
    localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});