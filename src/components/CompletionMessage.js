// Add this new component at the top level of your project
// src/components/CompletionMessage.js
const CompletionMessage = ({ onClose }) => {
    return (
      <div className="text-center p-4">
        <h3 className="mb-3">Interview Complete!</h3>
        <div className="alert alert-success" role="alert">
          <p className="mb-2">Thank you for completing your interview.</p>
          <p className="mb-0">We will review your responses and get back to you within 2-3 business days.</p>
        </div>
        <button 
          onClick={onClose} 
          className="btn btn-primary mt-3"
        >
          Close
        </button>
      </div>
    );
  };
  
  export default CompletionMessage;