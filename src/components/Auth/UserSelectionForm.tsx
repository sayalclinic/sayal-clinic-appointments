import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Edit, Trash2 } from 'lucide-react';
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

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
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
      // Sign in using the user's credentials
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: 'quick-login', // This would need proper session management in production
      });

      if (error) {
        toast({
          title: 'Login Failed',
          description: 'Please use the sign-in form for this user',
          variant: 'destructive',
        });
        navigate('/signin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      navigate('/signin');
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
      <div className="min-h-screen bg-gradient-to-br from-medical-light via-background to-medical-accent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light via-background to-medical-accent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-medical-blue rounded-2xl flex items-center justify-center mb-4 shadow-elevated">
              <svg
                className="w-8 h-8 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-medical-dark mb-2">Select User</h1>
            <p className="text-muted-foreground">Choose a user to sign in to ClinicFlow</p>
          </div>

          {/* User Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {profiles.map((profile) => (
              <Card key={profile.id} className="shadow-card hover:shadow-card-hover transition-all duration-200 group">
                <CardHeader className="text-center pb-4">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="bg-gradient-to-r from-primary to-medical-blue text-primary-foreground text-lg font-bold">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-medical-dark text-lg">{profile.name}</CardTitle>
                  <Badge variant="outline" className={getRoleColor(profile.role)}>
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-medical-blue hover:from-primary-hover hover:to-primary text-primary-foreground"
                      onClick={() => handleUserLogin(profile)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleEditProfile(profile)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteProfile(profile)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
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
              className="bg-gradient-to-r from-medical-accent to-primary hover:from-medical-accent/90 hover:to-primary/90 text-primary-foreground px-8"
              onClick={() => navigate('/signup')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New User
            </Button>
          </div>

          {/* Alternative Sign In */}
          <div className="text-center mt-6">
            <Button
              variant="ghost"
              className="text-primary hover:text-primary-hover"
              onClick={() => navigate('/signin')}
            >
              Use Email & Password Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update the user's name and role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(value: string) => setEditRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};