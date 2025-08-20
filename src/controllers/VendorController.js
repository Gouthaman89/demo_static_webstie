import apiClient from '../utils/apiclient';

export const VendorController = {
  async loadVendorData(orgId) {
    return apiClient.post('/icx_scope3_getvender', { orgId });
  },

  async getGHGOptions() {
    return apiClient.get('/icx_dropdown_scope');
  },

  async submitVendor(form) {
    try {
      const result = await apiClient.post('/icx_scope3_add_vender', form);
      console.log("新增成功:", result);
      return result;
    } catch (err) {
      console.error("提交失敗:", err);
    }
  },

  async updateVendor(updatedVendor) {
    try {
      const result = await apiClient.post('/icx_scope3_update_vender', updatedVendor);
      console.log("更新成功", result);
      return result;
    } catch (error) {
      console.error("更新失敗", error);
    }
  },

  async deleteVendor(vendor) {
    try {
      const result = await apiClient.post('/icx_scope3_delete_vender', vendor);
      console.log("✅ 刪除成功:", result);
      return result;
    } catch (error) {
      console.error("❌ 刪除失敗:", error);
    }
  }
};

export default VendorController;
