import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUpForm } from '@/components/Auth/SignUpForm';
import { useAuth } from '@/hooks/useAuth';

const SignUp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return <SignUpForm />;
};

export default SignUp;