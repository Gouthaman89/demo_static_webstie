// src/components/Form/DataForm.js

import React from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import MenuItem from '@material-ui/core/MenuItem';

const DataForm = ({ fields, values, onChange, onSubmit }) => {
  return (
    <Box component="form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fields.map((field) => (
        <div key={field.name}>
          {field.type === 'checkbox' ? (
            <FormControlLabel
              control={
                <Checkbox
                  name={field.name}
                  checked={Boolean(values[field.name])} // Use 'values' instead of 'formData'
                  onChange={(e) =>
                    onChange({
                      target: { name: field.name, value: e.target.checked },
                    })
                  }
                  color="primary"
                />
              }
              label={field.label}
            />
          ) : field.type === 'dropdown' ? (
            <TextField
              select
              label={field.label}
              name={field.name}
              value={values[field.name] || ''}
              onChange={onChange}
              required={field.required}
              fullWidth
            >
              {field.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label={field.label}
              name={field.name}
              type={field.type || 'text'}
              value={values[field.name] || ''}
              onChange={onChange}
              required={field.required}
              fullWidth
            />
          )}
        </div>
      ))}
      <Button variant="contained" type="submit">
        Submit
      </Button>
    </Box>
  );
};

export default DataForm;