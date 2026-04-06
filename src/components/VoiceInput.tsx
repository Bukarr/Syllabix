import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  onTranscriptionReady: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscriptionReady, disabled }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported on this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        toast.error('Speech recognition error. Please try again.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.info('Listening... Speak your topic');
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleUseTranscription = () => {
    if (transcript.trim()) {
      onTranscriptionReady(transcript.trim());
      setTranscript('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isListening ? 'destructive' : 'outline'}
          size="sm"
          onClick={isListening ? stopListening : startListening}
          disabled={disabled || !isSupported}
          className="touch-target"
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4 mr-1" />
              Stop
              <span className="ml-1 h-2 w-2 rounded-full bg-destructive-foreground animate-pulse" />
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-1" />
              Speak Your Topic
            </>
          )}
        </Button>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground font-medium">Beta</span>
      </div>

      {!isSupported && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">Voice input works best on Chrome. If it doesn't work on your device, type your topic instead.</p>
        </div>
      )}

      {transcript && (
        <div className="space-y-2">
          <Textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            className="min-h-[60px] text-sm"
            placeholder="Your spoken text will appear here..."
            rows={3}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUseTranscription}
            disabled={!transcript.trim() || disabled}
            className="w-full touch-target"
          >
            Use This as Topic
          </Button>
        </div>
      )}
    </div>
  );
}
