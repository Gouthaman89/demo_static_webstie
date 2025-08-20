import apiClient from '../utils/apiclient';

const VendorServicesController = {
  async getServices(orgId) {
    return apiClient.post('/icx_scope3_getservice', { orgId });
  },

  async addService(service) {
    try {
      const result = await apiClient.post('/icx_scope3_add_service', service);
      console.log("✅ 新增成功:", result);
      return result;
    } catch (error) {
      console.error("❌ 新增失敗:", error);
    }
  },

  async updateService(service) {
    try {
      const result = await apiClient.post('/icx_scope3_update_service', service);
      console.log("✅ 更新成功:", result);
      return result;
    } catch (error) {
      console.error("❌ 更新失敗:", error);
    }
  },

  async deleteService(service) {
    try {
      const result = await apiClient.post('/icx_scope3_delete_service', service);
      console.log("✅ 刪除成功:", result);
      return result;
    } catch (error) {
      console.error("❌ 刪除失敗:", error);
    }
  }
};

export default VendorServicesController;
