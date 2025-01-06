import React from 'react';

const QnASection = ({ 
  status,
  currentQuestion,
  questions,
  transcript,
  questionHistory,
  isRecording,
  onStartInterview,
  onNextQuestion
}) => {
  const getCurrentQuestionIndex = () => 
    questions.findIndex(q => q.id === currentQuestion?.id);

  const getResponseForQuestion = (questionId) => {
    const historyItem = questionHistory.find(item => item.id === questionId);
    return historyItem ? historyItem.response : '';
  };

  const renderQuestion = (question) => {
    const isCurrentQuestion = question.id === currentQuestion?.id;
    const response = isCurrentQuestion ? transcript : getResponseForQuestion(question.id);

    return (
      <div key={question.id} className="mb-3">
        <div className="p-3 bg-light rounded">
          <h5 className="mb-2">{question.text}</h5>
          {question.hint && (
            <p className="text-muted small mb-0">{question.hint}</p>
          )}
        </div>
        {(response || !isCurrentQuestion) && (
          <div className="ms-4 mt-2 p-3 bg-info bg-opacity-10 rounded">
            <p className="mb-0">
              {response || "No response recorded"}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderReadyState = () => (
    <div className="d-flex align-items-center justify-content-center flex-grow-1">
      <div className="text-center">
        <h2 className="mb-4">Ready to begin your interview?</h2>
        <button
          onClick={onStartInterview}
          className="btn btn-primary btn-lg"
        >
          Start Interview
        </button>
      </div>
    </div>
  );

  const renderRecordingState = () => (
    <>
      <div className="flex-grow-1 overflow-auto mb-3">
        {questions
          .slice(0, getCurrentQuestionIndex() + 1)
          .map(renderQuestion)}
      </div>
      <div className="pt-3 border-top d-flex justify-content-between align-items-center">
        <button
          onClick={onNextQuestion}
          className="btn btn-primary"
        >
          Next Question
        </button>
        {isRecording && (
          <div className="d-flex align-items-center">
            <div 
              className="spinner-grow spinner-grow-sm text-danger me-2" 
              role="status" 
              style={{ animationDuration: '1.5s' }}
            >
              <span className="visually-hidden">Recording...</span>
            </div>
            <span className="text-muted small">Recording</span>
          </div>
        )}
      </div>
    </>
  );

  const renderCompleteState = () => (
    <div className="d-flex align-items-center justify-content-center flex-grow-1">
      <div className="text-center">
        <h2 className="mb-4">Interview Complete</h2>
        <p className="text-muted">
          Thank you for completing your interview.
        </p>
      </div>
    </div>
  );

  return (
    <div className="card h-100">
      <div className="card-body d-flex flex-column">
        {status === 'ready' && renderReadyState()}
        {status === 'recording' && renderRecordingState()}
        {status === 'complete' && renderCompleteState()}
      </div>
    </div>
  );
};

export default QnASection;