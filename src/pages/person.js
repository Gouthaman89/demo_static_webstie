// src/pages/person.js

import Loader from '../components/Loader/loader';
import React, { useState, useEffect } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import PersonDataTable from '../components/Table/personDataTable';
import PersonDataForm from '../components/Form/Person_DataForm';
import * as PageController from '../controllers/PageControllers';
import i18n from '../i18n';
import * as XLSX from 'xlsx';
import { useAuth } from '../components/AuthContext';

const Person = () => {
    const { personId } = useAuth();
    const t = (key) => (i18n && typeof i18n.t === 'function' ? i18n.t(key) : key);
    const endpoint = '/person';
    const add_endpoint = '/add_person';
    const orglist_endpoint = '/orglist';
    const person_active_or_deactive_endpoint = '/person_active_or_deactive';
    const assignEndpoint = '/asign_orglist';
    const [rows, setRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [isEdit, setIsEdit] = useState(false);
    const [loading, setLoading] = useState(false);

    // Organization Modal State
    const [orgModalOpen, setOrgModalOpen] = useState(false);
    const [orgList, setOrgList] = useState([]);
    const [selectedRowId, setSelectedRowId] = useState(null);

    const columns = [
        { field: 'name', label: t('name') },
        { field: 'tel', label: t('telephone') },
        { field: 'email', label: t('email') },
        { field: 'pid', label: t('employeeID') },
        { field: 'dateofstart', label: t('dateOfStart') },
        { field: 'active', label: t('status') },
        { field: 'orgname', label: t('orgName') },
        { field: 'rolename', label: t('roleName') },
    ];

    const fields = [
        { name: 'name', label: t('name'), required: true },
        { name: 'tel', label: t('telephone'), required: true },
        { name: 'email', label: t('email'), required: true },
        { name: 'pid', label: t('employeeID'), required: true },
        { name: 'fax', label: t('fax'), required: false },
        { name: 'mobile', label: t('mobile'), required: false },
    ];

    const mergeRows = (rows) => {
        const groupedData = {};
    
        rows.forEach((row) => {
            if (!groupedData[row.id]) {
                groupedData[row.id] = {
                    ...row,
                    orgNames: [row.orgname],
                    roleNames: [row.rolename],
                };
            } else {
                groupedData[row.id].orgNames.push(row.orgname);
                groupedData[row.id].roleNames.push(row.rolename);
            }
        });
    
        return Object.values(groupedData).map((row) => ({
            ...row,
            orgname: row.orgNames.join(", "),
            rolename: row.roleNames.join(", "),
        }));
    };

    // Function to load table data
    const loadTableData = () => {
        setLoading(true);
        const tempEndpoint = `${endpoint}?personId=${personId}`;
        PageController.loadData(tempEndpoint, (data) => {
            const mergedData = mergeRows(data); // Merge the data
            setRows(mergedData);
            setFilteredRows(mergedData);
            setLoading(false);
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { data: formData, personId };
        if (isEdit) {
            PageController.updateRecord(endpoint, formData.id, payload, loadTableData);
        } else {
            PageController.saveData(add_endpoint, payload, loadTableData);
        }
        setFormOpen(false);
        setFormData({});
        setIsEdit(false);
    };

    // Function to handle Excel sample download
    const handleDownloadSample = () => {
        const sampleData = [
            { name: 'John Doe', tel: '1234567890', email: 'john@example.com', pid: 'EMP001' },
        ];
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample');
        XLSX.writeFile(workbook, 'sample_person_data.xlsx');
    };

    // Function to handle Excel file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const parsedData = XLSX.utils.sheet_to_json(worksheet);

                // Push parsed data to the API
                parsedData.forEach((row) => {
                    const payload = { data: row, personId };
                    PageController.saveData(add_endpoint, payload, loadTableData);
                });
            };
            reader.readAsArrayBuffer(file);
        }
    };

    // Handle "Assign OrgAdmin" button click
    const handleAssignOrgAdmin = async (rowId) => {
        try {
            const tempEndpoint = `${person_active_or_deactive_endpoint}?l_personId=${rowId}`;
            
            // Fetch data using PageController
            await PageController.loadData(tempEndpoint, (data) => {
                setOrgList(data); // Correctly set the fetched data to state
                loadTableData(); // Reload the table data
               // setSelectedRowId(rowId); // Set the selected row ID
               // setOrgModalOpen(true); // Open the modal to display org list
            });
        } catch (error) {
            console.error(t('errorFetchingOrgList'), error);
        }
    };

    const handleOrgSelect = async (orgId) => {
        console.log(t('assigningOrgAdmin', { selectedRowId, orgId }));
        // Add API call to assign OrgAdmin here
        try {
            const assignEndpoint1 = `${assignEndpoint}?personId=${selectedRowId}&orgid=${orgId}`;
            
            // Fetch data using PageController
            await PageController.loadData(assignEndpoint1, (data) => {
                console.log(t('orgAdminAssignedSuccessfully'));
                setOrgModalOpen(false); // Close the modal
                // Clear the table before reloading
                setRows([]);          // Clear the table data
                setFilteredRows([]);  // Clear the filtered rows

                loadTableData();
            });
        } catch (error) {
            console.error(t('errorFetchingOrgList'), error);
        }
        setOrgModalOpen(false);
    };

    useEffect(() => {
        loadTableData();
    }, []);

    return (
      <>
        {loading ? (
          <Loader />
        ) : (
        <Box style={{ padding: 24, backgroundColor: '#fff', borderRadius: 8 }}>
            <Typography variant="h4" gutterBottom>
                {t('personManagement')}
            </Typography>

            <Box style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <Button variant="contained" onClick={handleDownloadSample}>
                    {t('downloadExcelSample')}
                </Button>
                <Button variant="contained" component="label">
                    {t('uploadExcel')}
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        hidden
                        onChange={handleFileUpload}
                    />
                </Button>
                <Button variant="contained" onClick={() => setFormOpen(true)}>
                    {t('addNewPerson')}
                </Button>
            </Box>

            <PersonDataTable
                columns={columns}
                rows={filteredRows}
                onEdit={(row) => {
                    setFormData(row);
                    setIsEdit(true);
                    setFormOpen(true);
                }}
                onDelete={(id) => PageController.deleteRecord(endpoint, id, loadTableData)}
                onReset={(rowId) => handleAssignOrgAdmin(rowId)} // Assign OrgAdmin trigger
                showActions={true}
                personId={personId}
            />

            <Modal open={formOpen} onClose={() => setFormOpen(false)}>
                <Box
                    style={{
                        padding: 32,
                        backgroundColor: '#fff',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        borderRadius: 4,
                        minWidth: '400px',
                        maxWidth: '600px',
                        margin: '10% auto 0',
                    }}
                >
                    <PersonDataForm
                        fields={fields}
                        values={formData}
                        onChange={handleChange}
                        onSubmit={handleSubmit}
                        personId={personId}
                    />
                </Box>
            </Modal>

            {/* Organization Modal */}
            <Modal open={orgModalOpen} onClose={() => setOrgModalOpen(false)}>
                <Box
                    style={{
                        padding: 32,
                        backgroundColor: '#fff',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        borderRadius: 4,
                        minWidth: '400px',
                        maxWidth: '600px',
                        margin: '10% auto 0',
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        {t('selectOrganization')}
                    </Typography>
                    <List>
                        {orgList.length > 0 ? (
                            orgList.map((org) => (
                                <ListItem key={org.organizationid} button onClick={() => handleOrgSelect(org.organizationid)}>
                                    <ListItemText primary={org.oraganization} />
                                </ListItem>
                            ))
                        ) : (
                            <ListItem>
                                <ListItemText primary={t('noOrganizationsAvailable')} />
                            </ListItem>
                        )}
                    </List>
                    <Button
                        variant="contained"
                        color="secondary"
                        style={{ marginTop: 16 }}
                        onClick={() => setOrgModalOpen(false)}
                    >
                        {t('close')}
                    </Button>
                </Box>
            </Modal>
        </Box>
        )}
      </>
    );
};

export default Person;