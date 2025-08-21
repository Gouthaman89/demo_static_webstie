// NOTE: This file lives under "components/Table /personDataTable.js" (folder has a space). Consider renaming folder to "Table" and fixing imports.
import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TablePagination from '@material-ui/core/TablePagination';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Modal from '@material-ui/core/Modal';
import Typography from '@material-ui/core/Typography';

const DataTable = ({
  columns = [],
  rows = [],
  onEdit,
  onDelete,
  onSendEmail,
  onReset,
  showActions = false,
  personId,
}) => {
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);

    // State to control "Under Construction" Modal
    const [underConstructionOpen, setUnderConstructionOpen] = React.useState(false);

    // Ensure the current page is within the valid range
    React.useEffect(() => {
      const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
      if (page > totalPages - 1) {
        setPage(0);
      }
    }, [rows, rowsPerPage, page]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        const newRowsPerPage = parseInt(event.target.value, 10);
        setRowsPerPage(newRowsPerPage);
        setPage(0); // Reset to the first page when rows per page changes
    };

    // Handle Send Email Button Click
    const handleSendEmail = () => {
        setUnderConstructionOpen(true); // Open the modal
    };

    return (
        <>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell
                                    key={col.field}
                                    style={{ fontWeight: 'bold' }}
                                >
                                    {col.label || col.field}
                                </TableCell>
                            ))}
                            {showActions && (
                                <TableCell style={{ fontWeight: 'bold' }}>
                                    Actions
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length > 0 ? (
                          rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                            <TableRow key={row.id || JSON.stringify(row)}>
                              {columns.map((col) => (
                                <TableCell key={col.field}>
                                  {col.field === 'active' ? (
                                    <Box
                                      style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        borderRadius: 8,
                                        color: row[col.field] ? '#1b5e20' : '#b71c1c',
                                        backgroundColor: row[col.field] ? '#c8e6c9' : '#ffcdd2',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                      }}
                                    >
                                      {row[col.field] ? 'Active' : 'Inactive'}
                                    </Box>
                                  ) : (
                                    String(row[col.field] ?? '')
                                  )}
                                </TableCell>
                              ))}
                              {showActions && (
                                <TableCell>
                                  <Box style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                    <Button
                                      variant="contained"
                                      color="primary"
                                      size="small"
                                      onClick={() => onEdit && onEdit(row)}
                                    >
                                      Edit
                                    </Button>
                                    {personId !== row.id && row.rolename !== '供應商窗口' && row.rolename !== '碳記帳士' && (
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => onReset && onReset(row.id)}
                                        style={{ backgroundColor: row.active ? '#d32f2f' : '#2e7d32', color: '#fff' }}
                                      >
                                        {row.active ? 'Deactivate' : 'Activate'}
                                      </Button>
                                    )}
                                    {personId !== row.id && (
                                      <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => onReset && onReset(row.id)}
                                        style={{ backgroundColor: '#2e7d32', color: '#fff' }}
                                      >
                                        Assign OrgAdmin
                                      </Button>
                                    )}
                                  </Box>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={columns.length + (showActions ? 1 : 0)} style={{ textAlign: 'center', padding: 24 }}>
                              No data available
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 15]}
                    component="div"
                    count={rows ? rows.length : 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onChangePage={handleChangePage}
                    onChangeRowsPerPage={handleChangeRowsPerPage}
                />
            </TableContainer>

            {/* Under Construction Modal */}
            <Modal
                open={underConstructionOpen}
                onClose={() => setUnderConstructionOpen(false)}
            >
                <Box
                    style={{
                        padding: 32,
                        backgroundColor: '#fff',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        borderRadius: 8,
                        minWidth: '300px',
                        margin: '20% auto 0',
                        textAlign: 'center',
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        🚧 Under Construction 🚧
                    </Typography>
                    <Typography variant="body1">
                        This feature is currently under development. Please check back later!
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        style={{ marginTop: 16 }}
                        onClick={() => setUnderConstructionOpen(false)}
                    >
                        Close
                    </Button>
                </Box>
            </Modal>
        </>
    );
};

export default DataTable;