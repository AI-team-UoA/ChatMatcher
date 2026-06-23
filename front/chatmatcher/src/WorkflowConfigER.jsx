import React, { useState } from 'react';

export default function WorkflowConfigER({ onSaveConfig }) {
  // 1. Setup unified state for all configuration parameters
  const [config, setConfig] = useState({
    filtering: 'standard_blocking',
    knnMetric: 'cosine',
    knnTopK: 5,
    knnTokenization: 'standard',
    model: 'phi3',
    strategy: 'zero_shot',
    batchSize: 4,
    fewShotNumExamples: 2,
    fewShotOrder: 'true_false',
    promptTemplate: 'Determine if Document A and Document B refer to the same real-world entity.\n\nDocument A: {record1}\nDocument B: {record2}\n\nAnswer only with Yes or No.',
    enableClustering: false,
    clusteringMethod: 'unique_mapping',
    similarityThreshold: 0.5,
  });

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('ER Configuration Saved:', config);
    if (onSaveConfig) onSaveConfig(config);
  };

  // --- Theme Styles ---
  const styles = {
    container: { display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '800px', margin: '0 auto' },
    sectionCard: {
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderLeft: '5px solid #3498db',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    sectionTitle: { marginTop: '0', marginBottom: '20px', color: '#2c3e50', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', flex: '1', minWidth: '200px' },
    row: { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '10px' },
    label: { fontWeight: '600', fontSize: '0.9rem', color: '#34495e' },
    input: { padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '0.95rem', backgroundColor: '#fff' },
    textarea: { padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '0.95rem', fontFamily: 'monospace', resize: 'vertical', minHeight: '120px' },
    conditionalBox: {
      backgroundColor: '#f8f9fa',
      border: '1px dashed #bdc3c7',
      padding: '15px',
      borderRadius: '6px',
      marginTop: '10px',
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap'
    },
    checkboxRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', cursor: 'pointer', userSelect: 'none' },
    submitButton: {
      padding: '12px 24px', backgroundColor: '#2ecc71', color: 'white', border: 'none',
      borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '10px'
    }
  };

  return (
    <form style={styles.container} onSubmit={handleSubmit}>
      <div>
        <h2>Configure Entity Resolution Pipeline</h2>
        <p style={{ color: '#7f8c8d' }}>Fine-tune the parsing blocks, execution models, prompts, and grouping algorithms.</p>
      </div>

      {/* SECTION 1: FILTERING */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>1. Filtering Strategy</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>Method</label>
          <select
            style={styles.input}
            value={config.filtering}
            onChange={(e) => handleChange('filtering', e.target.value)}
          >
            <option value="standard_blocking">Standard Blocking</option>
            <option value="knn_search">KNN-Search</option>
          </select>
        </div>

        {/* Conditional KNN Configuration Options */}
        {config.filtering === 'knn_search' && (
          <div style={styles.conditionalBox}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Metric</label>
              <select style={styles.input} value={config.knnMetric} onChange={(e) => handleChange('knnMetric', e.target.value)}>
                <option value="cosine">Cosine Similarity</option>
                <option value="dice">Dice Similarity</option>
                <option value="Jaccard">Jaccard Similarity</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Top-K</label>
              <input type="number" min="1" max="100" style={styles.input} value={config.knnTopK} onChange={(e) => handleChange('knnTopK', parseInt(e.target.value) || 1)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tokenization</label>
              <select style={styles.input} value={config.knnTokenization} onChange={(e) => handleChange('knnTokenization', e.target.value)}>
                <option value="standard">Standard Tokenization</option>
                <option value='qgrams'>Q-Grams</option>
                <option value="standard_multiset">Standard Multiset</option>
                <option value="qgrams_multiset">Q-Grams Multiset</option>
              </select>
            </div>
            {config.knnTokenization === 'qgrams' || config.knnTokenization === 'qgrams_multiset' ? (
              <div style={styles.formGroup}>
                <label style={styles.label}>Q-Gram Size</label>
                <input type="number" min="1" max="12" style={styles.input} value={config.qGramSize} onChange={(e) => handleChange('qGramSize', parseInt(e.target.value) || 1)} />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* SECTION 2: MODEL & STRATEGY */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>2. Language and Model Strategy</h3>
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Model Selection</label>
            <select style={styles.input} value={config.model} onChange={(e) => handleChange('model', e.target.value)}>
              <option value="gemma3n">Gemma 3n</option>
              <option value="phi3">Phi-3</option>
              <option value="qwen2.5">Qwen 2.5</option>
              <option value="llama3.1">Llama 3.1</option>
              <option value="orca2">Orca 2</option>
              <option value="openhermes">OpenHermes</option>
              <option value="zephyr">Zephyr</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Strategy</label>
            <select style={styles.input} value={config.strategy} onChange={(e) => handleChange('strategy', e.target.value)}>
              <option value="zero_shot">Zero Shot</option>
              <option value="few_shot">Few Shot</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Batch Size</label>
            <input type="number" min="1" max="128" style={styles.input} value={config.batchSize} onChange={(e) => handleChange('batchSize', parseInt(e.target.value) || 1)} />
          </div>
        </div>

        {/* Conditional Few-Shot Configuration Options */}
        {config.strategy === 'few_shot' && (
          <div style={styles.conditionalBox}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Number of Examples</label>
              <input type="number" min="1" max="10" style={styles.input} value={config.fewShotNumExamples} onChange={(e) => handleChange('fewShotNumExamples', parseInt(e.target.value) || 1)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Example Ordering</label>
              <select style={styles.input} value={config.fewShotOrder} onChange={(e) => handleChange('fewShotOrder', e.target.value)}>
                <option value="true_false">True then False (Matches first)</option>
                <option value="false_true">False then True (Non-matches first)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: PROMPT DESIGN */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>3. Prompt Template Definition</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>System Instructions & Template</label>
          <textarea
            style={styles.textarea}
            value={config.promptTemplate}
            onChange={(e) => handleChange('promptTemplate', e.target.value)}
          />
          <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
            Use context wrappers <code>{'{record1}'}</code> and <code>{'{record2}'}</code> where the matched row elements should be dynamically injected.
          </span>
        </div>
      </div>

      {/* SECTION 4: CLUSTERING */}
      <div style={styles.sectionCard}>
        <div style={styles.checkboxRow} onClick={() => handleChange('enableClustering', !config.enableClustering)}>
          <input type="checkbox" checked={config.enableClustering} onChange={() => {}} style={{ cursor: 'pointer', scale: '1.2' }} />
          <h3 style={{ ...styles.sectionTitle, marginBottom: '0' }}>4. Post-Process Clustering (Optional)</h3>
        </div>

        {config.enableClustering && (
          <div style={{ ...styles.conditionalBox, border: 'none', padding: '10px 0 0 0', backgroundColor: 'transparent' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Clustering Method</label>
              <select style={styles.input} value={config.clusteringMethod} onChange={(e) => handleChange('clusteringMethod', e.target.value)}>
                <option value="unique_mapping">Unique Mapping Clustering</option>
                <option value="connected_components">Connected Components</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Similarity Threshold ({config.similarityThreshold.toFixed(1)})</label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                style={{ ...styles.input, padding: '0', cursor: 'pointer' }}
                value={config.similarityThreshold}
                onChange={(e) => handleChange('similarityThreshold', parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      <button type="submit" style={styles.submitButton}>
        Save Configurations & Validate
      </button>
    </form>
  );
}