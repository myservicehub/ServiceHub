import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TradespersonRegistration from '../components/auth/TradespersonRegistration';
import SignupForm from '../components/auth/SignupForm';

const TradespersonRegistrationDemo = () => {
  const [showRegistration, setShowRegistration] = useState(true); // Temporarily set to true for testing
  const [registrationType, setRegistrationType] = useState('multi-step');

  const handleRegistrationComplete = (result) => {
    console.log('Registration completed:', result);
    setShowRegistration(false);
  };

  // Add debugging
  console.log('🔍 TradespersonRegistrationDemo state:', { showRegistration, registrationType });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Tradesperson Registration Demo
            </h1>
            <p className="text-gray-600 mb-6">
              Experience the new comprehensive 6-step registration process with skills testing
            </p>
          </div>

          {!showRegistration ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Registration Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={(e) => {
                        console.log('🚀 Multi-Step Registration button clicked - event:', e);
                        console.log('🚀 Current state before:', { showRegistration, registrationType });
                        e.preventDefault();
                        e.stopPropagation();
                        setRegistrationType('multi-step');
                        setShowRegistration(true);
                        console.log('📊 State changes triggered');
                      }}
                      className="h-24 flex flex-col space-y-2 bg-green-600 hover:bg-green-700 text-white"
                      type="button"
                    >
                      <span className="text-lg font-semibold">Multi-Step Registration</span>
                      <span className="text-sm opacity-90">Complete 6-step process with skills test</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setRegistrationType('simple');
                        setShowRegistration(true);
                      }}
                      variant="outline"
                      className="h-24 flex flex-col space-y-2"
                    >
                      <span className="text-lg font-semibold">Simple Registration</span>
                      <span className="text-sm text-gray-600">Traditional single-form registration</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multi-Step Registration Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-green-600 mb-2">Step 1: Account Creation</h3>
                      <p className="text-sm text-gray-600">Basic account details with marketing consent</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-green-600 mb-2">Step 2: Work Details</h3>
                      <p className="text-sm text-gray-600">Trade selection, travel distance, business info</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-green-600 mb-2">Step 3: ID Verification</h3>
                      <p className="text-sm text-gray-600">Passport, NIN, or Driver's License verification</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-yellow-50">
                      <h3 className="font-semibold text-yellow-600 mb-2">Step 4: Skills Test ⭐</h3>
                      <p className="text-sm text-gray-600">Trade-specific 20-question test, 80% pass rate</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-green-600 mb-2">Step 5: Profile Setup</h3>
                      <p className="text-sm text-gray-600">Professional profile description</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-green-600 mb-2">Step 6: Wallet Setup</h3>
                      <p className="text-sm text-gray-600">Payment system for job access fees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Skills Test Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Test Format</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Trade-specific questions</li>
                          <li>• 20 questions per trade</li>
                          <li>• 30-minute time limit</li>
                          <li>• Immediate results</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Test Content</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Technical knowledge</li>
                          <li>• Safety procedures</li>
                          <li>• Nigerian building codes</li>
                          <li>• Best practices</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Available Trade Tests</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-700">
                        <span>• Plumbing</span>
                        <span>• Electrical Repairs</span>
                        <span>• Building</span>
                        <span>• Tiling</span>
                        <span>• Roofing</span>
                        <span>• Carpentry</span>
                        <span>• Painting</span>
                        <span>• And more...</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div>
              {registrationType === 'multi-step' ? (
                <TradespersonRegistration 
                  onClose={() => setShowRegistration(false)}
                  onComplete={handleRegistrationComplete}
                />
              ) : (
                <SignupForm 
                  onClose={() => setShowRegistration(false)}
                  showOnlyTradesperson={true}
                  useMultiStepRegistration={false}
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default TradespersonRegistrationDemo;