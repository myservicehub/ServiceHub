import React from 'react';
import { User, Mail, BookOpen, CheckCircle, ArrowRight } from 'lucide-react';

const ProfileCompletionBanner = ({ 
  onCompleteProfile, 
  onVerifyContact, 
  onTakeSkillsTest,
  profileCompleted = false,
  contactVerified = false,
  skillsTestPassed = false 
}) => {
  // Don't render if all steps are completed
  if (profileCompleted && contactVerified && skillsTestPassed) {
    return null;
  }

  const steps = [
    {
      id: 'profile',
      title: 'Complete Profile',
      description: 'Add your expertise, business details, and bio',
      icon: User,
      completed: profileCompleted,
      onClick: onCompleteProfile,
      bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600',
      priority: !profileCompleted,
    },
    {
      id: 'verify',
      title: 'Verify Contact',
      description: 'Verify your email and phone number',
      icon: Mail,
      completed: contactVerified,
      onClick: onVerifyContact,
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
      priority: profileCompleted && !contactVerified,
    },
    {
      id: 'skills',
      title: 'Skills Assessment',
      description: 'Take a quick test to showcase your expertise',
      icon: BookOpen,
      completed: skillsTestPassed,
      onClick: onTakeSkillsTest,
      bgColor: 'bg-gradient-to-br from-amber-500 to-orange-500',
      priority: profileCompleted && contactVerified && !skillsTestPassed,
    },
  ];

  // Calculate completion percentage
  const completedCount = [profileCompleted, contactVerified, skillsTestPassed].filter(Boolean).length;
  const completionPercent = Math.round((completedCount / 3) * 100);

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#121E3C] font-montserrat">
            Complete Your Profile
          </h2>
          <p className="text-sm text-gray-500 font-lato">
            {completionPercent}% complete • {3 - completedCount} steps remaining
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#34D164] rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-[#34D164]">{completionPercent}%</span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={step.completed ? undefined : step.onClick}
            disabled={step.completed}
            className={`relative group text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
              step.completed
                ? 'bg-gray-50 border-gray-200 cursor-default'
                : step.priority
                  ? 'bg-white border-[#34D164] shadow-lg shadow-[#34D164]/10 hover:shadow-xl hover:shadow-[#34D164]/20 hover:-translate-y-1'
                  : 'bg-white border-gray-200 hover:border-[#34D164]/50 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {/* Priority indicator */}
            {step.priority && !step.completed && (
              <div className="absolute -top-2 -right-2">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D164] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#34D164]"></span>
                </span>
              </div>
            )}

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`p-3 rounded-xl flex-shrink-0 ${
                step.completed 
                  ? 'bg-gray-100' 
                  : step.bgColor
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-6 h-6 text-[#34D164]" />
                ) : (
                  <step.icon className="w-6 h-6 text-white" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold font-montserrat ${
                    step.completed ? 'text-gray-400' : 'text-[#121E3C]'
                  }`}>
                    {step.title}
                  </h3>
                  {step.completed && (
                    <CheckCircle className="w-4 h-4 text-[#34D164]" />
                  )}
                </div>
                <p className={`text-sm mt-1 font-lato ${
                  step.completed ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {step.completed ? 'Completed' : step.description}
                </p>
              </div>

              {/* Arrow */}
              {!step.completed && (
                <ArrowRight className={`w-5 h-5 flex-shrink-0 transition-transform ${
                  step.priority 
                    ? 'text-[#34D164] group-hover:translate-x-1' 
                    : 'text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1'
                }`} />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Motivational text */}
      <p className="text-center text-xs text-gray-400 mt-4 font-lato">
        Complete profiles get <span className="text-[#34D164] font-medium">3x more job inquiries</span> from homeowners
      </p>
    </div>
  );
};

export default ProfileCompletionBanner;
