export const isTradespersonProfileCompleted = (user) => {
  const hasTrades = Array.isArray(user?.trade_categories) && user.trade_categories.length > 0;
  const hasExperience = Number(user?.experience_years || 0) > 0;
  const hasCompanyName = !!String(user?.company_name || '').trim();
  const hasLocation = !!String(user?.location || '').trim();
  const hasDescription = (String(user?.description || '').trim().length || 0) >= 50;
  return hasTrades && hasExperience && hasCompanyName && hasLocation && hasDescription;
};

export const getTradespersonCompletionStatus = (user) => {
  const profileCompleted = isTradespersonProfileCompleted(user);
  const contactVerified = !!(user?.email_verified && user?.phone_verified);
  const skillsTestPassed = !!user?.skills_test_passed;
  const businessVerified = !!(user?.business_verified || user?.verified_tradesperson);
  const businessPending = !businessVerified && !!user?.business_verification_submitted;
  const allStepsCompleted = profileCompleted && contactVerified && skillsTestPassed && businessVerified;
  return {
    profileCompleted,
    contactVerified,
    skillsTestPassed,
    businessVerified,
    businessPending,
    allStepsCompleted,
  };
};
