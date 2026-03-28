import React from 'react';
import { User, Mail, BookOpen, CheckCircle, ArrowRight, Building2, Rocket } from 'lucide-react';

const ProfileCompletionBanner = ({ 
  onCompleteProfile, 
  onVerifyContact, 
  onTakeSkillsTest,
  onBusinessVerification,
  profileCompleted = false,
  contactVerified = false,
  skillsTestPassed = false,
  businessVerified = false,
  businessPending = false
}) => {
  if (profileCompleted && contactVerified && skillsTestPassed && businessVerified) {
    return null;
  }

  const steps = [
    {
      id: 'profile',
      title: 'Update Details',
      description: 'Add expertise, location, and bio',
      icon: User,
      completed: profileCompleted,
      onClick: onCompleteProfile,
      bgColor: 'bg-gradient-to-br from-orange-500 to-red-500',
      borderColor: 'border-orange-500',
      priority: !profileCompleted,
    },
    {
      id: 'verify',
      title: 'Verify Contact',
      description: 'Verify email and phone',
      icon: Mail,
      completed: contactVerified,
      onClick: onVerifyContact,
      bgColor: 'bg-gradient-to-br from-amber-500 to-orange-500',
      borderColor: 'border-amber-500',
      priority: profileCompleted && !contactVerified,
    },
    {
      id: 'skills',
      title: 'Skills Test',
      description: 'Quick test for verified badge',
      icon: BookOpen,
      completed: skillsTestPassed,
      onClick: onTakeSkillsTest,
      bgColor: 'bg-gradient-to-br from-purple-500 to-indigo-500',
      borderColor: 'border-purple-500',
      priority: profileCompleted && contactVerified && !skillsTestPassed,
    },
    {
      id: 'business',
      title: 'Business Verification',
      description: 'Verify business for premium badge',
      icon: Building2,
      completed: businessVerified,
      pending: businessPending,
      onClick: onBusinessVerification,
      bgColor: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      borderColor: 'border-emerald-500',
      priority: profileCompleted && contactVerified && skillsTestPassed && !businessVerified && !businessPending,
    },
  ];

  const completedCount = [profileCompleted, contactVerified, skillsTestPassed, businessVerified].filter(Boolean).length;
  const completionPercent = Math.round((completedCount / 4) * 100);
  const remainingSteps = 4 - completedCount;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#121E3C] font-montserrat">
            Complete Your Profile
          </h2>
          <p className="text-sm text-gray-500 font-lato">
            {completionPercent}% complete • {remainingSteps} steps remaining
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 sm:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-orange-500">{completionPercent}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={step.completed ? undefined : step.onClick}
            disabled={step.completed || step.pending}
            className={`relative group text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 ${
              step.completed
                ? 'bg-green-50/50 border-green-200 cursor-default'
                : step.pending
                  ? 'bg-amber-50/50 border-amber-200 cursor-default'
                : step.priority
                  ? `bg-white ${step.borderColor} shadow-lg hover:shadow-xl hover:-translate-y-1`
                  : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {/* Priority indicator */}
            {step.priority && !step.completed && (
              <div className="absolute -top-2 -right-2">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
                </span>
              </div>
            )}

            <div className="flex items-start gap-3 sm:gap-4">
              {/* Icon */}
              <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${
                step.completed 
                  ? 'bg-green-100' 
                  : step.pending
                    ? 'bg-amber-100'
                  : step.bgColor
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                ) : step.pending ? (
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                ) : (
                  <step.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm sm:text-base font-semibold font-montserrat ${
                    step.completed ? 'text-green-700' : 'text-[#121E3C]'
                  }`}>
                    {step.title}
                  </h3>
                  {step.completed && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 font-lato ${
                  step.completed ? 'text-green-600' : step.pending ? 'text-amber-700' : 'text-gray-500'
                }`}>
                  {step.completed ? '✓ Completed' : step.pending ? '⏳ Pending admin approval' : step.description}
                </p>
              </div>

              {/* Arrow */}
              {!step.completed && (
                <ArrowRight className={`w-5 h-5 flex-shrink-0 transition-transform hidden sm:block ${
                  step.priority 
                    ? 'text-orange-500 group-hover:translate-x-1' 
                    : 'text-gray-300 group-hover:text-orange-400 group-hover:translate-x-1'
                }`} />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Motivational text */}
      <p className="text-center text-xs text-gray-400 mt-4 font-lato">
        Complete your profile to show interest in jobs near you
      </p>
    </div>
  );
};

export default ProfileCompletionBanner;
