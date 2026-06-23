import React from 'react';
import logo from './assets/pyjedai.logo.drawio.webp';
import privjedai from './assets/privjedai-logo.jpeg'


export default function WorkflowSelection({ selectedWorkflow, onSelectWorkflow }) {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '30px',
      marginTop: '20px'
    },
    header: {
      textAlign: 'center',
      color: '#2c3e50',
      marginBottom: '10px'
    },
    panelContainer: {
      display: 'flex',
      gap: '30px',
      justifyContent: 'center',
      width: '100%',
      maxWidth: '800px'
    },
    panel: (isSelected) => ({

      flex: 1,
      width: '100%',
      
      userSelect: 'none',        // Standard syntax for modern browsers
      WebkitUserSelect: 'none',  // Safari support
      msUserSelect: 'none',      // Legacy IE/Edge support

      // 1. Button Resets (removes default ugly button styling)
      appearance: 'none',
      outline: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '30px 20px',
      borderRadius: '12px',
      cursor: 'pointer',
      
      // 2. The smooth animation transition
      transition: 'all 0.3s ease-in-out',
      
      // 3. The "Transparent to Highlighted" Logic
      // If selected: Solid white background. If not: highly transparent white.
      backgroundColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
      
      // If selected: Blue border. If not: transparent border to hold the spacing.
      border: isSelected ? '3px solid #3498db' : '3px solid transparent',
      
      // If selected: Full opacity and a nice glowing shadow. If not: slightly faded.
      opacity: isSelected ? 1 : 0.6,
      boxShadow: isSelected 
        ? '0 10px 20px rgba(52, 152, 219, 0.2)' 
        : '0 4px 6px rgba(0,0,0,0.05)',
        
      // Bonus: Adds a slight "pop up" 3D effect when selected
      transform: isSelected ? 'translateY(-5px)' : 'translateY(0)',
    }),
    icon: {
      fontSize: '3rem',
      marginBottom: '20px'
    },
    title: {
      fontSize: '1.4rem',
      color: '#2c3e50',
      marginBottom: '15px',
      fontWeight: 'bold'
    },
    description: {
      fontSize: '0.95rem',
      color: '#7f8c8d',
      lineHeight: '1.5'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Choose Your Matching Workflow</h2>
        <p style={{ color: '#7f8c8d' }}>Select the methodology that fits your data sharing and privacy requirements.</p>
      </div>

      <div style={styles.panelContainer}>
        {/* Entity Resolution Panel */}
        <div
          style={styles.panel(selectedWorkflow === 'ER')}
          onClick={() => onSelectWorkflow('ER')}
        >

          <div style={styles.title}>Entity Resolution</div>
          <div style={styles.icon}>
            <img src={logo} alt="Logo" style={{
              width: '40%',
              height: 'auto',
              objectFit: 'contain'
            }} />
          </div>
          <div style={styles.description}>
            Standard deduplication and record linkage. Best when you have full access to the raw data in plain text.
          </div>
        </div>

        {/* PPRL Panel */}
        <div
          style={styles.panel(selectedWorkflow === 'PPRL')}
          onClick={() => onSelectWorkflow('PPRL')}
        >

          <div style={{
            fontSize: '1rem',
            color: '#2c3e50',
            marginBottom: '15px',
            fontWeight: 'bold'
            }}>Privacy-Preserving Record Linkage</div>

          <div style={styles.icon}>
            <img src={privjedai} alt="Logo" style={{
              width: '45%',
              height: 'auto',
              objectFit: 'contain'
            }} />
          </div>
          <div style={styles.description}>
            Secure matching using cryptographic hashing and Bloom filters. Best for cross-organizational data sharing where PII must remain hidden.
          </div>
        </div>
      </div>
    </div>
  );
}