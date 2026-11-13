import { apiClient } from '../../../services/api';

export const rcaService = {
  list: async () => {
    const res = await apiClient.get('/rca');
    return res.data || [];
  },
  get: async (rcaId) => {
    const res = await apiClient.get(`/rca/${rcaId}`);
    return res.data;
  },
  create: async (data) => {
    const res = await apiClient.post('/rca', data);
    return res.data;
  },
  approve: async (rcaId) => {
    const res = await apiClient.post(`/rca/${rcaId}/approve`);
    return res.data;
  },
};

export default rcaService;
