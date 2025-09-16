import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Eye,
  Save,
  X,
  Move,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { tradeCategoryQuestionsAPI, adminAPI } from '../../api/wallet';
import { useToast } from '../../hooks/use-toast';

const TradeCategoryQuestionsManager = () => {
  const [questions, setQuestions] = useState([]);
  const [categoriesWithQuestions, setCategoriesWithQuestions] = useState([]);
  const [tradeCategories, setTradeCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    trade_category: '',
    question_text: '',
    question_type: 'multiple_choice_single',
    options: [''],
    is_required: true,
    placeholder_text: '',
    help_text: '',
    min_value: null,
    max_value: null,
    is_active: true,
    // New conditional logic fields
    conditional_logic: {
      enabled: false,
      parent_question_id: '',
      trigger_condition: 'equals',
      trigger_value: '',
      trigger_values: [],
      follow_up_questions: []
    }
  });
  
  const { toast } = useToast();

  const questionTypes = [
    { value: 'multiple_choice_single', label: 'Single Choice (Radio)' },
    { value: 'multiple_choice_multiple', label: 'Multiple Choice (Checkbox)' },
    { value: 'text_input', label: 'Short Text Input' },
    { value: 'text_area', label: 'Long Text Area' },
    { value: 'number_input', label: 'Number Input' },
    { value: 'yes_no', label: 'Yes/No Question' }
  ];

  useEffect(() => {
    loadTradeCategories();
    loadQuestions();
    loadCategoriesWithQuestions();
  }, [selectedCategory]);

  const loadTradeCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await adminAPI.getAllTrades();
      
      if (response && response.trades && Array.isArray(response.trades)) {
        // Extract just the names from the trade objects
        const categoryNames = response.trades.map(trade => trade.name || trade);
        setTradeCategories(categoryNames);
        console.log('✅ Trade Questions Manager: Loaded trade categories:', categoryNames.length, 'categories');
      } else {
        console.log('⚠️ Trade Questions Manager: Invalid API response, using real categories from your system');
        // Your actual trade categories from the system
        setTradeCategories([
          'Air Conditioning & Refrigeration',
          'Bathroom Installation', 
          'Building',
          'Building & Construction',
          'Carpentry & Joinery',
          'Carpentry & Woodwork',
          'Electrical Installation',
          'Electrical Work',
          'Flooring',
          'Gardening & Landscaping',
          'Generator Installation & Repair',
          'Heating & Gas',
          'House Cleaning Services',
          'Interior Decoration',
          'Kitchen Installation',
          'Kitchen fitting',
          'Landscaping & Gardening',
          'POP & Ceiling Works',
          'Painting & Decorating',
          'Plastering & Rendering',
          'Plumbing',
          'Plumbing & Water Works',
          'Pool Maintenance',
          'Roofing',
          'Roofing & Waterproofing',
          'Smart Home Automation',
          'Solar Installation',
          'Tiling',
          'Tiling & Marble Works',
          'Welding & Fabrication'
        ]);
      }
    } catch (error) {
      console.error('❌ Trade Questions Manager: Error fetching trade categories:', error);
      // Your actual fallback categories
      setTradeCategories([
        'Air Conditioning & Refrigeration',
        'Bathroom Installation', 
        'Building',
        'Building & Construction',
        'Carpentry & Joinery',
        'Carpentry & Woodwork',
        'Electrical Installation',
        'Electrical Work',
        'Flooring',
        'Gardening & Landscaping',
        'Generator Installation & Repair',
        'Heating & Gas',
        'House Cleaning Services',
        'Interior Decoration',
        'Kitchen Installation',
        'Kitchen fitting',
        'Landscaping & Gardening',
        'POP & Ceiling Works',
        'Painting & Decorating',
        'Plastering & Rendering',
        'Plumbing',
        'Plumbing & Water Works',
        'Pool Maintenance',
        'Roofing',
        'Roofing & Waterproofing',
        'Smart Home Automation',
        'Solar Installation',
        'Tiling',
        'Tiling & Marble Works',
        'Welding & Fabrication'
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await tradeCategoryQuestionsAPI.getAllTradeQuestions(selectedCategory);
      setQuestions(response.questions || []);
    } catch (error) {
      console.error('Failed to load questions:', error);
      toast({
        title: "Error",
        description: "Failed to load trade category questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategoriesWithQuestions = async () => {
    try {
      const response = await tradeCategoryQuestionsAPI.getTradeCategoriesWithQuestions();
      setCategoriesWithQuestions(response.categories || []);
    } catch (error) {
      console.error('Failed to load categories with questions:', error);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      if (!formData.trade_category || !formData.question_text) {
        toast({
          title: "Validation Error",
          description: "Trade category and question text are required",
          variant: "destructive",
        });
        return;
      }

      // Prepare options for multiple choice questions
      let options = [];
      if (formData.question_type.includes('multiple_choice')) {
        options = formData.options
          .filter(opt => opt.trim())
          .map((text, index) => ({
            text: text.trim(),
            value: text.trim().toLowerCase().replace(/\s+/g, '_'),
            display_order: index
          }));
        
        if (options.length < 2) {
          toast({
            title: "Validation Error",
            description: "Multiple choice questions need at least 2 options",
            variant: "destructive",
          });
          return;
        }
      }

      const questionData = {
        ...formData,
        options,
        display_order: questions.filter(q => q.trade_category === formData.trade_category).length + 1
      };

      await tradeCategoryQuestionsAPI.createTradeQuestion(questionData);
      
      toast({
        title: "Success",
        description: "Trade category question created successfully",
      });

      resetForm();
      loadQuestions();
      loadCategoriesWithQuestions();
      
    } catch (error) {
      console.error('Failed to create question:', error);
      toast({
        title: "Error",
        description: "Failed to create trade category question",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuestion = async () => {
    try {
      if (!editingQuestion || !formData.question_text) {
        return;
      }

      let options = [];
      if (formData.question_type.includes('multiple_choice')) {
        options = formData.options
          .filter(opt => opt.trim())
          .map((text, index) => ({
            text: text.trim(),
            value: text.trim().toLowerCase().replace(/\s+/g, '_'),
            display_order: index
          }));
      }

      const updateData = {
        ...formData,
        options
      };

      await tradeCategoryQuestionsAPI.updateTradeQuestion(editingQuestion.id, updateData);
      
      toast({
        title: "Success",
        description: "Question updated successfully",
      });

      setEditingQuestion(null);
      resetForm();
      loadQuestions();
      
    } catch (error) {
      console.error('Failed to update question:', error);
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      await tradeCategoryQuestionsAPI.deleteTradeQuestion(questionId);
      
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });

      loadQuestions();
      loadCategoriesWithQuestions();
      
    } catch (error) {
      console.error('Failed to delete question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setFormData({
      trade_category: question.trade_category,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options?.map(opt => opt.text) || [''],
      is_required: question.is_required,
      placeholder_text: question.placeholder_text || '',
      help_text: question.help_text || '',
      min_value: question.min_value,
      max_value: question.max_value,
      is_active: question.is_active,
      // Populate conditional logic data
      conditional_logic: question.conditional_logic || {
        enabled: false,
        parent_question_id: '',
        trigger_condition: 'equals',
        trigger_value: '',
        yes_follow_up_questions: [],
        no_follow_up_questions: []
      }
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      trade_category: selectedCategory || '',
      question_text: '',
      question_type: 'multiple_choice_single',
      options: [''],
      is_required: true,
      placeholder_text: '',
      help_text: '',
      min_value: null,
      max_value: null,
      is_active: true,
      // Reset conditional logic
      conditional_logic: {
        enabled: false,
        parent_question_id: '',
        trigger_condition: 'equals',
        trigger_value: '',
        yes_follow_up_questions: [],
        no_follow_up_questions: []
      }
    });
    setShowCreateForm(false);
    setEditingQuestion(null);
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case 'multiple_choice_single': return '🔘';
      case 'multiple_choice_multiple': return '☑️';
      case 'text_input': return '📝';
      case 'text_area': return '📄';
      case 'number_input': return '🔢';
      case 'yes_no': return '❓';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Trade Category Questions</h2>
          <p className="text-gray-600">Manage dynamic questions for job posting by trade category</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus size={16} className="mr-2" />
          Add Question
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Filter by Trade Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories ? 'Loading categories...' : 'All Categories'}
                </option>
                {tradeCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-600">
              <div>Total Questions: {questions.length}</div>
              <div>Categories with Questions: {categoriesWithQuestions.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingQuestion ? 'Edit Question' : 'Create New Question'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Trade Category *</label>
                <select
                  value={formData.trade_category}
                  onChange={(e) => setFormData(prev => ({ ...prev, trade_category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={editingQuestion || loadingCategories} // Can't change category when editing
                >
                  <option value="">
                    {loadingCategories ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {tradeCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Question Type *</label>
                <select
                  value={formData.question_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, question_type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {questionTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Question Text *</label>
              <Input
                value={formData.question_text}
                onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                placeholder="Enter the question text"
              />
            </div>

            {/* Options for multiple choice questions */}
            {formData.question_type.includes('multiple_choice') && (
              <div>
                <label className="block text-sm font-medium mb-2">Answer Options</label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {formData.options.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeOption(index)}
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                  >
                    <Plus size={16} className="mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {/* Number input constraints */}
            {formData.question_type === 'number_input' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Value</label>
                  <Input
                    type="number"
                    value={formData.min_value || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_value: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Value</label>
                  <Input
                    type="number"
                    value={formData.max_value || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_value: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Placeholder Text</label>
                <Input
                  value={formData.placeholder_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder_text: e.target.value }))}
                  placeholder="Optional placeholder text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Help Text</label>
                <Input
                  value={formData.help_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, help_text: e.target.value }))}
                  placeholder="Optional help text"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_required: e.target.checked }))}
                />
                <span>Required Question</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <span>Active Question</span>
              </label>
            </div>

            {/* Conditional Logic Section */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">Conditional Logic</h4>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.conditional_logic.enabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditional_logic: { ...prev.conditional_logic, enabled: e.target.checked }
                    }))}
                  />
                  <span className="text-sm font-medium">Enable Conditional Logic</span>
                </label>
              </div>

              {formData.conditional_logic.enabled && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>How it works:</strong> When a user selects "Yes" they'll see one set of follow-up questions, 
                      and when they select "No" they'll see a different set of questions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Parent Question</label>
                      <select
                        value={formData.conditional_logic.parent_question_id}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditional_logic: { ...prev.conditional_logic, parent_question_id: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="">Select parent question</option>
                        {questions
                          .filter(q => q.question_type === 'yes_no' && q.id !== editingQuestion?.id)
                          .map(question => (
                            <option key={question.id} value={question.id}>
                              {question.question_text.substring(0, 50)}...
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Only Yes/No questions can be used as parent questions
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Trigger Condition</label>
                      <select
                        value={formData.conditional_logic.trigger_condition}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          conditional_logic: { ...prev.conditional_logic, trigger_condition: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Trigger Value</label>
                    <select
                      value={formData.conditional_logic.trigger_value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        conditional_logic: { ...prev.conditional_logic, trigger_value: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select trigger value</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This question will be shown when the parent question answer matches this value
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Questions to show if "Yes"</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                        {questions
                          .filter(q => q.id !== editingQuestion?.id && q.trade_category === formData.trade_category)
                          .map(question => (
                            <label key={question.id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={formData.conditional_logic.yes_follow_up_questions.includes(question.id)}
                                onChange={(e) => {
                                  const questionId = question.id;
                                  setFormData(prev => ({
                                    ...prev,
                                    conditional_logic: {
                                      ...prev.conditional_logic,
                                      yes_follow_up_questions: e.target.checked
                                        ? [...prev.conditional_logic.yes_follow_up_questions, questionId]
                                        : prev.conditional_logic.yes_follow_up_questions.filter(id => id !== questionId)
                                    }
                                  }));
                                }}
                              />
                              <span className="truncate">{question.question_text.substring(0, 40)}...</span>
                            </label>
                          ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Questions to show if "No"</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                        {questions
                          .filter(q => q.id !== editingQuestion?.id && q.trade_category === formData.trade_category)
                          .map(question => (
                            <label key={question.id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={formData.conditional_logic.no_follow_up_questions.includes(question.id)}
                                onChange={(e) => {
                                  const questionId = question.id;
                                  setFormData(prev => ({
                                    ...prev,
                                    conditional_logic: {
                                      ...prev.conditional_logic,
                                      no_follow_up_questions: e.target.checked
                                        ? [...prev.conditional_logic.no_follow_up_questions, questionId]
                                        : prev.conditional_logic.no_follow_up_questions.filter(id => id !== questionId)
                                    }
                                  }));
                                }}
                              />
                              <span className="truncate">{question.question_text.substring(0, 40)}...</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> You can create questions first and then come back to set up the conditional logic relationships.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save size={16} className="mr-2" />
                {editingQuestion ? 'Update Question' : 'Create Question'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X size={16} className="mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Questions {selectedCategory && `for ${selectedCategory}`}
            <Badge variant="secondary" className="ml-2">{questions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedCategory ? 
                `No questions found for ${selectedCategory}` : 
                'No questions found. Create your first question!'
              }
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getQuestionTypeIcon(question.question_type)}</span>
                        <Badge variant="outline">{question.trade_category}</Badge>
                        <Badge variant={question.is_active ? "default" : "secondary"}>
                          {question.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {question.is_required && <Badge variant="destructive">Required</Badge>}
                        {question.conditional_logic?.enabled && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            🔀 Conditional
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-medium text-lg mb-2">{question.question_text}</h4>
                      
                      {question.options && question.options.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm font-medium">Options:</span>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {question.options.map((option, idx) => (
                              <li key={idx}>{option.text}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {question.help_text && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Help:</strong> {question.help_text}
                        </p>
                      )}

                      {question.conditional_logic?.enabled && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                          <p className="text-sm font-medium text-purple-800 mb-1">Conditional Logic:</p>
                          <div className="text-sm text-purple-700">
                            <p>• Triggered by: {questions.find(q => q.id === question.conditional_logic.parent_question_id)?.question_text?.substring(0, 40) || 'Unknown question'}...</p>
                            <p>• Condition: {question.conditional_logic.trigger_condition} "{question.conditional_logic.trigger_value}"</p>
                            {question.conditional_logic.yes_follow_up_questions?.length > 0 && (
                              <p>• Yes follow-ups: {question.conditional_logic.yes_follow_up_questions.length} questions</p>
                            )}
                            {question.conditional_logic.no_follow_up_questions?.length > 0 && (
                              <p>• No follow-ups: {question.conditional_logic.no_follow_up_questions.length} questions</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Order: {question.display_order} | 
                        Type: {questionTypes.find(t => t.value === question.question_type)?.label} |
                        Created: {new Date(question.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeCategoryQuestionsManager;