import apiClient from '../utils/apiclient';

const VendorFactorController = {
  async getFactors(orgId) {
    return apiClient.post('/icx_scope3_get_factor', { orgId });
  },

  async deleteFactor(factor) {
    return apiClient.post('/icx_scope3_delete_factor', factor);
  }
};

export default VendorFactorController;
