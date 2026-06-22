import React, { useState } from 'react';

export default function DataLoader() {
  const [uploadData, setUploadData] = useState({
    dataset1: { file: null, separator: ',', idColumn: '', attributes: [], headers: [], rows: [] },
    dataset2: { file: null, separator: ',', idColumn: '', attributes: [], headers: [], rows: [] },
    groundTruth: { file: null, separator: ',', idColumn: '', attributes: [], headers: [], rows: [] },
  });

  const parseAndPreviewCSV = (file, separator, datasetKey) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const headers = lines[0].split(separator).map(h => h.trim());
      const rows = lines.slice(1, 11).map(line => line.split(separator).map(cell => cell.trim()));

      setUploadData((prev) => ({
        ...prev,
        [datasetKey]: {
          ...prev[datasetKey],
          headers,
          rows,
          // Only auto-assign ID column for Dataset 1 and 2
          idColumn: datasetKey !== 'groundTruth' ? (prev[datasetKey].idColumn || headers[0] || '') : '',
          attributes: []
        },
      }));
    };

    reader.readAsText(file.slice(0, 5000));
  };

  const handleChange = (datasetKey, field, value) => {
    setUploadData((prev) => ({
      ...prev,
      [datasetKey]: {
        ...prev[datasetKey],
        [field]: value
      }
    }));
  };

  const handleFileChange = (datasetKey, event) => {
    const file = event.target.files[0];
    handleChange(datasetKey, 'file', file);

    const currentSeparator = uploadData[datasetKey].separator;
    parseAndPreviewCSV(file, currentSeparator, datasetKey);
  };

  const toggleAttribute = (datasetKey, headerName) => {
    // Prevent toggling attributes for Ground Truth
    if (datasetKey === 'groundTruth') return;

    setUploadData((prev) => {
      const currentDataset = prev[datasetKey];

      if (headerName === currentDataset.idColumn) return prev;

      const isSelected = currentDataset.attributes.includes(headerName);
      const newAttributes = isSelected
        ? currentDataset.attributes.filter(attr => attr !== headerName)
        : [...currentDataset.attributes, headerName];

      return {
        ...prev,
        [datasetKey]: {
          ...currentDataset,
          attributes: newAttributes
        }
      };
    });
  };

  const handleProcessData = () => {

    if (!uploadData.dataset1.file) {
      alert('Please upload a file for Dataset 1.');
      return;
    }

    if (uploadData.dataset1.file) {
      const formData = new FormData();
      formData.append("file", uploadData.dataset1.file);
      console.log(uploadData.dataset1.separator);
      
      formData.append("separator", uploadData.dataset1.separator);



      fetch('http://localhost:8000/upload_dataset_1', {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        console.log('Dataset 1 uploaded successfully:', data);
      })
      .catch(error => {
        console.error('Error uploading Dataset 1:', error);
      });

    }

    if (uploadData.dataset2.file) {
      const formData = new FormData();
      formData.append("file", uploadData.dataset2.file);
      formData.append("separator", uploadData.dataset2.separator);

      fetch('http://localhost:8000/upload_dataset_2', {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        console.log('Dataset 2 uploaded successfully:', data);
      })
      .catch(error => {
        console.error('Error uploading Dataset 2:', error);
      });
    }

    if (uploadData.groundTruth.file) {
      const formData = new FormData();
      formData.append("file", uploadData.groundTruth.file);
      formData.append("separator", uploadData.groundTruth.separator);
      
      fetch('http://localhost:8000/upload_ground_truth', {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        console.log('Ground Truth uploaded successfully:', data);
      })
      .catch(error => {
        console.error('Error uploading Ground Truth:', error);
      });
    }

    
    console.log('Ready to process:', uploadData);
    alert('Check your browser console to see the captured data and selected attributes!');
  };

  const styles = {
    container: { display: 'flex', flexDirection: 'column', gap: '20px' },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderLeft: '5px solid #2ecc71',
      padding: '20px',
      borderRadius: '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    header: { marginTop: '0', color: '#2c3e50', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between' },
    formGroup: { display: 'flex', gap: '15px', marginTop: '15px', alignItems: 'center', flexWrap: 'wrap' },
    label: { fontWeight: '600', fontSize: '0.9rem', color: '#34495e' },
    input: { padding: '8px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '0.9rem' },
    select: { padding: '8px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: '#fff' },
    fileInput: { padding: '5px', fontSize: '0.9rem' },
    submitButton: {
      padding: '12px 24px', backgroundColor: '#3498db', color: 'white', border: 'none',
      borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
      alignSelf: 'flex-start', marginTop: '10px',
    },
    instructions: { fontSize: '0.9rem', color: '#7f8c8d', marginTop: '15px', marginBottom: '5px' },
    tableWrapper: {
      marginTop: '10px',
      overflowX: 'auto',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      maxHeight: '300px',
      overflowY: 'auto'
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
    thInteractive: (isId, isAttribute) => ({
      padding: '10px',
      textAlign: 'left',
      backgroundColor: isId ? '#ecf0f1' : isAttribute ? '#dff9fb' : '#f8f9fa',
      color: isId ? '#7f8c8d' : isAttribute ? '#2980b9' : '#2c3e50',
      borderBottom: '2px solid #bdc3c7',
      cursor: isId ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.2s',
      border: isAttribute ? '2px solid #3498db' : '1px solid #e0e0e0',
    }),
    thReadOnly: {
      padding: '10px',
      textAlign: 'left',
      backgroundColor: '#f8f9fa',
      color: '#2c3e50',
      borderBottom: '2px solid #bdc3c7',
      border: '1px solid #e0e0e0',
      cursor: 'default'
    },
    td: { padding: '8px 10px', borderBottom: '1px solid #ecf0f1', color: '#555' },
    badge: {
      fontSize: '0.65rem',
      backgroundColor: '#95a5a6',
      color: '#fff',
      padding: '2px 6px',
      borderRadius: '10px',
      marginLeft: '8px',
      verticalAlign: 'middle'
    }
  };

  const datasets = [
    { key: 'dataset1', title: 'Dataset 1' },
    { key: 'dataset2', title: 'Dataset 2' },
    { key: 'groundTruth', title: 'Ground Truth (Optional)' },
  ];

  return (
    <div style={styles.container}>
      {datasets.map((ds) => {
        const data = uploadData[ds.key];
        const isGroundTruth = ds.key === 'groundTruth';

        return (
          <div key={ds.key} style={styles.card}>
            <div style={styles.header}>
              <span>{ds.title}</span>
              {data.file && <span style={{fontSize: '0.8rem', color: '#7f8c8d', fontWeight: 'normal'}}>
                {data.file.name} ({(data.file.size / 1024).toFixed(1)} KB)
              </span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>CSV File:</label>
              <input
                type="file"
                accept=".csv"
                style={styles.fileInput}
                onChange={(e) => handleFileChange(ds.key, e)}
              />

              <label style={styles.label}>Separator:</label>
              <input
                type="text"
                maxLength="3"
                style={{ ...styles.input, width: '50px', textAlign: 'center' }}
                value={data.separator}
                onChange={(e) => {
                  handleChange(ds.key, "separator", e.target.value);
                  if (data.file) parseAndPreviewCSV(data.file, e.target.value, ds.key);
                }}
                placeholder=","
              />

              {/* Conditionally render the ID column dropdown only if it's NOT ground truth */}
              {!isGroundTruth && (
                <>
                  <label style={styles.label} style={{ marginLeft: '10px' }}>ID Column:</label>
                  <select
                    style={styles.select}
                    value={data.idColumn}
                    onChange={(e) => handleChange(ds.key, 'idColumn', e.target.value)}
                    disabled={data.headers.length === 0}
                  >
                    <option value="" disabled>Select ID</option>
                    {data.headers.map((header, idx) => (
                      <option key={idx} value={header}>{header}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {data.headers.length > 0 && (
              <>
                {/* Conditionally render instructions */}
                {!isGroundTruth && (
                  <div style={styles.instructions}>
                    <strong>Select Attributes:</strong> Click the column headers below to select the attributes you want to use for matching.
                  </div>
                )}

                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {data.headers.map((header, index) => {
                          // For Ground Truth, render a static read-only header
                          if (isGroundTruth) {
                            return (
                              <th key={index} style={styles.thReadOnly}>
                                {header}
                              </th>
                            );
                          }

                          // For Datasets 1 & 2, render interactive headers
                          const isId = data.idColumn === header;
                          const isAttribute = data.attributes.includes(header);

                          return (
                            <th
                              key={index}
                              style={styles.thInteractive(isId, isAttribute)}
                              onClick={() => toggleAttribute(ds.key, header)}
                              title={isId ? "ID column cannot be an attribute" : "Click to select as an attribute"}
                            >
                              {header}
                              {isAttribute && ' ✓'}
                              {isId && <span style={styles.badge}>ID</span>}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} style={styles.td}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })}

      <button style={styles.submitButton} onClick={handleProcessData}>
        Confirm Data & Proceed
      </button>
    </div>
  );
}