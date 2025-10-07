import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Edit, Trash2, Calendar, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import clinicLogo from '@/assets/sayal-clinic-logo.png';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

export const UserSelectionForm = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<string>('doctor');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user profiles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserLogin = async (profile: Profile) => {
    try {
      // For demo purposes, we'll create a temporary session
      // In production, you'd implement proper session management
      localStorage.setItem('selectedUserId', profile.user_id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign in',
        variant: 'destructive',
      });
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditRole(profile.role);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editName,
          role: editRole,
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });

      setIsEditDialogOpen(false);
      setEditingProfile(null);
      fetchProfiles();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProfile = async (profile: Profile) => {
    if (!confirm(`Are you sure you want to delete ${profile.name}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile deleted successfully',
      });

      fetchProfiles();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete profile',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    return role === 'doctor' 
      ? 'bg-primary/10 text-primary border-primary/20'
      : 'bg-medical-accent/10 text-medical-accent border-medical-accent/20';
  };

  if (loading) {
    return (
      <div className="min-h-screen clinic-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-foreground font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen clinic-gradient">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header with Logo and Title */}
          <div className="text-center mb-12 smooth-fade">
            <div className="mx-auto w-24 h-24 mb-6 smooth-hover">
              <img 
                src={clinicLogo} 
                alt="Sayal Clinic Logo" 
                className="w-full h-full object-contain drop-shadow-xl"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3 tracking-tight">
              Sayal Clinic Appointments
            </h1>
            <p className="text-lg text-foreground/80 mb-2">
              Professional Healthcare Management System
            </p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Select your profile to continue</span>
            </div>
          </div>

          {/* User Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {profiles.map((profile) => (
              <Card 
                key={profile.id} 
                className="clinic-card hover:scale-[1.03] smooth-transition group cursor-pointer border border-border/50 hover:border-primary/50 bg-card/95 backdrop-blur-sm"
                onClick={() => handleUserLogin(profile)}
              >
                <CardHeader className="text-center pb-4">
                  <Avatar className="w-20 h-20 mx-auto mb-4 smooth-hover ring-2 ring-border group-hover:ring-primary/50 smooth-transition">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground text-xl font-bold">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-foreground text-xl mb-2">{profile.name}</CardTitle>
                  <Badge variant="outline" className={`${getRoleColor(profile.role)} font-medium`}>
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 smooth-button border-border hover:border-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProfile(profile);
                        }}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 smooth-button border-border hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(profile);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add New User Button */}
          <div className="text-center">
            <Button
              size="lg"
              className="smooth-button bg-primary hover:bg-primary-hover text-primary-foreground px-10 py-6 text-lg font-semibold rounded-xl"
              style={{ boxShadow: 'var(--shadow-elevated)' }}
              onClick={() => navigate('/signup')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New User
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update the name and role for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};