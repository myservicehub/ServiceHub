import React, { useState, useEffect } from 'react';
import { X, BookOpen, CheckCircle, Clock, Award, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { jobsAPI } from '../../api/jobs';
import { skillsAPI } from '../../api/wallet';

const SkillsAssessmentModal = ({ isOpen, onClose, onComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const totalQuestions = questions.length;

  // Timer - only starts when quiz begins (not in intro)
  useEffect(() => {
    if (!isOpen || showResults || showIntro) return;
    
    if (timeLeft <= 0) {
      handleSubmitQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, showResults, showIntro]);

  // Fetch questions from database when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowIntro(true);
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setShowResults(false);
      setTimeLeft(300);
      fetchQuestions();
    }
  }, [isOpen]);

  const fetchQuestions = async () => {
    const tradeCategory = user?.trade_categories?.[0] || 'General Handyman Work';
    setIsFetchingQuestions(true);
    try {
      const response = await skillsAPI.getQuestionsForTrade(tradeCategory);
      if (response?.questions?.length > 0) {
        const formatted = response.questions.map((q, idx) => ({
          id: idx + 1,
          question: q.question,
          options: q.options || [],
          correctIndex: q.correct ?? 0,
        }));
        setQuestions(formatted);
      } else {
        toast({ title: "No questions available", description: "Please try again later", variant: "destructive" });
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      toast({ title: "Failed to load questions", description: "Please try again", variant: "destructive" });
    } finally {
      setIsFetchingQuestions(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 pb-16 sm:p-4 sm:pb-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[80vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b flex-shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {showIntro ? 'Skills Assessment' : showResults ? 'Results' : `Question ${currentQuestion + 1}/${totalQuestions}`}
            </h2>
            {!showResults && !showIntro && (
              <div className={`text-xs mt-0.5 ${timeLeft <= 60 ? 'text-red-500' : 'text-gray-500'}`}>
                {formatTime(timeLeft)} remaining
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {!showResults && !showIntro && (
          <div className="px-4 sm:px-5 pt-3 flex-shrink-0">
            <div className="flex gap-1">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full ${
                    selectedAnswers[questions[idx]?.id] !== undefined
                      ? 'bg-[#121E3C]'
                      : idx === currentQuestion ? 'bg-[#121E3C]/50' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {showIntro ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#121E3C]/10 flex items-center justify-center">
                {isFetchingQuestions ? (
                  <Loader2 className="w-8 h-8 text-[#121E3C] animate-spin" />
                ) : (
                  <Award className="w-8 h-8 text-[#121E3C]" />
                )}
              </div>

              <h3 className="text-xl font-bold text-[#121E3C] font-montserrat mb-3">
                Showcase Your Expertise
              </h3>

              <p className="text-gray-600 font-lato mb-6 max-w-md mx-auto">
                Take this quick assessment to earn a <strong>Skills Verified</strong> badge on your profile. 
                Verified tradespersons get <span className="text-[#121E3C] font-medium">2x more job inquiries</span> from homeowners.
              </p>

              <div className="bg-[#121E3C]/5 rounded-xl p-4 mb-6 text-left">
                <h4 className="font-semibold text-[#121E3C] font-montserrat mb-3">What to expect:</h4>
                <ul className="space-y-2 text-sm text-gray-600 font-lato">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#121E3C] flex-shrink-0" />
                    <span><strong>{isFetchingQuestions ? '...' : totalQuestions} questions</strong> about your trade</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#121E3C] flex-shrink-0" />
                    <span><strong>5 minutes</strong> time limit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#121E3C] flex-shrink-0" />
                    <span><strong>60% score</strong> needed to pass</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => setShowIntro(false)}
                disabled={isFetchingQuestions || questions.length === 0}
                className="w-full bg-[#121E3C] hover:bg-[#0d1629] text-white py-3"
              >
                {isFetchingQuestions ? 'Loading Questions...' : 'Start Assessment'}
                {!isFetchingQuestions && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          ) : !showResults && currentQ ? (
            <div>
              <p className="text-sm sm:text-base font-medium text-gray-900 mb-4">{currentQ.question}</p>
              <div className="space-y-2">
                {currentQ.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(currentQ.id, idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                      selectedAnswers[currentQ.id] === idx
                        ? 'border-[#121E3C] bg-[#121E3C]/5 text-[#121E3C]'
                        : 'border-gray-200 hover:border-[#121E3C]/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
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
                          <p className="text-2xl font-bold text-[#121E3C]">{score.percentage}%</p>
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

        {/* Footer - only show for quiz and results, not intro */}
        {!showIntro && (
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
                    className="bg-[#121E3C] hover:bg-[#0d1629] text-white px-6"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Quiz'}
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    disabled={selectedAnswers[currentQ.id] === undefined}
                    className="bg-[#121E3C] hover:bg-[#0d1629] text-white px-6"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            ) : (
              <Button
                onClick={handleRetakeOrClose}
                className="w-full bg-[#121E3C] hover:bg-[#0d1629] text-white py-3"
              >
                {calculateScore().percentage >= 60 ? 'Continue' : 'Close'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillsAssessmentModal;
