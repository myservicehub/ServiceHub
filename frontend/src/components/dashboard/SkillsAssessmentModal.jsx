import React, { useState, useEffect } from 'react';
import { X, BookOpen, CheckCircle, Clock, Award, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { jobsAPI } from '../../api/jobs';

// Sample quiz questions based on trade categories
const getQuizQuestions = (tradeCategories = []) => {
  const generalQuestions = [
    {
      id: 1,
      question: "What is the most important factor when starting a new job?",
      options: [
        "Starting work immediately",
        "Assessing the scope and discussing with the client",
        "Quoting the highest price possible",
        "Working without a plan"
      ],
      correctIndex: 1,
    },
    {
      id: 2,
      question: "How should you handle a customer complaint?",
      options: [
        "Ignore it and continue working",
        "Argue with the customer",
        "Listen carefully, apologize, and find a solution",
        "Leave the job immediately"
      ],
      correctIndex: 2,
    },
    {
      id: 3,
      question: "What safety equipment should always be worn on a job site?",
      options: [
        "Casual clothing",
        "Appropriate PPE for the task",
        "No equipment needed",
        "Only gloves"
      ],
      correctIndex: 1,
    },
    {
      id: 4,
      question: "When is it appropriate to request an upfront payment?",
      options: [
        "Never",
        "For large jobs requiring material purchases",
        "For every small job",
        "Only after completing the work"
      ],
      correctIndex: 1,
    },
    {
      id: 5,
      question: "What should you do if you encounter unexpected issues during a job?",
      options: [
        "Fix it without telling the client",
        "Leave the job",
        "Communicate with the client and discuss options",
        "Charge extra without explanation"
      ],
      correctIndex: 2,
    },
  ];

  return generalQuestions;
};

const SkillsAssessmentModal = ({ isOpen, onClose, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const questions = getQuizQuestions(user?.trade_categories);
  const totalQuestions = questions.length;

  // Timer
  useEffect(() => {
    if (!isOpen || showResults) return;
    
    if (timeLeft <= 0) {
      handleSubmitQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, showResults]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (questionId, optionIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    return {
      correct,
      total: totalQuestions,
      percentage: Math.round((correct / totalQuestions) * 100)
    };
  };

  const handleSubmitQuiz = async () => {
    setIsLoading(true);
    const score = calculateScore();
    
    try {
      // Submit quiz results to backend
      await jobsAPI.apiClient.post('/auth/profile/skills-test', {
        score: score.percentage,
        correct_answers: score.correct,
        total_questions: score.total,
        passed: score.percentage >= 60
      });

      if (refreshUser) await refreshUser();
      setShowResults(true);

      if (score.percentage >= 60) {
        toast({
          title: "Congratulations! 🎉",
          description: "You passed the skills assessment!",
        });
      } else {
        toast({
          title: "Keep practicing!",
          description: "You can retake the test after 24 hours.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Still show results locally even if API fails
      setShowResults(true);
      console.warn('Failed to save quiz results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetakeOrClose = () => {
    const score = calculateScore();
    if (score.percentage >= 60) {
      if (onComplete) onComplete();
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentQ = questions[currentQuestion];
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === totalQuestions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 sm:pb-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#121E3C] font-montserrat">
                  Skills Assessment
                </h2>
                <p className="text-xs text-gray-500 font-lato mt-0.5">
                  {showResults ? 'Your Results' : `Question ${currentQuestion + 1} of ${totalQuestions}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!showResults && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                  timeLeft <= 60 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium font-mono">{formatTime(timeLeft)}</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {!showResults && (
            <div className="mt-4">
              <div className="flex gap-1">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      selectedAnswers[questions[idx]?.id] !== undefined
                        ? 'bg-purple-500'
                        : idx === currentQuestion
                          ? 'bg-purple-300'
                          : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[55vh]">
          {!showResults ? (
            <div className="space-y-6">
              {/* Question */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-[#121E3C] font-montserrat mb-4">
                  {currentQ.question}
                </h3>

                {/* Options */}
                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(currentQ.id, idx)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedAnswers[currentQ.id] === idx
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedAnswers[currentQ.id] === idx
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedAnswers[currentQ.id] === idx && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700 font-lato">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Results */
            <div className="text-center py-6">
              {(() => {
                const score = calculateScore();
                const passed = score.percentage >= 60;
                
                return (
                  <>
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                      passed ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {passed ? (
                        <Award className="w-12 h-12 text-green-500" />
                      ) : (
                        <AlertCircle className="w-12 h-12 text-orange-500" />
                      )}
                    </div>

                    <h3 className={`text-2xl font-bold font-montserrat mb-2 ${
                      passed ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {passed ? 'Congratulations!' : 'Keep Practicing!'}
                    </h3>

                    <p className="text-gray-600 font-lato mb-6">
                      You scored <strong>{score.correct}</strong> out of <strong>{score.total}</strong> ({score.percentage}%)
                    </p>

                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-500">{score.correct}</p>
                          <p className="text-xs text-gray-500 font-lato">Correct</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200" />
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-500">{score.total - score.correct}</p>
                          <p className="text-xs text-gray-500 font-lato">Incorrect</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200" />
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-500">{score.percentage}%</p>
                          <p className="text-xs text-gray-500 font-lato">Score</p>
                        </div>
                      </div>
                    </div>

                    {passed ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm text-green-700 font-lato">
                          🎉 You've earned the <strong>Skills Verified</strong> badge! This will be displayed on your profile.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <p className="text-sm text-orange-700 font-lato">
                          You need 60% to pass. You can retake this assessment after 24 hours.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/50">
          {!showResults ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={handlePrevQuestion}
                disabled={currentQuestion === 0}
                className="text-gray-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentQuestion === totalQuestions - 1 ? (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered || isLoading}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6"
                >
                  {isLoading ? 'Submitting...' : 'Submit Quiz'}
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  disabled={selectedAnswers[currentQ.id] === undefined}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={handleRetakeOrClose}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3"
            >
              {calculateScore().percentage >= 60 ? 'Continue' : 'Close'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillsAssessmentModal;
