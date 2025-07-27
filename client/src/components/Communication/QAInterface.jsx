import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { HandRaisedIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const QAInterface = ({ sessionId, isVisible = true, isSpeaker = false }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [filter, setFilter] = useState('all'); // all, answered, unanswered
  const [sortBy, setSortBy] = useState('votes'); // votes, time, category

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'business', label: 'Business' },
    { value: 'personal', label: 'Personal' }
  ];

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Join Q&A room
    socket.emit('join-qa-room', sessionId);

    // Listen for new questions
    socket.on('new-question', (question) => {
      setQuestions(prev => [question, ...prev]);
    });

    // Listen for question updates (votes, answers)
    socket.on('question-updated', (updatedQuestion) => {
      setQuestions(prev => 
        prev.map(q => 
          q.id === updatedQuestion.id ? updatedQuestion : q
        )
      );
    });

    // Listen for question answers
    socket.on('question-answered', (data) => {
      setQuestions(prev => 
        prev.map(q => 
          q.id === data.questionId 
            ? { ...q, answer: data.answer, answeredAt: data.answeredAt, isAnswered: true }
            : q
        )
      );
    });

    return () => {
      socket.off('new-question');
      socket.off('question-updated');
      socket.off('question-answered');
      socket.emit('leave-qa-room', sessionId);
    };
  }, [socket, sessionId]);

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      const questionData = {
        sessionId,
        question: newQuestion,
        category: selectedCategory,
        isAnonymous,
        timestamp: new Date().toISOString()
      };

      socket.emit('submit-question', questionData);
      setNewQuestion('');
      toast.success('Question submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit question');
      console.error('Error submitting question:', error);
    }
  };

  const handleVoteQuestion = (questionId, voteType) => {
    socket.emit('vote-question', {
      questionId,
      voteType, // 'up' or 'down'
      sessionId
    });
  };

  const handleAnswerQuestion = (questionId, answer) => {
    if (!isSpeaker) return;
    
    socket.emit('answer-question', {
      questionId,
      answer,
      sessionId,
      answeredBy: user.name
    });
  };

  const getFilteredAndSortedQuestions = () => {
    let filtered = questions;

    // Apply filter
    switch (filter) {
      case 'answered':
        filtered = questions.filter(q => q.isAnswered);
        break;
      case 'unanswered':
        filtered = questions.filter(q => !q.isAnswered);
        break;
      default:
        filtered = questions;
    }

    // Apply sorting
    switch (sortBy) {
      case 'votes':
        filtered.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        break;
      case 'time':
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
      case 'category':
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default:
        break;
    }

    return filtered;
  };

  const QuestionCard = ({ question }) => {
    const [showAnswerForm, setShowAnswerForm] = useState(false);
    const [answerText, setAnswerText] = useState('');

    const handleSubmitAnswer = (e) => {
      e.preventDefault();
      if (!answerText.trim()) return;
      
      handleAnswerQuestion(question.id, answerText);
      setAnswerText('');
      setShowAnswerForm(false);
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                question.category === 'technical' ? 'bg-blue-100 text-blue-800' :
                question.category === 'business' ? 'bg-green-100 text-green-800' :
                question.category === 'personal' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {question.category}
              </span>
              {question.isAnswered && (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )}
            </div>
            
            <p className="text-gray-800 mb-2">{question.question}</p>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {question.isAnonymous ? 'Anonymous' : question.user?.name || 'Unknown'} • 
                {new Date(question.timestamp).toLocaleTimeString()}
              </span>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleVoteQuestion(question.id, 'up')}
                  className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  disabled={question.userVote === 'up'}
                >
                  <ChevronUpIcon className="h-4 w-4" />
                  <span>{question.upvotes || 0}</span>
                </button>
                
                <button
                  onClick={() => handleVoteQuestion(question.id, 'down')}
                  className="flex items-center space-x-1 hover:text-red-600 transition-colors"
                  disabled={question.userVote === 'down'}
                >
                  <ChevronDownIcon className="h-4 w-4" />
                  <span>{question.downvotes || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Answer Section */}
        {question.isAnswered && question.answer && (
          <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <div className="flex items-center mb-1">
              <span className="text-sm font-semibold text-blue-800">Answer:</span>
            </div>
            <p className="text-gray-700">{question.answer}</p>
            <p className="text-xs text-gray-500 mt-1">
              Answered {new Date(question.answeredAt).toLocaleString()}
            </p>
          </div>
        )}

        {/* Speaker Answer Form */}
        {isSpeaker && !question.isAnswered && (
          <div className="mt-3">
            {!showAnswerForm ? (
              <button
                onClick={() => setShowAnswerForm(true)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Answer this question
              </button>
            ) : (
              <form onSubmit={handleSubmitAnswer} className="space-y-2">
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                  >
                    Submit Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnswerForm(false);
                      setAnswerText('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Q&A Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
              <HandRaisedIcon className="h-5 w-5 mr-2" />
              Q&A Session
            </h3>
            <p className="text-xs text-gray-600">{questions.length} questions</p>
          </div>
          
          {/* Filter and Sort Controls */}
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Questions</option>
              <option value="answered">Answered</option>
              <option value="unanswered">Unanswered</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="votes">Sort by Votes</option>
              <option value="time">Sort by Time</option>
              <option value="category">Sort by Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question Submission Form */}
      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleSubmitQuestion} className="space-y-3">
          <div className="flex space-x-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mr-2"
              />
              Anonymous
            </label>
          </div>
          
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask your question..."
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <button
            type="submit"
            disabled={!newQuestion.trim()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Question
          </button>
        </form>
      </div>

      {/* Questions List */}
      <div className="max-h-96 overflow-y-auto p-4">
        {getFilteredAndSortedQuestions().length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <HandRaisedIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {getFilteredAndSortedQuestions().map(question => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QAInterface;
