import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInForm } from '@/components/Auth/SignInForm';
import { useAuth } from '@/hooks/useAuth';

const SignIn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return <SignInForm />;
};

export default SignIn;