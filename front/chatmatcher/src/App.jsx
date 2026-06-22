import React, { useState } from 'react';
import DataLoader from './Dataloader';

function App() {
  // Track the current step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // Define our 5-step flow
  const steps = [
    'Load Data',
    'Choose Workflow',
    'Configure',
    'Matching',
    'Results'
  ];

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // --- Inline Styles ---
  const styles = {
    layout: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f4f6f8',
      fontFamily: 'system-ui, sans-serif',
      color: '#333',
    },
    navbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#2c3e50',
      padding: '15px 30px',
      color: '#ffffff',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    },
    logo: {
      fontSize: '1.4rem',
      fontWeight: 'bold',
    },
    stepperContainer: {
      backgroundColor: '#ffffff',
      padding: '20px 0',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'center',
    },
    stepper: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      width: '100%',
      maxWidth: '800px',
      padding: '0 20px',
    },
    stepItem: (index) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: currentStep === index + 1 ? '#3498db' : currentStep > index + 1 ? '#2ecc71' : '#95a5a6',
      fontWeight: currentStep === index + 1 ? 'bold' : 'normal',
    }),
    stepCircle: (index) => ({
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: currentStep === index + 1 ? '#3498db' : currentStep > index + 1 ? '#2ecc71' : '#ecf0f1',
      color: currentStep > index + 1 || currentStep === index + 1 ? '#ffffff' : '#7f8c8d',
      fontWeight: 'bold',
      fontSize: '0.9rem',
    }),
    mainContent: {
      flex: 1,
      padding: '40px 20px',
      maxWidth: '1000px',
      margin: '0 auto',
      width: '100%',
    },
    footer: {
      backgroundColor: '#ffffff',
      padding: '20px 30px',
      borderTop: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    btnBack: {
      padding: '10px 20px',
      backgroundColor: '#ecf0f1',
      color: '#7f8c8d',
      border: 'none',
      borderRadius: '4px',
      cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
      fontWeight: 'bold',
      opacity: currentStep === 1 ? 0.5 : 1,
    },
    btnNext: {
      padding: '10px 20px',
      backgroundColor: '#3498db',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      cursor: currentStep === 5 ? 'not-allowed' : 'pointer',
      fontWeight: 'bold',
      opacity: currentStep === 5 ? 0.5 : 1,
    },
    welcomeHeader: {
      textAlign: 'center',
      marginBottom: '40px',
    }
  };

  return (
    <div style={styles.layout}>
      {/* 1. Global Navigation Bar */}
      <nav style={styles.navbar}>
        <div style={styles.logo}>ChatMatcher</div>
      </nav>

      {/* 2. Global Progress Stepper */}
      <div style={styles.stepperContainer}>
        <div style={styles.stepper}>
          {steps.map((label, index) => (
            <React.Fragment key={index}>
              <div style={styles.stepItem(index)}>
                <div style={styles.stepCircle(index)}>
                  {/* Show a checkmark if completed, otherwise show the number */}
                  {currentStep > index + 1 ? '✓' : index + 1}
                </div>
                <span>{label}</span>
              </div>
              {/* Add a line between steps (except the last one) */}
              {index < steps.length - 1 && (
                <div style={{ flex: 1, height: '2px', backgroundColor: currentStep > index + 1 ? '#2ecc71' : '#ecf0f1' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. Main Content Area (Dynamic based on step) */}
      <main style={styles.mainContent}>
        {currentStep === 1 && (
          <div>
            <div style={styles.welcomeHeader}>
              <h1>Welcome to ChatMatcher</h1>
              <p>Start by securely loading your datasets below to begin the matching process.</p>
            </div>
            {/* Reusing the DataLoader component we built previously */}
            <DataLoader />
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#7f8c8d' }}>
            <h2>Step 2: Choose Workflow</h2>
            <p>UI for selecting Entity Resolution vs. PPRL goes here.</p>
          </div>
        )}

        {currentStep === 3 && (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#7f8c8d' }}>
            <h2>Step 3: Configure</h2>
            <p>UI for mapping columns and setting thresholds goes here.</p>
          </div>
        )}

        {currentStep === 4 && (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#7f8c8d' }}>
            <h2>Step 4: Matching Processing</h2>
            <p>Loading spinner and terminal read-out goes here.</p>
          </div>
        )}

        {currentStep === 5 && (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#7f8c8d' }}>
            <h2>Step 5: Results</h2>
            <p>Dashboard metrics and matched data table goes here.</p>
          </div>
        )}
      </main>

      {/* 4. Global Action Footer */}
      <footer style={styles.footer}>
        <button
          style={styles.btnBack}
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          &larr; Back
        </button>
        <button
          style={styles.btnNext}
          onClick={handleNext}
          disabled={currentStep === 5}
        >
          Next Step &rarr;
        </button>
      </footer>
    </div>
  );
}

export default App;