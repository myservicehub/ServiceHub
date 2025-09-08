import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Flag,
  RotateCcw
} from 'lucide-react';
import { skillsAPI } from '../../api/wallet';
import { calculateTestScore } from '../../data/skillsTestQuestions';

const SkillsTestComponent = ({ formData, updateFormData, onTestComplete }) => {
  const [testState, setTestState] = useState('intro'); // intro, active, results
  const [currentTrade, setCurrentTrade] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes in seconds
  const [testQuestions, setTestQuestions] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize test questions when component mounts - only for main trade
  useEffect(() => {
    if (formData.selectedTrades && formData.selectedTrades.length > 0) {
      // Only test the main trade (first selected trade)
      const mainTrade = formData.selectedTrades[0];
      const questions = getQuestionsForTrades([mainTrade], 20);
      setTestQuestions(questions);
    }
  }, [formData.selectedTrades]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (testState === 'active' && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testState, timeRemaining]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartTest = () => {
    setTestState('active');
    setCurrentTrade(0);
    setCurrentQuestion(0);
    setAnswers({});
    setTimeRemaining(1800); // Reset timer
  };

  const handleAnswerSelect = (answerIndex) => {
    const mainTrade = formData.selectedTrades[0];
    const questionKey = `${mainTrade}_${currentQuestion}`;
    
    setAnswers(prev => ({
      ...prev,
      [questionKey]: answerIndex
    }));
  };

  const handleNextQuestion = () => {
    const mainTrade = formData.selectedTrades[0];
    const currentTradeQuestions = testQuestions[mainTrade] || [];
    
    if (currentQuestion < currentTradeQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // End of test - submit
      handleSubmitTest();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleTimeUp = () => {
    handleSubmitTest();
  };

  const handleSubmitTest = async () => {
    setIsSubmitting(true);
    
    // Calculate results for main trade only
    const mainTrade = formData.selectedTrades[0];
    const tradeQuestions = testQuestions[mainTrade] || [];
    const tradeAnswers = {};
    
    tradeQuestions.forEach((_, index) => {
      const questionKey = `${mainTrade}_${index}`;
      tradeAnswers[index] = answers[questionKey];
    });
    
    const tradeResult = calculateTestScore(tradeAnswers, tradeQuestions);
    
    const finalResults = {
      mainTrade,
      tradeResult,
      overallScore: tradeResult.score,
      overallCorrect: tradeResult.correct,
      overallTotal: tradeResult.total,
      passed: tradeResult.passed,
      completedAt: new Date().toISOString(),
      timeUsed: 1800 - timeRemaining
    };
    
    setTestResults(finalResults);
    setTestState('results');
    
    // Update form data
    updateFormData('skillsTestPassed', tradeResult.passed);
    updateFormData('testScores', finalResults);
    
    if (onTestComplete) {
      onTestComplete(finalResults);
    }
    
    setIsSubmitting(false);
  };

  const getTotalQuestions = () => {
    const mainTrade = formData.selectedTrades[0];
    return testQuestions[mainTrade]?.length || 0;
  };

  const getCurrentQuestionNumber = () => {
    return currentQuestion + 1;
  };

  const getCurrentAnswer = () => {
    const mainTrade = formData.selectedTrades[0];
    const questionKey = `${mainTrade}_${currentQuestion}`;
    return answers[questionKey];
  };

  const canGoNext = () => {
    return getCurrentAnswer() !== undefined;
  };

  const canGoPrevious = () => {
    return currentQuestion > 0;
  };

  const isLastQuestion = () => {
    const mainTrade = formData.selectedTrades[0];
    const totalQuestions = testQuestions[mainTrade]?.length || 0;
    return currentQuestion === totalQuestions - 1;
  };

  // Introduction screen
  if (testState === 'intro') {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <BookOpen className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Verify your skills
          </h3>
          <p className="text-gray-600">
            ServiceHub supports quality tradespeople. Take our skills assessment to demonstrate your expertise in your selected trades.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800">Test Requirements</h4>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• You need to score <strong>80% or higher</strong> to pass</li>
                <li>• <strong>20 questions</strong> per trade category</li>
                <li>• <strong>30 minutes</strong> time limit</li>
                <li>• Questions cover technical knowledge, safety, and Nigerian standards</li>
                <li>• <strong>Immediate results</strong> provided</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">You will be tested on your main trade:</h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center space-x-3 p-4 border-2 border-green-500 rounded-lg bg-green-50">
              <Trophy className="h-6 w-6 text-green-600" />
              <div>
                <span className="font-semibold text-lg text-green-800">{formData.selectedTrades[0]}</span>
                <p className="text-sm text-green-700">Your primary trade • 20 questions</p>
              </div>
            </div>
          </div>
          
          {formData.selectedTrades.length > 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You selected {formData.selectedTrades.length} trades, but you'll only be tested on your main trade ({formData.selectedTrades[0]}) to keep the assessment focused and manageable.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Other trades: {formData.selectedTrades.slice(1).join(', ')}
              </p>
            </div>
          )}
          
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <strong>Total:</strong> {getTotalQuestions()} questions covering technical knowledge, safety procedures, and Nigerian building standards.
          </div>
        </div>

        <Button
          onClick={handleStartTest}
          disabled={Object.keys(testQuestions).length === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
        >
          Start Skills Test
        </Button>
      </div>
    );
  }

  // Test results screen
  if (testState === 'results') {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          {testResults.passed ? (
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          ) : (
            <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
          )}
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Test Results
          </h3>
          <p className="text-gray-600">
            {testResults.passed 
              ? "Congratulations! You've passed the skills assessment." 
              : "You need to score 80% or higher to continue."
            }
          </p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold mb-2 ${
              testResults.passed ? 'text-green-600' : 'text-red-600'
            }`}>
              {testResults.overallScore}%
            </div>
            <p className="text-gray-600">
              {testResults.overallCorrect} out of {testResults.overallTotal} questions correct
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Time used: {formatTime(testResults.timeUsed)}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-800">Test Result for {testResults.mainTrade}:</h4>
            <div className="border rounded-lg p-4 bg-green-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-lg">{testResults.mainTrade}</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-bold text-xl ${
                    testResults.tradeResult.passed ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {testResults.tradeResult.score}%
                  </span>
                  {testResults.tradeResult.passed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                {testResults.tradeResult.correct} out of {testResults.tradeResult.total} questions correct
              </div>
              <Progress 
                value={testResults.tradeResult.score} 
                className={`h-3 ${
                  testResults.tradeResult.passed ? 'bg-green-100' : 'bg-red-100'
                }`}
              />
            </div>
          </div>
        </div>

        {!testResults.passed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Retake Required</h4>
                <p className="text-sm text-red-700 mt-1">
                  You need to score 80% or higher to continue with your registration. 
                  Please study the relevant materials and retake the test.
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setTestState('intro');
                setTestResults(null);
                setAnswers({});
              }}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Test
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Active test screen
  const mainTrade = formData.selectedTrades[0];
  const currentTradeQuestions = testQuestions[mainTrade] || [];
  const currentQuestionData = currentTradeQuestions[currentQuestion];

  return (
    <div className="space-y-6">
      {/* Test header with progress and timer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-semibold text-blue-800">
              {formData.selectedTrades[0]} Skills Test
            </h3>
            <p className="text-sm text-blue-600">
              Question {getCurrentQuestionNumber()} of {getTotalQuestions()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-blue-700">
              <Clock className="h-4 w-4" />
              <span className="font-mono">
                {formatTime(timeRemaining)}
              </span>
            </div>
            {timeRemaining < 300 && (
              <div className="text-red-600 font-medium">
                Low time!
              </div>
            )}
          </div>
        </div>
        <Progress 
          value={(getCurrentQuestionNumber() / getTotalQuestions()) * 100} 
          className="h-2"
        />
      </div>

      {/* Question card */}
      {currentQuestionData && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
              <CardTitle className="text-lg">
                {currentQuestionData.question}
              </CardTitle>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {currentQuestionData.category}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestionData.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    getCurrentAnswer() === index
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question_${getCurrentQuestionNumber()}`}
                    value={index}
                    checked={getCurrentAnswer() === index}
                    onChange={() => handleAnswerSelect(index)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                    getCurrentAnswer() === index
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}>
                    {getCurrentAnswer() === index && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-800">{option}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={!canGoPrevious()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft size={16} />
          <span>Previous</span>
        </Button>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (window.confirm('Are you sure you want to submit your test? You cannot change your answers after submission.')) {
                handleSubmitTest();
              }
            }}
            className="flex items-center space-x-2"
          >
            <Flag size={16} />
            <span>Submit Test</span>
          </Button>

          <Button
            type="button"
            onClick={handleNextQuestion}
            disabled={!canGoNext() || isSubmitting}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <span>
              {isLastQuestion() ? 'Finish Test' : 'Next'}
            </span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {/* Show loading overlay when submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg text-center">
            <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Calculating your results...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsTestComponent;