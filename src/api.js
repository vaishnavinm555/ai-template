import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
});

export const checkHealth = async () => {
    const response = await api.get('/');
    return response.data;
};

export const generateReport = async (formData) => {
    const response = await api.post('/generate', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export default api;
