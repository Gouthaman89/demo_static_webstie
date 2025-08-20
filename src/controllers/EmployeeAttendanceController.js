import apiClient from '../utils/apiclient';

const EmployeeAttendanceController = {
  async getRecords(orgId, year, month) {
    return apiClient.post('/icx_scope3_get_attendance', { orgId, year, month });
  },

  async addRecord(record) {
    return apiClient.post('/icx_scope3_add_attendance', record);
  },

  async updateRecord(data) {
    return apiClient.post('/icx_scope3_update_attendance', data);
  },

  async deleteRecord(row) {
    return apiClient.post('/icx_scope3_delete_attendance', row);
  },

  async syncScope3Commuting(orgId, year, month) {
    return apiClient.post('/icx_scope3_commuting', { orgId, year, month });
  },

  async checkSyncedPdf(orgId, year, month) {
    return apiClient.post('/scope3_commuting_getcurrentpdf', { orgId, year, month });
  },

  async checkSyncedProcessing(orgId, year, month) {
    return apiClient.post('/scope3_commuting_getcurrentprocessing', { orgId, year, month });
  }
};

export default EmployeeAttendanceController;
