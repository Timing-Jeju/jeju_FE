import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.example.com', // Replace with actual API base URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
