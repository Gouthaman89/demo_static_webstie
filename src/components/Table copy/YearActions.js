import * as PageController from '../../controllers/PageControllers';
import React from 'react';
import TableContainer from '@material-ui/core/TableContainer';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableBody from '@material-ui/core/TableBody';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import i18n from '../../i18n';

const t = (key) => (i18n && typeof i18n.t === 'function' ? i18n.t(key) : key);

const YearActions = ({ row, isEditing, onEdit, onSave, onCancel }) => {
    return (
        <>
            <button onClick={() => (isEditing ? onSave(row) : onEdit(row))}>
                {isEditing ? t('save') : t('edit')}
            </button>
            {isEditing && <button onClick={onCancel}>{t('cancel')}</button>}
        </>
    );
};

export const YearTable = ({
    yearData,
    editingYearId,
    editedCalendarType,
    setEditedCalendarType,
    setEditingYearId,
    selectedOrgId,
    fetchYearData,
    setSnackbar,
}) => {

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell style={{ fontWeight: 'bold' }}>{t('year')}</TableCell>
                        <TableCell style={{ fontWeight: 'bold' }}>{t('bookkeeperCompanyName')}</TableCell>
                        <TableCell style={{ fontWeight: 'bold' }}>{t('bookkeeperName')}</TableCell>
                        <TableCell style={{ fontWeight: 'bold' }}>{t('calendarType')}</TableCell>
                        <TableCell style={{ fontWeight: 'bold' }}>{t('actions')}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {yearData.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.year}</TableCell>
                            <TableCell>{row.bookkeepercompanyname}</TableCell>
                            <TableCell>{row.bookkeepername}</TableCell>
                            <TableCell>
                                {editingYearId === row.id ? (
                                    <RadioGroup
                                        row
                                        value={editedCalendarType}
                                        onChange={(e) => setEditedCalendarType(e.target.value)}
                                    >
                                        <FormControlLabel value="0" control={<Radio />} label={t('calendarDaily')} />
                                        <FormControlLabel value="1" control={<Radio />} label={t('calendarWorking')} />
                                    </RadioGroup>
                                ) : (
                                    row.typeofcalendar === '1' ? t('calendarWorking') : t('calendarDaily')
                                )}
                            </TableCell>
                            <TableCell>
                                <YearActions
                                    row={row}
                                    isEditing={editingYearId === row.id}
                                    onEdit={(r) => {
                                        setEditingYearId(r.id);
                                        setEditedCalendarType(r.typeofcalendar === t('calendarWorking') ? '1' : '0');
                                    }}
                                    onSave={(r) => {
                                        PageController.updateRecord('/updateyearofcarbon', r.id, {
                                            typeofcalendar: editedCalendarType,
                                            yearid: row.id,
                                        }, () => {
                                            fetchYearData(selectedOrgId);
                                            setEditingYearId(null);
                                            setSnackbar({
                                                open: true,
                                                message: t('calendarTypeUpdated'),
                                                severity: 'success',
                                            });
                                        });
                                    }}
                                    onCancel={() => setEditingYearId(null)}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default YearActions;