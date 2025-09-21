import { useAuth } from '@/hooks/useAuth';
import { DoctorDashboard } from '@/components/Dashboard/DoctorDashboard';
import { ReceptionistDashboard } from '@/components/Dashboard/ReceptionistDashboard';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const Dashboard = () => {
  const { profile } = useAuth();

  return (
    <ProtectedRoute>
      {profile?.role === 'doctor' ? <DoctorDashboard /> : <ReceptionistDashboard />}
    </ProtectedRoute>
  );
};

export default Dashboard;