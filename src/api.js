import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
});

export const checkHealth = async () => {
    const response = await api.get('/');
    return response.data;
};

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export default api;
