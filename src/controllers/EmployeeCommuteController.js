import apiClient from '../utils/apiclient';

const EmployeeCommuteController = {
  async getCommutes(orgId) {
    return apiClient.post('/icx_scope3_get_commute', { orgId });
  },

  async addCommute(commute) {
    return apiClient.post('/icx_scope3_add_commute', commute);
  },

  async updateCommute(data) {
    return apiClient.post('/icx_scope3_update_commute', data);
  },

  async deleteCommute(commute) {
    return apiClient.post('/icx_scope3_delete_commute', commute);
  }
};

export default EmployeeCommuteController;
