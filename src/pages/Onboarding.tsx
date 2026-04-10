import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, School, MapPin, BookOpen, Users, Wrench, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getProfile, saveProfile, type TeacherProfile } from '@/lib/db';
import { SCHOOL_LEVELS, CLASSES, SUBJECTS, GEOPOLITICAL_ZONES, STATES, CLASSROOM_RESOURCES } from '@/lib/curriculum';
import heroImage from '@/assets/hero-classroom.jpg';
import { profileSchema, type ValidationErrors } from '@/lib/validation';

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<TeacherProfile>>({
    name: '',
    schoolName: '',
    schoolType: 'public',
    zone: '',
    state: '',
    subjects: [],
    classes: [],
    classSizes: {},
    resources: [],
    language: 'en',
    onboardingComplete: false,
  });

  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    let active = true;

    void (async () => {
      const existingProfile = await getProfile();
      if (!active || !existingProfile) return;

      if (existingProfile.onboardingComplete) {
        navigate('/', { replace: true });
        return;
      }

      setProfile(prev => ({ ...prev, ...existingProfile }));
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  const canProceed = () => {
    switch (step) {
      case 0: return true;
      case 1: {
        const result = profileSchema.safeParse({ name: profile.name, schoolName: profile.schoolName });
        return result.success;
      }
      case 2: return (profile.zone ?? '').length > 0 && (profile.state ?? '').length > 0;
      case 3: return (profile.subjects?.length ?? 0) > 0;
      default: return true;
    }
  };

  const validateProfileField = (field: 'name' | 'schoolName', value: string) => {
    const result = profileSchema.shape[field].safeParse(value);
    setErrors(prev => ({
      ...prev,
      [field]: result.success ? '' : result.error.errors[0]?.message || '',
    }));
  };

  const handleFinish = async () => {
    const finalProfile: TeacherProfile = {
      id: 'default',
      name: profile.name || '',
      schoolName: profile.schoolName || '',
      schoolType: profile.schoolType || 'public',
      zone: profile.zone || '',
      state: profile.state || '',
      subjects: profile.subjects || [],
      classes: profile.classes || [],
      classSizes: profile.classSizes || {},
      resources: profile.resources || [],
      language: profile.language || 'en',
      onboardingComplete: true,
    };
    await saveProfile(finalProfile);
    navigate('/');
  };

  const toggleSubject = (subject: string) => {
    setProfile(p => ({
      ...p,
      subjects: p.subjects?.includes(subject)
        ? p.subjects.filter(s => s !== subject)
        : [...(p.subjects || []), subject],
    }));
  };

  const toggleResource = (resource: string) => {
    setProfile(p => ({
      ...p,
      resources: p.resources?.includes(resource)
        ? p.resources.filter(r => r !== resource)
        : [...(p.resources || []), resource],
    }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      {step > 0 && (
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="relative h-56 overflow-hidden">
                <img src={heroImage} alt="Nigerian classroom" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-12 relative z-10">
                <AppLogo size="lg" className="mb-4 glow" />
                <h1 className="text-3xl font-heading font-bold text-foreground text-center mb-2">
                  Welcome to Syllabix<sub className="text-[0.6em]">NG</sub>
                </h1>
                <p className="text-muted-foreground text-center max-w-sm mb-8 leading-relaxed">
                  Create professional lesson plans aligned with the Nigerian curriculum. Works offline, designed for you.
                </p>
                <Button
                  size="lg"
                  className="w-full max-w-sm touch-target text-base font-semibold"
                  onClick={() => setStep(1)}
                >
                  Get Started
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 px-6 pt-8 pb-24"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold">About You</h2>
                  <p className="text-sm text-muted-foreground">Tell us about yourself and your school</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Your Full Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Mrs. Adebayo Funke"
                    maxLength={100}
                    value={profile.name}
                    onChange={e => {
                      setProfile(p => ({ ...p, name: e.target.value }));
                      validateProfileField('name', e.target.value);
                    }}
                    className="mt-1.5 touch-target"
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="school" className="text-sm font-medium">School Name</Label>
                  <Input
                    id="school"
                    placeholder="e.g. Government Secondary School, Ikoyi"
                    maxLength={200}
                    value={profile.schoolName}
                    onChange={e => {
                      setProfile(p => ({ ...p, schoolName: e.target.value }));
                      validateProfileField('schoolName', e.target.value);
                    }}
                    className="mt-1.5 touch-target"
                  />
                  {errors.schoolName && <p className="text-xs text-destructive mt-1">{errors.schoolName}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">School Type</Label>
                  <div className="flex gap-3">
                    {(['public', 'private'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setProfile(p => ({ ...p, schoolType: type }))}
                        className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium capitalize transition-all touch-target ${
                          profile.schoolType === type
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <School className="h-4 w-4 mx-auto mb-1" />
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 px-6 pt-8 pb-24"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold">Your Location</h2>
                  <p className="text-sm text-muted-foreground">This helps us with curriculum variations</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Geopolitical Zone</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {GEOPOLITICAL_ZONES.map(zone => (
                      <button
                        key={zone}
                        onClick={() => setProfile(p => ({ ...p, zone, state: '' }))}
                        className={`py-3 px-3 rounded-lg border text-sm font-medium transition-all touch-target ${
                          profile.zone === zone
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {zone}
                      </button>
                    ))}
                  </div>
                </div>

                {profile.zone && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Label className="text-sm font-medium mb-2 block">State</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {STATES[profile.zone]?.map(state => (
                        <button
                          key={state}
                          onClick={() => setProfile(p => ({ ...p, state }))}
                          className={`py-3 px-3 rounded-lg border text-sm font-medium transition-all touch-target ${
                            profile.state === state
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 px-6 pt-8 pb-24"
            >
              <div className="flex items-center gap-3 mb-6">
                <AppLogo size="md" />
                <div>
                  <h2 className="text-xl font-heading font-bold">Your Subjects</h2>
                  <p className="text-sm text-muted-foreground">Select your school level and subjects</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium mb-2 block">School Level</Label>
                  <div className="flex gap-2">
                    {SCHOOL_LEVELS.map(level => (
                      <button
                        key={level}
                        onClick={() => setSelectedLevel(level)}
                        className={`flex-1 py-3 px-2 rounded-lg border text-xs font-medium transition-all touch-target ${
                          selectedLevel === level
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedLevel && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Label className="text-sm font-medium mb-2 block">Select Subjects You Teach</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SUBJECTS[selectedLevel]?.map(subject => (
                        <button
                          key={subject}
                          onClick={() => toggleSubject(subject)}
                          className={`py-3 px-3 rounded-lg border text-xs font-medium transition-all touch-target text-left ${
                            profile.subjects?.includes(subject)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {profile.subjects?.includes(subject) && <Check className="h-3 w-3 shrink-0" />}
                            <span>{subject}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">Classroom Resources</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CLASSROOM_RESOURCES.map(resource => (
                      <button
                        key={resource}
                        onClick={() => toggleResource(resource)}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-left ${
                          profile.resources?.includes(resource)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {profile.resources?.includes(resource) && <Check className="h-3 w-3 shrink-0" />}
                          <span>{resource}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center px-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="h-20 w-20 rounded-full bg-primary flex items-center justify-center mb-6 glow"
              >
                <Check className="h-10 w-10 text-primary-foreground" />
              </motion.div>
              <h2 className="text-2xl font-heading font-bold text-center mb-2">You're All Set!</h2>
              <p className="text-muted-foreground text-center max-w-sm mb-8">
                Welcome, {profile.name}! Your profile has been saved. Start creating lesson plans right away.
              </p>
              <Button size="lg" className="w-full max-w-sm touch-target text-base font-semibold" onClick={handleFinish}>
                Go to Dashboard
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      {step > 0 && step < TOTAL_STEPS && (
        <div className="fixed bottom-0 left-0 right-0 px-6 py-4 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="touch-target"
              onClick={() => setStep(s => s - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              className="flex-1 touch-target font-semibold"
              disabled={!canProceed()}
              onClick={() => {
                if (step === TOTAL_STEPS - 1) {
                  setStep(TOTAL_STEPS);
                  return;
                }
                setStep(s => s + 1);
              }}
            >
              {step === TOTAL_STEPS - 1 ? 'Finish Setup' : 'Continue'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
